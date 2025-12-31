'use client';

import type { QuestionType } from '@prisma/client';
import { motion } from 'framer-motion';
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Flame,
  PartyPopper,
  RotateCcw,
  Target,
  Trophy,
  XCircle,
  Zap,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { api } from '@/trpc/react';

function normalize(text: string): string {
  return text.toLowerCase().trim();
}

function displayOption(option: string): string {
  return option.replace(/^[A-D]\)\s*/i, '').trim();
}

function getOptionsForQuestion(question: {
  questionType: QuestionType;
  options: unknown;
}): string[] {
  if (Array.isArray(question.options)) {
    return question.options.filter((o): o is string => typeof o === 'string');
  }
  return [];
}

export function QuizSessionReview({ quizSessionId }: { quizSessionId: string }) {
  const router = useRouter();
  const sessionQuery = api.quiz.getSession.useQuery({ id: quizSessionId });

  if (sessionQuery.isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 py-8">
        <div className="h-48 animate-pulse rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900" />
        <div className="h-32 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
        <div className="h-48 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
      </div>
    );
  }

  const session = sessionQuery.data;
  if (!session) {
    return (
      <div className="mx-auto max-w-3xl py-12 text-center">
        <p className="text-muted-foreground text-sm">Quiz session not found.</p>
      </div>
    );
  }

  const answers = [...(session.answers ?? [])].sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return aTime - bTime;
  });

  const correctCount = answers.filter((a) => a.isCorrect).length;
  const totalQuestions = session.totalQuestions || answers.length;
  const score = session.score ?? (totalQuestions ? (correctCount / totalQuestions) * 100 : 0);
  const totalTime = answers.reduce((sum, a) => sum + a.timeTaken, 0);

  const studySession = session.explanation?.studySession ?? null;
  const explanationScore = session.explanation?.evalOverallScore ?? null;
  const isPerfectQuiz = correctCount === totalQuestions && totalQuestions > 0;
  const passesExplanation = typeof explanationScore === 'number' && explanationScore >= 9;
  const attemptMastery = passesExplanation && isPerfectQuiz;
  const sessionCompleted = studySession?.status === 'COMPLETED';

  const getScoreEmoji = () => {
    if (score >= 100) return '🎯';
    if (score >= 80) return '🌟';
    if (score >= 60) return '👍';
    return '💪';
  };

  const getScoreMessage = () => {
    if (score >= 100) return 'Perfect Score!';
    if (score >= 80) return 'Excellent Work!';
    if (score >= 60) return 'Good Job!';
    return 'Keep Practicing!';
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6">
      {/* Score Hero Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="overflow-hidden border-0 shadow-2xl">
          <div
            className={cn(
              'relative bg-gradient-to-br p-8 text-center text-white',
              score >= 80
                ? 'from-green-500 via-emerald-500 to-teal-600'
                : score >= 60
                  ? 'from-amber-500 via-orange-500 to-yellow-600'
                  : 'from-violet-500 via-purple-500 to-fuchsia-600'
            )}
          >
            {/* Background decoration */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
            <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-white/10 blur-3xl" />

            {/* Celebration animation for perfect score */}
            {isPerfectQuiz && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                className="absolute top-4 right-4"
              >
                <PartyPopper className="h-8 w-8 text-yellow-300" />
              </motion.div>
            )}

            <div className="relative">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="mb-4 text-6xl"
              >
                {getScoreEmoji()}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="mb-2 text-3xl font-bold">{getScoreMessage()}</h2>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-6xl font-black">{Math.round(score)}%</span>
                </div>
                <p className="mt-3 text-lg opacity-90">
                  {correctCount} of {totalQuestions} questions correct
                </p>
              </motion.div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 divide-x divide-slate-200 border-b bg-white dark:divide-slate-800 dark:bg-slate-950">
            <div className="flex flex-col items-center gap-1 py-4">
              <div className="flex items-center gap-1.5 text-green-500">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-2xl font-bold">{correctCount}</span>
              </div>
              <span className="text-xs text-slate-500">Correct</span>
            </div>
            <div className="flex flex-col items-center gap-1 py-4">
              <div className="flex items-center gap-1.5 text-red-500">
                <XCircle className="h-5 w-5" />
                <span className="text-2xl font-bold">{totalQuestions - correctCount}</span>
              </div>
              <span className="text-xs text-slate-500">Incorrect</span>
            </div>
            <div className="flex flex-col items-center gap-1 py-4">
              <div className="flex items-center gap-1.5 text-violet-500">
                <Clock className="h-5 w-5" />
                <span className="text-2xl font-bold">{formatTime(totalTime)}</span>
              </div>
              <span className="text-xs text-slate-500">Total Time</span>
            </div>
          </div>

          {/* Study Session Info */}
          {studySession && (
            <CardContent className="py-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {studySession.topic}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Flame className="h-4 w-4 text-orange-500" />
                      <span>Streak: {studySession.masteryStreak}</span>
                      {attemptMastery && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="flex items-center gap-1 text-green-600">
                            <Award className="h-4 w-4" />
                            Mastery achieved!
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  {sessionCompleted ? (
                    <Button
                      onClick={() => router.push('/progress')}
                      className="gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-lg"
                    >
                      <Trophy className="h-4 w-4" />
                      View Progress
                    </Button>
                  ) : (
                    <Button
                      onClick={() => router.push(`/explain?studySessionId=${studySession.id}`)}
                      className="gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-lg"
                    >
                      <Zap className="h-4 w-4" />
                      Next Attempt
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </motion.div>

      {/* Questions Review */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
            <Target className="h-5 w-5 text-violet-500" />
            Question Review
          </h3>
          <span className="text-sm text-slate-500">
            {answers.length} questions answered
          </span>
        </div>

        {answers.map((answer, index) => {
          const question = answer.question;
          const questionType = question.questionType;
          const isMcqLike = questionType === 'MULTIPLE_CHOICE';
          const options = getOptionsForQuestion({
            questionType: question.questionType,
            options: question.options,
          });
          const correctAnswer = question.correctAnswer;
          const userAnswer = answer.userAnswer;

          return (
            <motion.div
              key={answer.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="overflow-hidden border shadow-md transition-shadow hover:shadow-lg">
                {/* Question Header */}
                <CardHeader className="border-b bg-slate-50/80 pb-4 dark:bg-slate-900/50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold',
                          answer.isCorrect
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                        )}
                      >
                        {index + 1}
                      </div>
                      <h4 className="text-base font-medium leading-relaxed text-slate-900 dark:text-slate-100">
                        {question.questionText}
                      </h4>
                    </div>
                    <div
                      className={cn(
                        'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
                        answer.isCorrect
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                      )}
                    >
                      {answer.isCorrect ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5" />
                      )}
                      {answer.isCorrect ? 'Correct' : 'Incorrect'}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 p-5">
                  {isMcqLike ? (
                    <div className="space-y-2">
                      {options.map((option, idx) => {
                        const isSelected = normalize(option) === normalize(userAnswer);
                        const isCorrect = normalize(option) === normalize(correctAnswer);
                        const showCorrect = !answer.isCorrect && isCorrect;

                        return (
                          <div
                            key={`${answer.id}-${idx}`}
                            className={cn(
                              'flex items-start gap-3 rounded-lg border-2 px-4 py-3 text-sm transition-all',
                              isSelected && answer.isCorrect
                                ? 'border-green-500 bg-green-50 dark:bg-green-900/10'
                                : isSelected && !answer.isCorrect
                                  ? 'border-red-500 bg-red-50 dark:bg-red-900/10'
                                  : showCorrect
                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/10'
                                    : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950'
                            )}
                          >
                            <div
                              className={cn(
                                'flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold',
                                isSelected && answer.isCorrect
                                  ? 'bg-green-500 text-white'
                                  : isSelected && !answer.isCorrect
                                    ? 'bg-red-500 text-white'
                                    : showCorrect
                                      ? 'bg-green-500 text-white'
                                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                              )}
                            >
                              {String.fromCharCode(65 + idx)}
                            </div>
                            <span className="min-w-0 flex-1 leading-relaxed">
                              {displayOption(option)}
                            </span>
                            {showCorrect && (
                              <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                Correct answer
                              </span>
                            )}
                            {isSelected && (
                              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                Your choice
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Your Answer
                        </p>
                        <div
                          className={cn(
                            'rounded-lg border-2 px-4 py-3 text-sm leading-relaxed',
                            answer.isCorrect
                              ? 'border-green-500 bg-green-50 dark:bg-green-900/10'
                              : 'border-red-500 bg-red-50 dark:bg-red-900/10'
                          )}
                        >
                          {userAnswer}
                        </div>
                      </div>
                      {!answer.isCorrect && (
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Correct Answer
                          </p>
                          <div className="rounded-lg border-2 border-green-500 bg-green-50 px-4 py-3 text-sm leading-relaxed dark:bg-green-900/10">
                            {correctAnswer}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {question.explanation && (
                    <div className="rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 p-4 dark:from-slate-900 dark:to-slate-900/50">
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400">
                        <Zap className="h-3.5 w-3.5" />
                        Explanation
                      </p>
                      <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                        {question.explanation}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}

        {answers.length === 0 && (
          <Card className="border shadow-sm">
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground text-sm">
                No answers recorded for this session yet.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bottom CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex justify-center gap-3 pt-4"
      >
        <Button
          variant="outline"
          onClick={() => router.push('/study-sessions')}
          className="gap-2"
        >
          <BookOpen className="h-4 w-4" />
          All Sessions
        </Button>
        {!sessionCompleted && studySession && (
          <Button
            onClick={() => router.push(`/explain?studySessionId=${studySession.id}`)}
            className="gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-lg"
          >
            <RotateCcw className="h-4 w-4" />
            Try Again
          </Button>
        )}
      </motion.div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}
