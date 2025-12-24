import { QuizInterface } from '@/components/quiz/quiz-interface';

type QuizPageParams = { sessionId: string };

export default async function QuizPage({ params }: { params: Promise<QuizPageParams> }) {
  const { sessionId } = await params;
  return (
    <div className="container max-w-4xl py-6 lg:py-10">
      <QuizInterface quizSessionId={sessionId} />
    </div>
  );
}
