/**
 * Progress Router
 *
 * Handles progress tracking and analytics
 */
import { z } from 'zod';
import { startOfDay, subDays, format } from 'date-fns';

import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';

export const progressRouter = createTRPCRouter({
  /**
   * Get user's overall progress
   */
  getOverview: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const [progress, subscription, credits, recentQuizSessions, recentExplanations] =
      await Promise.all([
        ctx.prisma.userProgress.findUnique({
          where: { userId },
        }),
        ctx.prisma.subscription.findUnique({
          where: { userId },
        }),
        ctx.prisma.credits.findUnique({
          where: { userId },
        }),
        ctx.prisma.quizSession.findMany({
          where: {
            userId,
            completedAt: { not: null },
          },
          include: {
            explanation: {
              select: { topic: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        ctx.prisma.explanation.findMany({
          where: { userId },
          include: {
            quizSessions: {
              where: { completedAt: { not: null } },
              select: { score: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
      ]);

    const totalQuestions = progress?.totalQuestions ?? 0;
    const totalCorrectAnswers = progress?.totalCorrectAnswers ?? 0;
    const averageScore = totalQuestions > 0 ? (totalCorrectAnswers / totalQuestions) * 100 : 0;

    const activityHistory = recentQuizSessions.map((session) => {
      const computedScore =
        session.score ??
        (session.totalQuestions > 0 ? (session.correctAnswers / session.totalQuestions) * 100 : 0);
      return {
        topic: session.explanation.topic,
        score: computedScore,
        createdAt: session.createdAt,
      };
    });

    const topicPerformance = recentExplanations.map((e) => {
      const count = e.quizSessions.length;
      const averageScore =
        count > 0 ? e.quizSessions.reduce((acc, q) => acc + (q.score ?? 0), 0) / count : 0;
      return {
        id: e.id,
        topic: e.topic,
        count,
        averageScore,
      };
    });

    return {
      progress,
      subscription,
      credits,
      stats: {
        totalQuizzes: progress?.totalQuizzes ?? 0,
        totalCorrectAnswers,
        totalQuestions,
        averageScore,
        streak: {
          current: progress?.currentStreak ?? 0,
          longest: progress?.longestStreak ?? 0,
        },
      },
      activityHistory,
      topicPerformance,
    };
  }),

  /**
   * Get recent activity for the last 30 days
   */
  getActivityHistory: protectedProcedure
    .input(z.object({ days: z.number().min(7).max(90).default(30) }))
    .query(async ({ ctx, input }) => {
      const startDate = subDays(new Date(), input.days);

      const [explanations, quizSessions] = await Promise.all([
        ctx.prisma.explanation.findMany({
          where: {
            userId: ctx.session.user.id,
            createdAt: { gte: startDate },
          },
          select: { createdAt: true },
        }),
        ctx.prisma.quizSession.findMany({
          where: {
            userId: ctx.session.user.id,
            createdAt: { gte: startDate },
          },
          select: { createdAt: true, score: true, correctAnswers: true, totalQuestions: true },
        }),
      ]);

      // Group by day
      const activityByDay: Record<
        string,
        { explanations: number; quizzes: number; avgScore: number }
      > = {};

      explanations.forEach((e) => {
        const day = format(e.createdAt, 'yyyy-MM-dd');
        if (!activityByDay[day]) {
          activityByDay[day] = { explanations: 0, quizzes: 0, avgScore: 0 };
        }
        activityByDay[day].explanations++;
      });

      quizSessions.forEach((q) => {
        const day = format(q.createdAt, 'yyyy-MM-dd');
        if (!activityByDay[day]) {
          activityByDay[day] = { explanations: 0, quizzes: 0, avgScore: 0 };
        }
        activityByDay[day].quizzes++;
        if (q.score) {
          activityByDay[day].avgScore = q.score;
        }
      });

      return activityByDay;
    }),

  /**
   * Get topic performance breakdown
   */
  getTopicPerformance: protectedProcedure.query(async ({ ctx }) => {
    const explanations = await ctx.prisma.explanation.findMany({
      where: { userId: ctx.session.user.id },
      include: {
        quizSessions: {
          where: { completedAt: { not: null } },
          select: { score: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return explanations.map((e) => ({
      id: e.id,
      topic: e.topic,
      attemptCount: e.quizSessions.length,
      avgScore:
        e.quizSessions.length > 0
          ? e.quizSessions.reduce((acc, q) => acc + (q.score ?? 0), 0) / e.quizSessions.length
          : 0,
      lastAttempt: e.quizSessions[0]?.score ?? null,
    }));
  }),

  /**
   * Get streak information
   */
  getStreak: protectedProcedure.query(async ({ ctx }) => {
    const progress = await ctx.prisma.userProgress.findUnique({
      where: { userId: ctx.session.user.id },
    });

    if (!progress) {
      return { currentStreak: 0, longestStreak: 0, lastActivityDate: null };
    }

    // Check if streak should be reset
    const today = startOfDay(new Date());
    const lastActivity = startOfDay(progress.lastActivityDate);
    const daysDiff = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff > 1) {
      // Reset streak if more than 1 day has passed
      await ctx.prisma.userProgress.update({
        where: { userId: ctx.session.user.id },
        data: { currentStreak: 0 },
      });
      return {
        currentStreak: 0,
        longestStreak: progress.longestStreak,
        lastActivityDate: progress.lastActivityDate,
      };
    }

    return {
      currentStreak: progress.currentStreak,
      longestStreak: progress.longestStreak,
      lastActivityDate: progress.lastActivityDate,
    };
  }),

  /**
   * Update streak when user completes an activity
   */
  updateStreak: protectedProcedure.mutation(async ({ ctx }) => {
    const progress = await ctx.prisma.userProgress.findUnique({
      where: { userId: ctx.session.user.id },
    });

    if (!progress) {
      return null;
    }

    const today = startOfDay(new Date());
    const lastActivity = startOfDay(progress.lastActivityDate);
    const daysDiff = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

    let newStreak = progress.currentStreak;

    if (daysDiff === 0) {
      // Same day, no change
      return progress;
    } else if (daysDiff === 1) {
      // Consecutive day, increment streak
      newStreak = progress.currentStreak + 1;
    } else {
      // Streak broken, start fresh
      newStreak = 1;
    }

    const longestStreak = Math.max(newStreak, progress.longestStreak);

    return ctx.prisma.userProgress.update({
      where: { userId: ctx.session.user.id },
      data: {
        currentStreak: newStreak,
        longestStreak,
        lastActivityDate: new Date(),
      },
    });
  }),
});
