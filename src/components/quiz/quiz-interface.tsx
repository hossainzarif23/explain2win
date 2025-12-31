'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, CheckCircle2, ChevronRight, Clock, Sparkles, Target, Zap } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useQuiz } from '@/hooks/useQuiz';
import { cn } from '@/lib/utils';
import { api } from '@/trpc/react';
import { QuizSessionReview } from '@/components/quiz/quiz-session-review';

interface QuizInterfaceProps {
  quizSessionId: string;
}

export function QuizInterface({ quizSessionId }: QuizInterfaceProps) {
  const startTimeRef = useRef(0);
  const [selectedByQuestionId, setSelectedByQuestionId] = useState<Record<string, string>>({});
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const sessionQuery = api.quiz.getSession.useQuery({ id: quizSessionId });

  const {
    currentQuestion,
    currentQuestionIndex,
    totalQuestions,
    isSubmitting,
    isLastQuestion,
    complete,
    progress,
    submitAnswer,
  } = useQuiz({ quizSessionId });

  // Timer for current question
  useEffect(() => {
    startTimeRef.current = Date.now();
    setElapsedSeconds(0);
    
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [currentQuestionIndex]);

  const handleOptionClick = (option: string) => {
    if (isSubmitting || complete) return;
    if (!currentQuestion) return;
    setSelectedByQuestionId((prev) => ({ ...prev, [currentQuestion.id]: option }));
  };

  const handleConfirm = () => {
    if (!currentQuestion) return;
    const selectedOption = selectedByQuestionId[currentQuestion.id];
    if (!selectedOption) return;
    const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);
    submitAnswer(selectedOption, timeTaken);
  };

  const isCompletedSession = !!sessionQuery.data?.completedAt;
  if (complete || isCompletedSession) {
    return <QuizSessionReview quizSessionId={quizSessionId} />;
  }

  if (!currentQuestion) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="relative">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
            <Brain className="absolute top-1/2 left-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-violet-600" />
          </div>
          <p className="text-sm font-medium text-slate-500">Loading your quiz...</p>
        </motion.div>
      </div>
    );
  }

  const selectedOption = selectedByQuestionId[currentQuestion.id] ?? null;
  const displayOption = (option: string) => option.replace(/^[A-D]\)\s*/i, '').trim();
  const options =
    currentQuestion.questionType === 'MULTIPLE_CHOICE' && Array.isArray(currentQuestion.options)
      ? currentQuestion.options.filter((o: unknown): o is string => typeof o === 'string')
      : [];

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6">
      {/* Header with Progress */}
      <div className="space-y-4">
        {/* Stats Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1.5 text-sm font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
              <Target className="h-4 w-4" />
              Question {currentQuestionIndex + 1}/{totalQuestions}
            </div>
            <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <Clock className="h-4 w-4" />
              {formatTime(elapsedSeconds)}
            </div>
          </div>
          <div className="text-sm font-medium text-slate-500">
            {Math.round(progress)}% Complete
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <motion.div
            className="absolute inset-y-0 left-0 bg-linear-to-r from-violet-500 to-fuchsia-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
        </div>

        {/* Question Dots */}
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalQuestions }).map((_, idx) => (
            <div
              key={idx}
              className={cn(
                'h-2 w-2 rounded-full transition-all duration-300',
                idx < currentQuestionIndex
                  ? 'bg-green-500'
                  : idx === currentQuestionIndex
                    ? 'w-6 bg-violet-500'
                    : 'bg-slate-300 dark:bg-slate-700'
              )}
            />
          ))}
        </div>
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.98 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <Card className="overflow-hidden border-0 shadow-xl ring-1 ring-slate-200/50 dark:ring-slate-800">
            {/* linear Top Border */}
            <div className="h-1 bg-linear-to-r from-violet-500 via-fuchsia-500 to-pink-500" />

            {/* Question Header */}
            <div className="bg-linear-to-br from-slate-50 to-white px-6 py-6 dark:from-slate-900 dark:to-slate-950">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/25">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold leading-relaxed text-slate-900 dark:text-slate-100 sm:text-xl">
                  {currentQuestion.questionText}
                </h3>
              </div>
            </div>

            {/* Options */}
            <CardContent className="space-y-3 p-6">
              {options.length > 0 ? (
                <div className="space-y-3">
                  {options.map((option, idx) => {
                    const isSelected = selectedOption === option;
                    const letter = String.fromCharCode(65 + idx);

                    return (
                      <motion.button
                        key={idx}
                        onClick={() => handleOptionClick(option)}
                        disabled={isSubmitting}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className={cn(
                          'group flex w-full items-start gap-4 rounded-xl border-2 p-4 text-left transition-all duration-200',
                          isSelected
                            ? 'border-violet-500 bg-violet-50 shadow-lg shadow-violet-500/10 dark:bg-violet-900/20'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700 dark:hover:bg-slate-900'
                        )}
                      >
                        <div
                          className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition-all duration-200',
                            isSelected
                              ? 'bg-linear-to-br from-violet-500 to-fuchsia-500 text-white shadow-md'
                              : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-slate-700'
                          )}
                        >
                          {letter}
                        </div>
                        <span className="min-w-0 flex-1 pt-1 text-base leading-relaxed text-slate-700 dark:text-slate-200">
                          {displayOption(option)}
                        </span>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="shrink-0"
                          >
                            <CheckCircle2 className="h-6 w-6 text-violet-500" />
                          </motion.div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Your Answer
                  </label>
                  <textarea
                    className="flex min-h-32 w-full resize-y rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-base leading-relaxed transition-all placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 focus:outline-none disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-violet-400"
                    placeholder="Type your explanation or answer here..."
                    value={selectedOption || ''}
                    onChange={(e) => handleOptionClick(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              )}
            </CardContent>

            {/* Footer */}
            <div className="flex items-center justify-between border-t bg-slate-50/80 px-6 py-4 dark:bg-slate-900/50">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Zap className="h-4 w-4 text-amber-500" />
                <span>Answer when ready</span>
              </div>
              <Button
                onClick={handleConfirm}
                disabled={!selectedOption || isSubmitting}
                size="lg"
                className={cn(
                  'gap-2 bg-linear-to-r from-violet-600 to-fuchsia-600 px-6 font-semibold shadow-lg shadow-violet-500/25 transition-all hover:from-violet-700 hover:to-fuchsia-700 hover:shadow-xl hover:shadow-violet-500/30 disabled:opacity-50',
                  isSubmitting && 'animate-pulse'
                )}
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Checking...
                  </>
                ) : isLastQuestion ? (
                  <>
                    Finish Quiz
                    <CheckCircle2 className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Next Question
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Keyboard Hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex justify-center"
      >
        <div className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs text-slate-500 dark:bg-slate-900 dark:text-slate-400">
          <span className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-xs dark:bg-slate-800">A-D</span>
          <span>to select</span>
          <span className="mx-1">•</span>
          <span className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-xs dark:bg-slate-800">Enter</span>
          <span>to confirm</span>
        </div>
      </motion.div>
    </div>
  );
}
