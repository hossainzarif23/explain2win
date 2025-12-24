import { useState, useCallback } from 'react';
import type { Question } from '@prisma/client';
import { api } from '@/trpc/react';
import { toast } from 'sonner';

interface UseQuizProps {
  quizSessionId: string;
  initialQuestions?: Question[];
}

export function useQuiz({ quizSessionId, initialQuestions = [] }: UseQuizProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);

  // Queries
  const sessionQuery = api.quiz.getSession.useQuery(
    { id: quizSessionId },
    { enabled: !initialQuestions.length }
  );

  const questionsQuery = api.quiz.getQuestions.useQuery(
    { explanationId: sessionQuery.data?.explanationId ?? '' },
    { enabled: !!sessionQuery.data?.explanationId && !initialQuestions.length }
  );

  const questions = initialQuestions.length > 0 ? initialQuestions : (questionsQuery.data ?? []);

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  // Mutations
  const submitAnswerMutation = api.quiz.submitAnswer.useMutation({
    onSuccess: (data) => {
      if (data.isCorrect) {
        toast.success('Correct answer!', { position: 'bottom-center' });
      } else {
        toast.error('Incorrect answer', { position: 'bottom-center' });
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const completeMutation = api.quiz.complete.useMutation({
    onSuccess: () => {
      setComplete(true);
      toast.success('Quiz completed!');
    },
  });

  const handleAnswerObject = useCallback(
    async (answer: string, timeTaken: number) => {
      if (!currentQuestion || isSubmitting) return;

      setIsSubmitting(true);
      setAnswers((prev) => ({ ...prev, [currentQuestion.id]: answer }));

      try {
        await submitAnswerMutation.mutateAsync({
          quizSessionId,
          questionId: currentQuestion.id,
          userAnswer: answer,
          timeTaken,
        });

        if (!isLastQuestion) {
          setTimeout(() => {
            setCurrentQuestionIndex((prev) => prev + 1);
            setIsSubmitting(false);
          }, 1500); // Delay to show feedback
        } else {
          await completeMutation.mutateAsync({ quizSessionId });
          setIsSubmitting(false);
        }
      } catch {
        setIsSubmitting(false);
      }
    },
    [
      currentQuestion,
      isSubmitting,
      quizSessionId,
      submitAnswerMutation,
      isLastQuestion,
      completeMutation,
    ]
  );

  return {
    questions,
    currentQuestion,
    currentQuestionIndex,
    isLastQuestion,
    isLoading: sessionQuery.isLoading || questionsQuery.isLoading,
    isSubmitting,
    complete,
    answers,
    submitAnswer: handleAnswerObject,
    totalQuestions: questions.length,
    progress: (currentQuestionIndex / questions.length) * 100,
  };
}
