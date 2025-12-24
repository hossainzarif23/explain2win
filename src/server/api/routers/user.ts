/**
 * User Router
 *
 * Handles user profile and preferences
 */
import { z } from 'zod';

import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';

export const userRouter = createTRPCRouter({
  /**
   * Get current user profile
   */
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      include: {
        progress: true,
        preferences: true,
        subscription: true,
        credits: true,
      },
    });

    return user;
  }),

  /**
   * Update user preferences
   */
  updatePreferences: protectedProcedure
    .input(
      z.object({
        preferredStudentType: z
          .enum(['CURIOUS', 'EXAM_FOCUSED', 'CHALLENGING', 'BEGINNER'])
          .optional(),
        dailyGoal: z.number().min(1).max(10).optional(),
        emailNotifications: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.userPreferences.update({
        where: { userId: ctx.session.user.id },
        data: input,
      });
    }),

  /**
   * Update user profile
   */
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.user.update({
        where: { id: ctx.session.user.id },
        data: input,
      });
    }),

  /**
   * Get user's credit balance
   */
  getCredits: protectedProcedure.query(async ({ ctx }) => {
    const credits = await ctx.prisma.credits.findUnique({
      where: { userId: ctx.session.user.id },
      include: {
        usageLog: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    return credits;
  }),
});
