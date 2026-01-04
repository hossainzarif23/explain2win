/**
 * Study Session Router
 *
 * API for browsing, starting, and managing StudySessions.
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
import { extractRelatedTopics } from '@/server/ai/topic-extractor';

export const studySessionRouter = createTRPCRouter({
  /**
   * List all study sessions for the current user with aggregated statistics
   */
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().optional(),
        status: z.enum(['ACTIVE', 'COMPLETED', 'ALL']).default('ALL'),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor, status } = input;

      const statusFilter =
        status === 'ALL' ? undefined : { status: status as 'ACTIVE' | 'COMPLETED' };

      const sessions = await ctx.prisma.studySession.findMany({
        where: {
          userId: ctx.session.user.id,
          ...statusFilter,
        },
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: 'desc' },
        include: {
          explanations: {
            select: {
              id: true,
              quizSession: {
                select: {
                  totalQuestions: true,
                  correctAnswers: true,
                  completedAt: true,
                },
              },
            },
          },
        },
      });

      let nextCursor: string | undefined;
      if (sessions.length > limit) {
        const nextItem = sessions.pop();
        nextCursor = nextItem?.id;
      }

      // Calculate aggregated statistics for each session
      const sessionsWithStats = sessions.map((session) => {
        const explanations = session.explanations;
        const attemptsCount = explanations.length;

        // Aggregate quiz statistics across all explanations
        let totalQuestions = 0;
        let totalCorrectAnswers = 0;
        let completedQuizzes = 0;

        for (const exp of explanations) {
          if (exp.quizSession?.completedAt) {
            totalQuestions += exp.quizSession.totalQuestions;
            totalCorrectAnswers += exp.quizSession.correctAnswers;
            completedQuizzes++;
          }
        }

        const accuracy = totalQuestions > 0 ? (totalCorrectAnswers / totalQuestions) * 100 : null;

        return {
          id: session.id,
          topic: session.topic,
          scopeStatement: session.scopeStatement,
          status: session.status,
          masteryStreak: session.masteryStreak,
          createdAt: session.createdAt,
          completedAt: session.completedAt,
          attemptsCount,
          totalQuestions,
          totalCorrectAnswers,
          completedQuizzes,
          accuracy,
        };
      });

      return {
        sessions: sessionsWithStats,
        nextCursor,
      };
    }),

  /**
   * Get a single study session by ID with full details including all explanations
   */
  getByIdWithDetails: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const session = await ctx.prisma.studySession.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
        include: {
          explanations: {
            orderBy: { attemptNumber: 'asc' },
            select: {
              id: true,
              attemptNumber: true,
              topic: true,
              duration: true,
              createdAt: true,
              transcription: true, // Needed for comparison panel diff view
              audioUrl: true, // Needed for audio playback in comparison panel
              evalOverallScore: true,
              evalCorrectness: true,
              evalClarity: true,
              evalDepth: true,
              evalRelevance: true,
              evalStructure: true,

              quizSession: {
                select: {
                  id: true,
                  score: true,
                  totalQuestions: true,
                  correctAnswers: true,
                  completedAt: true,
                },
              },
            },
          },
        },
      });

      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Study session not found',
        });
      }

      // Calculate aggregated statistics
      const explanations = session.explanations;
      const attemptsCount = explanations.length;

      let totalQuestions = 0;
      let totalCorrectAnswers = 0;
      let completedQuizzes = 0;
      let totalDuration = 0;

      for (const exp of explanations) {
        totalDuration += exp.duration;
        if (exp.quizSession?.completedAt) {
          totalQuestions += exp.quizSession.totalQuestions;
          totalCorrectAnswers += exp.quizSession.correctAnswers;
          completedQuizzes++;
        }
      }

      const accuracy = totalQuestions > 0 ? (totalCorrectAnswers / totalQuestions) * 100 : null;

      // Calculate time to master (if completed)
      const timeToMaster =
        session.completedAt && session.createdAt
          ? Math.round(
              (new Date(session.completedAt).getTime() - new Date(session.createdAt).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : null;

      return {
        ...session,
        stats: {
          attemptsCount,
          totalQuestions,
          totalCorrectAnswers,
          completedQuizzes,
          accuracy,
          totalDuration,
          timeToMasterDays: timeToMaster,
        },
      };
    }),

  /**
   * Get a study session by ID (basic info)
   */
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

  /**
   * Get or create a study session (for starting new explanations)
   */
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

  /**
   * Complete a study session and trigger knowledge graph update
   */
  complete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      // Get session with all explanations
      const session = await ctx.prisma.studySession.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
        include: {
          explanations: {
            orderBy: { evalOverallScore: 'desc' },
            select: {
              id: true,
              transcription: true,
              evalOverallScore: true,
            },
          },
        },
      });

      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Study session not found',
        });
      }

      if (session.status === 'COMPLETED') {
        return { success: true, message: 'Session already completed' };
      }

      // Mark session as completed
      await ctx.prisma.studySession.update({
        where: { id: input.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      // Find best attempt (highest overall score)
      const bestAttempt = session.explanations[0];
      if (!bestAttempt?.transcription) {
        return { success: true, message: 'Session completed, no transcription for graph' };
      }

      // Create/update TopicNode for this session
      // Note: evalOverallScore is 0-10, so mastery = score / 10
      const normalizedTopic = session.topic.toLowerCase().trim();
      const masteryLevel = bestAttempt.evalOverallScore
        ? Math.min(1, bestAttempt.evalOverallScore / 10)
        : 0.5;


      const topicNode = await ctx.prisma.topicNode.upsert({
        where: {
          userId_normalizedTopic: {
            userId: ctx.session.user.id,
            normalizedTopic,
          },
        },
        update: {
          masteryLevel,
          studySessionId: input.id,
          isExplored: true,
          isSuggested: false,
        },
        create: {
          userId: ctx.session.user.id,
          topic: session.topic,
          normalizedTopic,
          masteryLevel,
          studySessionId: input.id,
          isExplored: true,
          isSuggested: false,
        },
      });

      // Extract related topics from best attempt (AI call)
      try {
        const { relatedTopics } = await extractRelatedTopics({
          mainTopic: session.topic,
          transcription: bestAttempt.transcription,
          scopeStatement: session.scopeStatement,
        });

        // Create edges to related topics
        for (const related of relatedTopics) {
          const relatedNormalized = related.topic.toLowerCase().trim();

          // Find or create the related topic node
          let relatedNode = await ctx.prisma.topicNode.findUnique({
            where: {
              userId_normalizedTopic: {
                userId: ctx.session.user.id,
                normalizedTopic: relatedNormalized,
              },
            },
          });

          if (!relatedNode) {
            relatedNode = await ctx.prisma.topicNode.create({
              data: {
                userId: ctx.session.user.id,
                topic: related.topic,
                normalizedTopic: relatedNormalized,
                isExplored: false,
                isSuggested: true,
              },
            });
          }

          // Create edge if doesn't exist
          const existingEdge = await ctx.prisma.topicRelation.findUnique({
            where: {
              fromNodeId_toNodeId: {
                fromNodeId: topicNode.id,
                toNodeId: relatedNode.id,
              },
            },
          });

          if (!existingEdge) {
            await ctx.prisma.topicRelation.create({
              data: {
                fromNodeId: topicNode.id,
                toNodeId: relatedNode.id,
                relationshipType: related.relationshipType,
                strength: related.strength,
              },
            });
          }
        }

        return {
          success: true,
          message: `Session completed. Added ${relatedTopics.length} related topics to knowledge graph.`,
        };
      } catch (error) {
        console.error('Failed to extract related topics:', error);
        return {
          success: true,
          message: 'Session completed. Knowledge graph update failed.',
        };
      }
    }),
});

