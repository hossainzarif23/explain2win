'use client';

import type { QuestionType } from '@prisma/client';
import { CheckCircle2, XCircle } from 'lucide-react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
  if (question.questionType === 'TRUE_FALSE') return ['True', 'False'];
  if (Array.isArray(question.options)) {
    return question.options.filter((o): o is string => typeof o === 'string');
  }
  return [];
}

export function QuizSessionReview({ quizSessionId }: { quizSessionId: string }) {
  const sessionQuery = api.quiz.getSession.useQuery({ id: quizSessionId });

  if (sessionQuery.isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 py-8">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-48 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
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

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-8">
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Quiz Review
            </h2>
            <p className="text-muted-foreground text-sm">
              Score: {Math.round(score)}% • {correctCount}/{totalQuestions} correct
            </p>
          </div>
        </CardHeader>
      </Card>

      <div className="space-y-4">
        {answers.map((answer, index) => {
          const question = answer.question;
          const questionType = question.questionType;

          const isMcqLike = questionType === 'MULTIPLE_CHOICE' || questionType === 'TRUE_FALSE';

          const options = getOptionsForQuestion({
            questionType: question.questionType,
            options: question.options,
          });

          const correctAnswer = question.correctAnswer;
          const userAnswer = answer.userAnswer;

          return (
            <Card key={answer.id} className="overflow-hidden border shadow-sm">
              <CardHeader className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                      Question {index + 1}
                    </p>
                    <h3 className="text-base leading-relaxed font-semibold text-slate-900 dark:text-slate-100">
                      {question.questionText}
                    </h3>
                  </div>
                  <div
                    className={cn(
                      'flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium',
                      answer.isCorrect
                        ? 'border-green-600/30 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-200'
                        : 'border-rose-600/30 bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-200'
                    )}
                  >
                    {answer.isCorrect ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    {answer.isCorrect ? 'Correct' : 'Incorrect'}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
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
                            'flex w-full items-start gap-3 rounded-md border px-4 py-3 text-sm',
                            'bg-white dark:bg-slate-950',
                            isSelected &&
                              (answer.isCorrect
                                ? 'border-green-600 bg-green-50 dark:bg-green-900/15'
                                : 'border-rose-600 bg-rose-50 dark:bg-rose-900/15'),
                            showCorrect && 'border-green-600 bg-green-50 dark:bg-green-900/15'
                          )}
                        >
                          <div
                            className={cn(
                              'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold',
                              isSelected && answer.isCorrect
                                ? 'border-green-600 bg-green-600 text-white'
                                : isSelected && !answer.isCorrect
                                  ? 'border-rose-600 bg-rose-600 text-white'
                                  : showCorrect
                                    ? 'border-green-600 bg-green-600 text-white'
                                    : 'border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                            )}
                          >
                            {String.fromCharCode(65 + idx)}
                          </div>
                          <div className="min-w-0 flex-1 leading-relaxed wrap-break-word whitespace-normal">
                            {displayOption(option)}
                          </div>
                          {showCorrect ? (
                            <span className="shrink-0 text-[11px] font-medium text-green-700 dark:text-green-200">
                              Correct answer
                            </span>
                          ) : null}
                          {isSelected ? (
                            <span className="shrink-0 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                              Your choice
                            </span>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid gap-3">
                    <div>
                      <p className="mb-1 text-xs font-medium tracking-wide text-slate-500 uppercase">
                        Your Answer
                      </p>
                      <div className="rounded-md border bg-white px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap dark:bg-slate-950">
                        {userAnswer}
                      </div>
                    </div>

                    <div>
                      <p className="mb-1 text-xs font-medium tracking-wide text-slate-500 uppercase">
                        Correct Answer
                      </p>
                      <div className="rounded-md border bg-white px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap dark:bg-slate-950">
                        {correctAnswer}
                      </div>
                    </div>
                  </div>
                )}

                {question.explanation ? (
                  <div>
                    <p className="mb-1 text-xs font-medium tracking-wide text-slate-500 uppercase">
                      Explanation
                    </p>
                    <div className="rounded-md border bg-slate-50 px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-slate-700 dark:bg-slate-900/30 dark:text-slate-200">
                      {question.explanation}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}

        {answers.length === 0 ? (
          <Card className="border shadow-sm">
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground text-sm">
                No answers recorded for this session yet.
              </p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
