/**
 * Explanation Router
 *
 * Handles creating, listing, and managing explanations
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
import { CREDIT_COSTS } from '@/lib/constants';

export const explanationRouter = createTRPCRouter({
  /**
   * Create a new explanation
   */
  create: protectedProcedure
    .input(
      z.object({
        topic: z.string().min(1).max(200),
        transcription: z.string().min(10),
        audioUrl: z.string().url().optional(),
        duration: z.number().min(1), // Duration in seconds
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Calculate credit cost based on duration
      const creditCost = Math.ceil(input.duration / 60) * CREDIT_COSTS.TRANSCRIPTION_PER_MINUTE;

      // Check if user has enough credits
      const credits = await ctx.prisma.credits.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!credits || credits.balance < creditCost) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient credits. Please upgrade or purchase more credits.',
        });
      }

      // Create explanation and deduct credits in a transaction
      const [explanation] = await ctx.prisma.$transaction([
        ctx.prisma.explanation.create({
          data: {
            userId: ctx.session.user.id,
            topic: input.topic,
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
            description: `Transcription for "${input.topic}" (${Math.ceil(input.duration / 60)} min)`,
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

      return explanation;
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
            select: { quizSessions: true, questions: true },
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
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const explanation = await ctx.prisma.explanation.findUnique({
        where: { id: input.id },
        include: {
          questions: true,
          quizSessions: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      });

      if (!explanation || explanation.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Explanation not found',
        });
      }

      return explanation;
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
