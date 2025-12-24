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

function isTruthyEnv(value: string | undefined): boolean {
  if (!value) return false;
  return ['1', 'true', 'yes', 'y', 'on'].includes(value.toLowerCase());
}

const QUIZ_GRADING_DEBUG = isTruthyEnv(process.env.QUIZ_GRADING_DEBUG);

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
      });

      if (!explanation || explanation.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Explanation not found',
        });
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

      // Generate questions using AI
      const generatedQuestions = await generateQuizQuestions({
        topic: explanation.topic,
        transcription: explanation.transcription,
        studentType: input.studentType,
        questionCount: input.questionCount,
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
        if (QUIZ_GRADING_DEBUG) {
          console.info('[quiz] using LLM grading', {
            quizSessionId: input.quizSessionId,
            questionId: input.questionId,
            questionType: question.questionType,
          });
        }

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

        if (QUIZ_GRADING_DEBUG) {
          console.info('[quiz] LLM grading result', {
            quizSessionId: input.quizSessionId,
            questionId: input.questionId,
            isCorrect,
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
      const session = await ctx.prisma.quizSession.findUnique({
        where: { id: input.quizSessionId },
      });

      if (!session || session.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Quiz session not found',
        });
      }

      const score = (session.correctAnswers / session.totalQuestions) * 100;

      // Update session and progress
      const [updatedSession] = await ctx.prisma.$transaction([
        ctx.prisma.quizSession.update({
          where: { id: input.quizSessionId },
          data: {
            score,
            completedAt: new Date(),
          },
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
      ]);

      return updatedSession;
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
          explanation: true,
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
