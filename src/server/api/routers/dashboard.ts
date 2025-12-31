/**
 * Dashboard Router
 *
 * Provides study-session-centric dashboard data
 */
import { subDays, format, startOfDay } from 'date-fns';

import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';

export const dashboardRouter = createTRPCRouter({
  /**
   * Get comprehensive dashboard data centered around study sessions
   */
  getDashboardData: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const today = startOfDay(new Date());
    const weekAgo = subDays(today, 7);

    const [
      user,
      activeSessions,
      completedSessions,
      recentlyMastered,
      weeklyExplanations,
      userProgress,
    ] = await Promise.all([
      // User info
      ctx.prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, image: true },
      }),

      // Active study sessions with latest explanation
      ctx.prisma.studySession.findMany({
        where: {
          userId,
          status: 'ACTIVE',
        },
        include: {
          explanations: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              evalOverallScore: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      // Count of completed sessions
      ctx.prisma.studySession.count({
        where: {
          userId,
          status: 'COMPLETED',
        },
      }),

      // Recently mastered sessions
      ctx.prisma.studySession.findMany({
        where: {
          userId,
          status: 'COMPLETED',
        },
        include: {
          _count: {
            select: { explanations: true },
          },
        },
        orderBy: { completedAt: 'desc' },
        take: 5,
      }),

      // Weekly activity (explanations per day)
      ctx.prisma.explanation.findMany({
        where: {
          userId,
          createdAt: { gte: weekAgo },
        },
        select: {
          createdAt: true,
        },
      }),

      // User progress for streak
      ctx.prisma.userProgress.findUnique({
        where: { userId },
      }),
    ]);

    // Calculate total explanations
    const totalExplanations = await ctx.prisma.explanation.count({
      where: { userId },
    });

    // Process active sessions
    const activeSessionsData = activeSessions.map((session) => {
      const latestExplanation = session.explanations[0];
      return {
        id: session.id,
        topic: session.topic,
        scopeStatement: session.scopeStatement,
        currentAttempt: session.explanations.length > 0 ? session.explanations.length : 0,
        latestScore: latestExplanation?.evalOverallScore ?? null,
        masteryStreak: session.masteryStreak,
        lastActivityAt: latestExplanation?.createdAt ?? session.createdAt,
        createdAt: session.createdAt,
      };
    });

    // Process recently mastered
    const recentlyMasteredData = recentlyMastered.map((session) => ({
      id: session.id,
      topic: session.topic,
      completedAt: session.completedAt,
      totalAttempts: session._count.explanations,
    }));

    // Process weekly activity
    const weeklyActivity: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const date = subDays(today, i);
      const key = format(date, 'yyyy-MM-dd');
      weeklyActivity[key] = 0;
    }
    weeklyExplanations.forEach((exp) => {
      const key = format(exp.createdAt, 'yyyy-MM-dd');
      if (weeklyActivity[key] !== undefined) {
        weeklyActivity[key]++;
      }
    });

    // Calculate mastery rate
    const totalSessions = activeSessions.length + completedSessions;
    const masteryRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

    return {
      user: {
        name: user?.name ?? null,
        image: user?.image ?? null,
      },
      stats: {
        activeSessions: activeSessions.length,
        completedSessions,
        totalExplanations,
        masteryRate: Math.round(masteryRate),
        currentStreak: userProgress?.currentStreak ?? 0,
      },
      activeSessions: activeSessionsData,
      recentlyMastered: recentlyMasteredData,
      weeklyActivity: Object.entries(weeklyActivity).map(([date, explanations]) => ({
        date,
        explanations,
      })),
    };
  }),
});
