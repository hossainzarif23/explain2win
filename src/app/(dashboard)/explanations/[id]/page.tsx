'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, BookOpen, MessageSquare, Mic } from 'lucide-react';

import { api } from '@/trpc/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { AudioPlayer } from '@/components/audio/audio-player';
import { EvaluationCard } from '@/components/explanation/evaluation-card';
import { FeedbackDisplay } from '@/components/explanation/feedback-display';
import { cn } from '@/lib/utils';

type PageParams = { id: string };

export default function ExplanationDetailPage({ params }: { params: Promise<PageParams> }) {
  const { id } = use(params);

  const { data: explanation, isLoading } = api.explanation.getById.useQuery({ id });

  if (isLoading) {
    return <ExplanationDetailSkeleton />;
  }

  if (!explanation) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground">Explanation not found.</p>
        <Link href="/study-sessions" className="mt-4">
          <Button variant="link">← Back to Study Sessions</Button>
        </Link>
      </div>
    );
  }

  const studySessionId = explanation.studySessionId;

  const strengths = Array.isArray(explanation.evalStrengths)
    ? (explanation.evalStrengths as string[])
    : [];
  const improvements = Array.isArray(explanation.evalImprovements)
    ? (explanation.evalImprovements as string[])
    : [];
  const missingConcepts = Array.isArray(explanation.evalMissingConcepts)
    ? (explanation.evalMissingConcepts as string[])
    : [];
  const learningObjectives = Array.isArray(explanation.evalLearningObjectives)
    ? (explanation.evalLearningObjectives as string[])
    : [];

  return (
    <div className="space-y-8">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Study Sessions', href: '/study-sessions' },
          { label: explanation.studySession?.topic ?? 'Session', href: `/study-sessions/${studySessionId}` },
          { label: `Attempt #${explanation.attemptNumber}` },
        ]}
      />

      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Attempt #{explanation.attemptNumber}
          </h2>
          {explanation.evalOverallScore !== null && (
            <span
              className={cn(
                'inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold',
                explanation.evalOverallScore >= 9
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                  : explanation.evalOverallScore >= 7
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
              )}
            >
              {explanation.evalOverallScore.toFixed(1)}/10
            </span>
          )}
        </div>
        <p className="text-muted-foreground mt-1">
          {formatDateTime(explanation.createdAt)} • Duration: {formatDuration(explanation.duration)}
        </p>
      </div>

      {/* Evaluation Chart & Score */}
      <EvaluationCard
        scores={{
          correctness: explanation.evalCorrectness,
          clarity: explanation.evalClarity,
          depth: explanation.evalDepth,
          relevance: explanation.evalRelevance,
          structure: explanation.evalStructure,
        }}
        overallScore={explanation.evalOverallScore}
        shortFeedback={explanation.evalShortFeedback}
      />

      {/* Feedback Display */}
      <FeedbackDisplay
        strengths={strengths}
        improvements={improvements}
        missingConcepts={missingConcepts}
        learningObjectives={learningObjectives}
      />

      {/* Transcription */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-violet-500" />
            Your Explanation
          </CardTitle>
          <CardDescription>The transcription of your spoken explanation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {explanation.audioUrl && (
            <AudioPlayer src={explanation.audioUrl} duration={explanation.duration} />
          )}
          <div className="rounded-lg border bg-white p-4 text-sm leading-relaxed whitespace-pre-wrap dark:bg-slate-950">
            {explanation.transcription}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Feedback */}
      {explanation.evalDetailedFeedback && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-violet-500" />
              Detailed Feedback
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-slate dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
              {explanation.evalDetailedFeedback}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quiz Link */}
      {explanation.quizSession && (
        <Card className="border-none bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-sm">
          <CardContent className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold">Quiz Results</p>
                <p className="text-sm text-violet-100">
                  Score: {explanation.quizSession.score !== null ? `${Math.round(explanation.quizSession.score)}%` : 'Not completed'} •{' '}
                  {explanation.quizSession.correctAnswers}/{explanation.quizSession.totalQuestions} correct
                </p>
              </div>
            </div>
            <Link href={`/quiz/${explanation.quizSession.id}`}>
              <Button variant="secondary" className="gap-2 bg-white text-violet-600 hover:bg-slate-100">
                View Quiz
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Link href={`/study-sessions/${studySessionId}`}>
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Session
          </Button>
        </Link>
        {explanation.studySession?.status === 'ACTIVE' && (
          <Link href={`/explain?studySessionId=${studySessionId}`}>
            <Button className="gap-2">
              Next Attempt
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function ExplanationDetailSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-4 w-64" />
      <div className="space-y-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-80 rounded-xl" />
      <Skeleton className="h-24 rounded-xl" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
