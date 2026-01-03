/**
 * Comparison Router
 *
 * Handles fetching and generating AI-powered comparisons between explanation attempts.
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
import { analyzeAttemptComparison } from '@/server/ai/comparison-analyzer';
import { CREDIT_COSTS } from '@/lib/constants';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

// S3 client for generating presigned URLs
function getS3Client() {
  return new S3Client({
    region: process.env.AWS_REGION ?? 'eu-north-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

async function getPresignedAudioUrl(audioKey: string | null): Promise<string | null> {
  if (!audioKey) return null;
  
  try {
    const s3 = getS3Client();
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: audioKey,
    });
    return await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour
  } catch (error) {
    console.error('Failed to generate presigned URL:', error);
    return null;
  }
}

export const comparisonRouter = createTRPCRouter({
  /**
   * Get an existing comparison between two attempts (cached, free)
   */
  getComparison: protectedProcedure
    .input(
      z.object({
        earlierAttemptId: z.string(),
        laterAttemptId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Ensure user owns both attempts
      const [earlier, later] = await Promise.all([
        ctx.prisma.explanation.findFirst({
          where: { id: input.earlierAttemptId, userId: ctx.session.user.id },
          select: {
            id: true,
            attemptNumber: true,
            topic: true,
            transcription: true,
            audioUrl: true,
            createdAt: true,
            evalOverallScore: true,
            evalCorrectness: true,
            evalClarity: true,
            evalDepth: true,
            evalRelevance: true,
            evalStructure: true,
          },
        }),
        ctx.prisma.explanation.findFirst({
          where: { id: input.laterAttemptId, userId: ctx.session.user.id },
          select: {
            id: true,
            attemptNumber: true,
            topic: true,
            transcription: true,
            audioUrl: true,
            createdAt: true,
            evalOverallScore: true,
            evalCorrectness: true,
            evalClarity: true,
            evalDepth: true,
            evalRelevance: true,
            evalStructure: true,
          },
        }),
      ]);

      if (!earlier || !later) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'One or both attempts not found',
        });
      }

      // Check for existing comparison
      const existing = await ctx.prisma.attemptComparison.findUnique({
        where: {
          earlierAttemptId_laterAttemptId: {
            earlierAttemptId: input.earlierAttemptId,
            laterAttemptId: input.laterAttemptId,
          },
        },
      });

      // Generate presigned URLs for audio playback
      const [earlierAudioUrl, laterAudioUrl] = await Promise.all([
        getPresignedAudioUrl(earlier.audioUrl),
        getPresignedAudioUrl(later.audioUrl),
      ]);

      return {
        earlier: { ...earlier, presignedAudioUrl: earlierAudioUrl },
        later: { ...later, presignedAudioUrl: laterAudioUrl },
        comparison: existing
          ? {
              newConcepts: existing.newConcepts as string[] | null,
              missingConcepts: existing.missingConcepts as string[] | null,
              dimensionAnalysis: existing.dimensionAnalysis as Record<string, string> | null,
              summary: existing.summary,
              createdAt: existing.createdAt,
            }
          : null,
      };
    }),

  /**
   * Generate a new comparison using LLM (costs 1 credit)
   */
  generateComparison: protectedProcedure
    .input(
      z.object({
        earlierAttemptId: z.string(),
        laterAttemptId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Ensure user owns both attempts
      const [earlier, later] = await Promise.all([
        ctx.prisma.explanation.findFirst({
          where: { id: input.earlierAttemptId, userId: ctx.session.user.id },
          select: {
            id: true,
            attemptNumber: true,
            topic: true,
            transcription: true,
            evalCorrectness: true,
            evalClarity: true,
            evalDepth: true,
            evalRelevance: true,
            evalStructure: true,
          },
        }),
        ctx.prisma.explanation.findFirst({
          where: { id: input.laterAttemptId, userId: ctx.session.user.id },
          select: {
            id: true,
            attemptNumber: true,
            topic: true,
            transcription: true,
            evalCorrectness: true,
            evalClarity: true,
            evalDepth: true,
            evalRelevance: true,
            evalStructure: true,
          },
        }),
      ]);

      if (!earlier || !later) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'One or both attempts not found',
        });
      }

      // Check if comparison already exists
      const existing = await ctx.prisma.attemptComparison.findUnique({
        where: {
          earlierAttemptId_laterAttemptId: {
            earlierAttemptId: input.earlierAttemptId,
            laterAttemptId: input.laterAttemptId,
          },
        },
      });

      if (existing) {
        return {
          newConcepts: existing.newConcepts as string[] | null,
          missingConcepts: existing.missingConcepts as string[] | null,
          dimensionAnalysis: existing.dimensionAnalysis as Record<string, string> | null,
          summary: existing.summary,
          creditCharged: false,
        };
      }

      // Check credits
      const credits = await ctx.prisma.credits.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!credits || credits.balance < CREDIT_COSTS.ATTEMPT_COMPARISON) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient credits for comparison analysis',
        });
      }

      // Call LLM
      const result = await analyzeAttemptComparison({
        topic: earlier.topic,
        earlierTranscription: earlier.transcription,
        laterTranscription: later.transcription,
        earlierScores: {
          correctness: earlier.evalCorrectness,
          clarity: earlier.evalClarity,
          depth: earlier.evalDepth,
          relevance: earlier.evalRelevance,
          structure: earlier.evalStructure,
        },
        laterScores: {
          correctness: later.evalCorrectness,
          clarity: later.evalClarity,
          depth: later.evalDepth,
          relevance: later.evalRelevance,
          structure: later.evalStructure,
        },
      });

      // Deduct credit and save comparison in transaction
      await ctx.prisma.$transaction([
        ctx.prisma.credits.update({
          where: { userId: ctx.session.user.id },
          data: { balance: { decrement: CREDIT_COSTS.ATTEMPT_COMPARISON } },
        }),
        ctx.prisma.creditUsage.create({
          data: {
            creditsId: credits.id,
            amount: -CREDIT_COSTS.ATTEMPT_COMPARISON,
            type: 'TRANSCRIPTION', // Using existing type; could add COMPARISON type
            description: `Comparison: Attempt ${earlier.attemptNumber} vs ${later.attemptNumber}`,
          },
        }),
        ctx.prisma.attemptComparison.create({
          data: {
            earlierAttemptId: input.earlierAttemptId,
            laterAttemptId: input.laterAttemptId,
            newConcepts: result.newConcepts,
            missingConcepts: result.missingConcepts,
            dimensionAnalysis: result.dimensionAnalysis as Record<string, string>,
            summary: result.summary,
          },
        }),

      ]);

      return {
        newConcepts: result.newConcepts,
        missingConcepts: result.missingConcepts,
        dimensionAnalysis: result.dimensionAnalysis,
        summary: result.summary,
        creditCharged: true,
      };
    }),
});
