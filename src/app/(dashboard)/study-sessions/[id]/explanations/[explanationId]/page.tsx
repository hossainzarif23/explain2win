'use client';

import { use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Lightbulb,
  ListChecks,
  MessageSquare,
  Mic,
  Play,
  Target,
  XCircle,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';

import { api } from '@/trpc/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type PageParams = { id: string; explanationId: string };

export default function ExplanationDetailPage({ params }: { params: Promise<PageParams> }) {
  const { id: studySessionId, explanationId } = use(params);

  const { data: explanation, isLoading } = api.explanation.getById.useQuery({
    id: explanationId,
  });

  if (isLoading) {
    return <ExplanationDetailSkeleton />;
  }

  if (!explanation) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground">Explanation not found.</p>
        <Link href={`/study-sessions/${studySessionId}`} className="mt-4">
          <Button variant="link">← Back to Study Session</Button>
        </Link>
      </div>
    );
  }

  const evaluationData = [
    { name: 'Correctness', value: explanation.evalCorrectness ?? 0, fill: '#8b5cf6' },
    { name: 'Clarity', value: explanation.evalClarity ?? 0, fill: '#06b6d4' },
    { name: 'Depth', value: explanation.evalDepth ?? 0, fill: '#10b981' },
    { name: 'Relevance', value: explanation.evalRelevance ?? 0, fill: '#f59e0b' },
    { name: 'Structure', value: explanation.evalStructure ?? 0, fill: '#ec4899' },
  ];

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
      <div className="space-y-1">
        <Link
          href={`/study-sessions/${studySessionId}`}
          className="text-muted-foreground mb-2 inline-flex items-center gap-1 text-sm hover:text-slate-900 dark:hover:text-slate-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {explanation.studySession?.topic ?? 'Study Session'}
        </Link>
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

      {/* Evaluation Chart */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-violet-500" />
            Evaluation Breakdown
          </CardTitle>
          <CardDescription>
            Performance across the five key dimensions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={evaluationData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
              >
                <XAxis type="number" domain={[0, 10]} />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                  formatter={(value) => [`${value ?? 0}/10`, 'Score']}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                  {evaluationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Short Feedback */}
      {explanation.evalShortFeedback && (
        <Card className="border-l-4 border-l-violet-500 shadow-sm">
          <CardContent className="py-4">
            <p className="text-lg leading-relaxed text-slate-700 dark:text-slate-200">
              {explanation.evalShortFeedback}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Strengths & Improvements */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            {strengths.length > 0 ? (
              <ul className="space-y-2">
                {strengths.map((strength, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">No strengths identified yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Lightbulb className="h-5 w-5" />
              Areas for Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            {improvements.length > 0 ? (
              <ul className="space-y-2">
                {improvements.map((improvement, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <span>{improvement}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">No improvements suggested.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Missing Concepts & Learning Objectives */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <XCircle className="h-5 w-5" />
              Missing Concepts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {missingConcepts.length > 0 ? (
              <ul className="space-y-2">
                {missingConcepts.map((concept, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                    <span>{concept}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">All key concepts covered! 🎉</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <ListChecks className="h-5 w-5" />
              Learning Objectives
            </CardTitle>
          </CardHeader>
          <CardContent>
            {learningObjectives.length > 0 ? (
              <ul className="space-y-2">
                {learningObjectives.map((objective, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                    <span>{objective}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">No specific objectives listed.</p>
            )}
          </CardContent>
        </Card>
      </div>

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
            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <Play className="h-5 w-5 text-violet-500" />
                <audio controls className="h-10 w-full" preload="metadata">
                  <source src={explanation.audioUrl} type="audio/webm" />
                  Your browser does not support the audio element.
                </audio>
              </div>
            </div>
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
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
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
