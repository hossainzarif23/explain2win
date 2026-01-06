/**
 * Quiz Router
 *
 * Handles quiz generation, sessions, and answer submission
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { QuestionType } from '@prisma/client';

import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
import { generateQuizQuestions } from '@/server/ai/quiz-generator';
import { gradeShortAnswerWithGemini } from '@/server/ai/quiz-grader';
import { CREDIT_COSTS, TIER_LIMITS } from '@/lib/constants';
import { updateKnowledgeGraphOnCompletion } from '@/server/api/helpers/update-knowledge-graph';

const studentTypeSchema = z.enum(['CURIOUS', 'EXAM_FOCUSED', 'CHALLENGING', 'BEGINNER']);

export const quizRouter = createTRPCRouter({
  /**
   * Generate a new quiz for an explanation
   */
  generate: protectedProcedure
    .input(
      z.object({
        explanationId: z.string(),
        studentType: studentTypeSchema,
        questionCount: z.number().min(3).max(10).default(5),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get the explanation
      const explanation = await ctx.prisma.explanation.findUnique({
        where: { id: input.explanationId },
        select: {
          id: true,
          userId: true,
          topic: true,
          transcription: true,
          studySessionId: true,
          evalMissingConcepts: true,
          evalLearningObjectives: true,
        },
      });

      if (!explanation || explanation.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Explanation not found',
        });
      }

      // Idempotency: one QuizSession per Explanation. If it already exists, return it.
      const existingSession = await ctx.prisma.quizSession.findUnique({
        where: { explanationId: input.explanationId },
        include: {
          answers: { include: { question: true } },
          explanation: true,
        },
      });

      if (existingSession) {
        const existingQuestions = await ctx.prisma.question.findMany({
          where: { explanationId: input.explanationId },
          orderBy: { createdAt: 'asc' },
        });
        return { quizSession: existingSession, questions: existingQuestions };
      }

      // Check subscription tier for student type access
      const subscription = await ctx.prisma.subscription.findUnique({
        where: { userId: ctx.session.user.id },
      });

      const tier = subscription?.tier ?? 'FREE';
      const allowedTypes = TIER_LIMITS[tier].studentTypes as readonly string[];

      if (!allowedTypes.includes(input.studentType)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Upgrade to access this student type',
        });
      }

      // Check credits
      const credits = await ctx.prisma.credits.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!credits || credits.balance < CREDIT_COSTS.QUIZ_GENERATION) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient credits for quiz generation',
        });
      }

      const toStringArray = (value: unknown): string[] => {
        if (!Array.isArray(value)) return [];
        return value
          .filter((v): v is string => typeof v === 'string')
          .map((s) => s.trim())
          .filter(Boolean);
      };

      const missingConcepts = toStringArray(explanation.evalMissingConcepts);
      const learningObjectives = toStringArray(explanation.evalLearningObjectives);

      // Generate questions using AI (focused on weaknesses)
      const generatedQuestions = await generateQuizQuestions({
        topic: explanation.topic,
        transcription: explanation.transcription,
        studentType: input.studentType,
        questionCount: input.questionCount,
        missingConcepts,
        learningObjectives,
      });

      // Create quiz session and questions in a transaction
      const [quizSession] = await ctx.prisma.$transaction([
        ctx.prisma.quizSession.create({
          data: {
            userId: ctx.session.user.id,
            explanationId: input.explanationId,
            studentType: input.studentType,
            totalQuestions: generatedQuestions.length,
          },
        }),
        ctx.prisma.credits.update({
          where: { userId: ctx.session.user.id },
          data: {
            balance: { decrement: CREDIT_COSTS.QUIZ_GENERATION },
          },
        }),
        ctx.prisma.creditUsage.create({
          data: {
            creditsId: credits.id,
            amount: -CREDIT_COSTS.QUIZ_GENERATION,
            type: 'QUIZ_GENERATION',
            description: `Quiz for "${explanation.topic}"`,
          },
        }),
      ]);

      // Create questions
      const questions = await Promise.all(
        generatedQuestions.map((q) =>
          ctx.prisma.question.create({
            data: {
              explanationId: input.explanationId,
              questionText: q.questionText,
              questionType: q.questionType,
              options: q.options ?? undefined,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              difficulty: q.difficulty,
              studentType: input.studentType,
            },
          })
        )
      );

      return {
        quizSession,
        questions,
      };
    }),

  /**
   * Submit an answer for a quiz question
   */
  submitAnswer: protectedProcedure
    .input(
      z.object({
        quizSessionId: z.string(),
        questionId: z.string(),
        userAnswer: z.string(),
        timeTaken: z.number().min(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get the question
      const question = await ctx.prisma.question.findUnique({
        where: { id: input.questionId },
      });

      if (!question) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Question not found',
        });
      }

      // Check if answer is correct
      let isCorrect: boolean;
      if (question.questionType === QuestionType.SHORT_ANSWER) {
        try {
          isCorrect = await gradeShortAnswerWithGemini({
            questionText: question.questionText,
            correctAnswer: question.correctAnswer,
            userAnswer: input.userAnswer,
          });
        } catch (error) {
          console.error('[quiz] LLM grading failed', {
            quizSessionId: input.quizSessionId,
            questionId: input.questionId,
            error: error instanceof Error ? error.message : String(error),
          });
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'AI grading failed. Please try again.',
          });
        }
      } else {
        isCorrect =
          input.userAnswer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
      }

      // Create answer record
      const answer = await ctx.prisma.quizAnswer.create({
        data: {
          quizSessionId: input.quizSessionId,
          questionId: input.questionId,
          userAnswer: input.userAnswer,
          isCorrect,
          timeTaken: input.timeTaken,
        },
      });

      // Update quiz session if correct
      if (isCorrect) {
        await ctx.prisma.quizSession.update({
          where: { id: input.quizSessionId },
          data: {
            correctAnswers: { increment: 1 },
          },
        });
      }

      return {
        answer,
        isCorrect,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
      };
    }),

  /**
   * Complete a quiz session
   */
  complete: protectedProcedure
    .input(z.object({ quizSessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const quizSessionSelect = {
        id: true,
        userId: true,
        explanationId: true,
        studentType: true,
        score: true,
        totalQuestions: true,
        correctAnswers: true,
        completedAt: true,
        createdAt: true,
      } as const;

      const session = await ctx.prisma.quizSession.findUnique({
        where: { id: input.quizSessionId },
        select: {
          ...quizSessionSelect,
          explanation: { select: { studySessionId: true, evalOverallScore: true, transcription: true } },
        },
      });

      if (!session || session.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Quiz session not found',
        });
      }

      // Idempotent: avoid double-counting progress / streak if already completed.
      if (session.completedAt) {
        return {
          quizSession: {
            id: session.id,
            userId: session.userId,
            explanationId: session.explanationId,
            studentType: session.studentType,
            score: session.score,
            totalQuestions: session.totalQuestions,
            correctAnswers: session.correctAnswers,
            completedAt: session.completedAt,
            createdAt: session.createdAt,
          },
          mastery: null,
        };
      }

      const studySession = await ctx.prisma.studySession.findUnique({
        where: { id: session.explanation.studySessionId },
        select: { 
          id: true, 
          userId: true, 
          status: true, 
          masteryStreak: true,
          topic: true,
          scopeStatement: true,
        },
      });

      if (!studySession || studySession.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Study session not found',
        });
      }

      const score = (session.correctAnswers / session.totalQuestions) * 100;

      const isPerfectQuiz = session.correctAnswers === session.totalQuestions;
      const explanationScore = session.explanation.evalOverallScore ?? null;
      const passesExplanation = explanationScore !== null && explanationScore >= 9;
      const attemptMastery = passesExplanation && isPerfectQuiz;

      const alreadyCompleted = studySession.status === 'COMPLETED';
      const nextStreak = alreadyCompleted
        ? studySession.masteryStreak
        : attemptMastery
          ? studySession.masteryStreak + 1
          : 0;

      const completesSession = !alreadyCompleted && attemptMastery && nextStreak >= 2;

      // Update session and progress
      const [updatedSession, , updatedStudySession] = await ctx.prisma.$transaction([
        ctx.prisma.quizSession.update({
          where: { id: input.quizSessionId },
          data: {
            score,
            completedAt: new Date(),
          },
          select: quizSessionSelect,
        }),
        ctx.prisma.userProgress.update({
          where: { userId: ctx.session.user.id },
          data: {
            totalQuizzes: { increment: 1 },
            totalCorrectAnswers: { increment: session.correctAnswers },
            totalQuestions: { increment: session.totalQuestions },
            lastActivityDate: new Date(),
          },
        }),
        ctx.prisma.studySession.update({
          where: { id: studySession.id },
          data: alreadyCompleted
            ? {}
            : {
                masteryStreak: nextStreak,
                status: completesSession ? 'COMPLETED' : 'ACTIVE',
                completedAt: completesSession ? new Date() : null,
              },
          select: { id: true, status: true, masteryStreak: true, completedAt: true },
        }),
      ]);

      // Update knowledge graph if session just completed
      if (completesSession && session.explanation.transcription) {
        // Fire and forget - don't block the response
        updateKnowledgeGraphOnCompletion({
          prisma: ctx.prisma,
          userId: ctx.session.user.id,
          studySessionId: studySession.id,
          topic: studySession.topic,
          scopeStatement: studySession.scopeStatement,
          transcription: session.explanation.transcription,
          masteryLevel: explanationScore ? Math.min(1, explanationScore / 10) : 0.9,
        }).catch((err) => console.error('Knowledge graph update failed:', err));
      }

      return {
        quizSession: updatedSession,
        mastery: {
          explanationScore,
          passesExplanation,
          isPerfectQuiz,
          attemptMastery,
          masteryStreak: updatedStudySession.masteryStreak,
          sessionCompleted: updatedStudySession.status === 'COMPLETED',
          studySessionId: updatedStudySession.id,
        },
      };
    }),

  /**
   * Get quiz session by ID
   */
  getSession: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const session = await ctx.prisma.quizSession.findUnique({
        where: { id: input.id },
        include: {
          explanation: {
            include: {
              studySession: {
                select: {
                  id: true,
                  topic: true,
                  scopeStatement: true,
                  status: true,
                  masteryStreak: true,
                  completedAt: true,
                },
              },
            },
          },
          answers: {
            include: { question: true },
          },
        },
      });

      if (!session || session.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Quiz session not found',
        });
      }

      return session;
    }),

  /**
   * Get questions for a quiz session
   */
  getQuestions: protectedProcedure
    .input(z.object({ explanationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const questions = await ctx.prisma.question.findMany({
        where: { explanationId: input.explanationId },
        orderBy: { createdAt: 'desc' },
      });

      return questions;
    }),
});
