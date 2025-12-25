/**
 * Study Session Router
 *
 * Minimal API for starting/resuming a StudySession (Option B: user-provided scope statement).
 */
import { z } from 'zod';

import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';

export const studySessionRouter = createTRPCRouter({
  getById: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.studySession.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
        select: {
          id: true,
          topic: true,
          scopeStatement: true,
          status: true,
          masteryStreak: true,
          createdAt: true,
          completedAt: true,
        },
      });
    }),

  getOrCreate: protectedProcedure
    .input(
      z.object({
        topic: z.string().min(1).max(200),
        scopeStatement: z.string().min(1).max(2000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.studySession.findFirst({
        where: {
          userId: ctx.session.user.id,
          topic: input.topic,
          scopeStatement: input.scopeStatement,
          status: 'ACTIVE',
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          topic: true,
          scopeStatement: true,
          status: true,
          masteryStreak: true,
          createdAt: true,
          completedAt: true,
        },
      });

      if (existing) return existing;

      return ctx.prisma.studySession.create({
        data: {
          userId: ctx.session.user.id,
          topic: input.topic,
          scopeStatement: input.scopeStatement,
        },
        select: {
          id: true,
          topic: true,
          scopeStatement: true,
          status: true,
          masteryStreak: true,
          createdAt: true,
          completedAt: true,
        },
      });
    }),
});
