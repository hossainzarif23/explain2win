'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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

  useEffect(() => {
    startTimeRef.current = Date.now();
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
      <div className="flex justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  const selectedOption = selectedByQuestionId[currentQuestion.id] ?? null;

  const displayOption = (option: string) => option.replace(/^[A-D]\)\s*/i, '').trim();

  const options =
    currentQuestion.questionType === 'MULTIPLE_CHOICE' && Array.isArray(currentQuestion.options)
      ? currentQuestion.options.filter((o): o is string => typeof o === 'string')
      : [];

  return (
    <div className="mx-auto max-w-3xl py-8">
      <div className="mb-6 space-y-2">
        <div className="flex justify-between text-sm font-medium text-slate-500">
          <span>
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-t-4 border-t-fuchsia-500 shadow-lg">
            <CardHeader>
              <h3 className="text-xl leading-relaxed font-semibold text-slate-900 dark:text-slate-100">
                {currentQuestion.questionText}
              </h3>
            </CardHeader>
            <CardContent className="space-y-4">
              {options.length > 0 ? (
                <div className="space-y-3">
                  {options.map((option, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      className={cn(
                        'h-auto w-full items-start justify-start gap-3 px-4 py-4 text-left text-base leading-relaxed wrap-break-word whitespace-normal transition-all',
                        selectedOption === option
                          ? 'border-fuchsia-500 bg-fuchsia-50 text-fuchsia-900 ring-1 ring-fuchsia-500 dark:bg-fuchsia-900/20 dark:text-fuchsia-100'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-900'
                      )}
                      onClick={() => handleOptionClick(option)}
                      disabled={isSubmitting}
                    >
                      <div
                        className={cn(
                          'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs',
                          selectedOption === option
                            ? 'border-fuchsia-600 bg-fuchsia-600 text-white'
                            : 'border-slate-300 dark:border-slate-600'
                        )}
                      >
                        {String.fromCharCode(65 + idx)}
                      </div>
                      <span className="min-w-0 flex-1">{displayOption(option)}</span>
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium tracking-wider text-slate-500 uppercase">
                      Your Answer:
                    </p>
                    <textarea
                      className="flex min-h-30 w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-base leading-relaxed ring-offset-white placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-fuchsia-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-fuchsia-300"
                      placeholder="Type your explanation or answer here..."
                      value={selectedOption || ''}
                      onChange={(e) => handleOptionClick(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between border-t bg-slate-50/50 pt-6 dark:bg-slate-950/20">
              <div className="flex items-center text-sm text-slate-500">
                <Clock className="mr-1 h-4 w-4" />
                <span>Topic: {currentQuestion.studentType}</span>
              </div>
              <Button
                onClick={handleConfirm}
                disabled={!selectedOption || isSubmitting}
                className={cn('w-32', isSubmitting && 'opacity-80')}
              >
                {isSubmitting ? 'Checking...' : isLastQuestion ? 'Finish' : 'Next'}
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
