/**
 * Explanation Router
 *
 * Handles creating, listing, and managing explanations
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { randomUUID } from 'crypto';

import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
import { CREDIT_COSTS } from '@/lib/constants';
import { evaluateExplanationAttempt } from '@/server/ai/explanation-evaluator';

function preview(text: string, max = 160): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max)}…`;
}

function normalizeComparable(text: string | undefined | null): string {
  return String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

export const explanationRouter = createTRPCRouter({
  /**
   * Create a new explanation
   */
  create: protectedProcedure
    .input(
      z.object({
        topic: z.string().min(1).max(200),
        // Option B (preferred) will provide this from the UI.
        // Kept optional for backward compatibility while we roll out Study Sessions.
        scopeStatement: z.string().min(1).max(2000).optional(),
        studySessionId: z.string().optional(),
        transcription: z.string().min(10),
        audioUrl: z.string().optional(), // Can be S3 key or full URL
        duration: z.number().min(1), // Duration in seconds
      })
    )
    .mutation(async ({ ctx, input }) => {
      const requestId = randomUUID();
      const startedAt = Date.now();

      console.info('[explanation.create] start', {
        requestId,
        userId: ctx.session.user.id,
        topic: input.topic,
        duration: input.duration,
        hasStudySessionId: !!input.studySessionId,
        hasScopeStatement: !!input.scopeStatement,
        hasAudioUrl: !!input.audioUrl,
        transcriptionChars: input.transcription.length,
        transcriptionPreview: preview(input.transcription, 140),
      });

      // Calculate credit cost based on duration
      const creditCost = Math.ceil(input.duration / 60) * CREDIT_COSTS.TRANSCRIPTION_PER_MINUTE;

      // Check if user has enough credits
      const credits = await ctx.prisma.credits.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!credits || credits.balance < creditCost) {
        console.warn('[explanation.create] insufficient_credits', {
          requestId,
          balance: credits?.balance ?? null,
          required: creditCost,
        });
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient credits. Please upgrade or purchase more credits.',
        });
      }

      // StudySession is now the canonical container for repeated attempts.
      // If a StudySession isn't provided (legacy clients), create one with a basic scope.
      let studySessionId: string;
      let resolvedTopic = input.topic;
      let resolvedScopeStatement =
        input.scopeStatement ??
        `Explain the topic: ${input.topic}. Focus on the core concepts and correct reasoning.`;

      if (input.studySessionId) {
        console.info('[explanation.create] validate_study_session', {
          requestId,
          studySessionId: input.studySessionId,
        });
        const session = await ctx.prisma.studySession.findUnique({
          where: { id: input.studySessionId },
          select: { id: true, userId: true, topic: true, scopeStatement: true },
        });

        if (!session || session.userId !== ctx.session.user.id) {
          console.warn('[explanation.create] study_session_not_found', {
            requestId,
            studySessionId: input.studySessionId,
          });
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Study session not found',
          });
        }

        // Prevent changing topic/scope mid-session.
        const incomingTopic = normalizeComparable(input.topic);
        const sessionTopic = normalizeComparable(session.topic);
        if (incomingTopic && sessionTopic && incomingTopic !== sessionTopic) {
          console.warn('[explanation.create] topic_mismatch', {
            requestId,
            studySessionId: session.id,
            incomingTopic,
            sessionTopic,
          });
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot change topic while continuing a study session.',
          });
        }

        if (input.scopeStatement) {
          const incomingScope = normalizeComparable(input.scopeStatement);
          const sessionScope = normalizeComparable(session.scopeStatement);
          if (incomingScope && sessionScope && incomingScope !== sessionScope) {
            console.warn('[explanation.create] scope_mismatch', {
              requestId,
              studySessionId: session.id,
              incomingScopePreview: preview(incomingScope, 180),
              sessionScopePreview: preview(sessionScope, 180),
            });
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Cannot change scope statement while continuing a study session.',
            });
          }
        }

        studySessionId = session.id;
        resolvedTopic = session.topic;
        resolvedScopeStatement = session.scopeStatement;
      } else {
        console.info('[explanation.create] create_study_session', {
          requestId,
          topic: input.topic,
          scopePreview: preview(
            input.scopeStatement ??
              `Explain the topic: ${input.topic}. Focus on the core concepts and correct reasoning.`,
            180
          ),
        });
        studySessionId = (
          await ctx.prisma.studySession.create({
            data: {
              userId: ctx.session.user.id,
              topic: input.topic,
              scopeStatement:
                input.scopeStatement ??
                `Explain the topic: ${input.topic}. Focus on the core concepts and correct reasoning.`,
            },
            select: { id: true },
          })
        ).id;
      }

      const attemptNumber = input.studySessionId
        ? (await ctx.prisma.explanation.count({ where: { studySessionId } })) + 1
        : 1;

      console.info('[explanation.create] attempt_number', {
        requestId,
        studySessionId,
        attemptNumber,
      });

      // Create explanation and deduct credits in a transaction
      const [explanation] = await ctx.prisma.$transaction([
        ctx.prisma.explanation.create({
          data: {
            userId: ctx.session.user.id,
            studySessionId,
            attemptNumber,
            topic: resolvedTopic,
            transcription: input.transcription,
            audioUrl: input.audioUrl,
            duration: input.duration,
          },
        }),
        ctx.prisma.credits.update({
          where: { userId: ctx.session.user.id },
          data: {
            balance: { decrement: creditCost },
          },
        }),
        ctx.prisma.creditUsage.create({
          data: {
            creditsId: credits.id,
            amount: -creditCost,
            type: 'TRANSCRIPTION',
            description: `Transcription for "${resolvedTopic}" (${Math.ceil(input.duration / 60)} min)`,
          },
        }),
        ctx.prisma.userProgress.update({
          where: { userId: ctx.session.user.id },
          data: {
            totalExplanations: { increment: 1 },
            lastActivityDate: new Date(),
          },
        }),
      ]);

      console.info('[explanation.create] explanation_created', {
        requestId,
        explanationId: explanation.id,
        studySessionId,
        ms: Date.now() - startedAt,
      });

      // Evaluate the explanation using the StudySession scope.
      // For debugging/strictness: if evaluation fails, surface the error and block the next steps.
      try {
        console.info('[explanation.create] evaluation_begin', {
          requestId,
          explanationId: explanation.id,
          studySessionId,
        });

        const scopeStatement = resolvedScopeStatement;

        console.info('[explanation.create] evaluation_inputs', {
          requestId,
          explanationId: explanation.id,
          scopeChars: scopeStatement.length,
          scopePreview: preview(scopeStatement, 200),
          transcriptionChars: input.transcription.length,
        });

        const evaluation = await evaluateExplanationAttempt({
          topic: resolvedTopic,
          scopeStatement,
          transcription: input.transcription,
        });

        console.info('[explanation.create] evaluation_result', {
          requestId,
          explanationId: explanation.id,
          overallScore: evaluation.overallScore,
          correctness: evaluation.correctness,
          clarity: evaluation.clarity,
          depth: evaluation.depth,
          relevance: evaluation.relevance,
          structure: evaluation.structure,
          strengthsCount: evaluation.strengths.length,
          improvementsCount: evaluation.improvements.length,
          missingConceptsCount: evaluation.missingConcepts.length,
          learningObjectivesCount: evaluation.learningObjectives.length,
          shortFeedbackChars: evaluation.shortFeedback.length,
          detailedFeedbackChars: evaluation.detailedFeedback.length,
        });

        const updated = await ctx.prisma.explanation.update({
          where: { id: explanation.id },
          data: {
            evalOverallScore: evaluation.overallScore,
            evalCorrectness: evaluation.correctness,
            evalClarity: evaluation.clarity,
            evalDepth: evaluation.depth,
            evalRelevance: evaluation.relevance,
            evalStructure: evaluation.structure,
            evalStrengths: evaluation.strengths,
            evalImprovements: evaluation.improvements,
            evalShortFeedback: evaluation.shortFeedback,
            evalDetailedFeedback: evaluation.detailedFeedback,
            evalMissingConcepts: evaluation.missingConcepts,
            evalLearningObjectives: evaluation.learningObjectives,
          },
        });

        console.info('[explanation.create] evaluation_persisted', {
          requestId,
          explanationId: explanation.id,
          ms: Date.now() - startedAt,
        });

        return updated;
      } catch (err: unknown) {
        console.error('[explanation.create] evaluation_failed', {
          requestId,
          explanationId: explanation.id,
          error: err instanceof Error ? err.message : String(err),
          ms: Date.now() - startedAt,
        });

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message:
            `Evaluation failed (requestId=${requestId}, explanationId=${explanation.id}): ` +
            (err instanceof Error ? err.message : String(err)),
          cause: err,
        });
      }
    }),

  /**
   * Get all explanations for the current user
   */
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor } = input;

      const explanations = await ctx.prisma.explanation.findMany({
        where: { userId: ctx.session.user.id },
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { questions: true },
          },
          quizSession: {
            select: { id: true, score: true, completedAt: true, createdAt: true },
          },
        },
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (explanations.length > limit) {
        const nextItem = explanations.pop();
        nextCursor = nextItem!.id;
      }

      return {
        explanations,
        nextCursor,
      };
    }),

  /**
   * Get a single explanation by ID
   */
  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const explanation = await ctx.prisma.explanation.findUnique({
      where: { id: input.id },
      include: {
        questions: true,
        quizSession: true,
        studySession: true,
      },
    });

    if (!explanation || explanation.userId !== ctx.session.user.id) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Explanation not found',
      });
    }

    // Generate fresh signed URL for audio if we have an S3 key stored
    let audioUrl = explanation.audioUrl;
    if (audioUrl && (audioUrl.startsWith('uploads/') || audioUrl.startsWith('audio/'))) {
      // This is an S3 key, generate a fresh signed URL
      try {
        const { getSignedUrl } = await import('@/server/storage/aws');
        audioUrl = await getSignedUrl(audioUrl);
      } catch (error) {
        console.error('Failed to generate signed URL for audio:', error);
        // Keep the original value as fallback
      }
    }

    return {
      ...explanation,
      audioUrl,
    };
  }),

  /**
   * Delete an explanation
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const explanation = await ctx.prisma.explanation.findUnique({
        where: { id: input.id },
      });

      if (!explanation || explanation.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Explanation not found',
        });
      }

      await ctx.prisma.explanation.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
