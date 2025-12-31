'use client';

import { use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  ChevronRight,
  Clock,
  Target,
  TrendingUp,
  Trophy,
} from 'lucide-react';

import { api } from '@/trpc/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { cn } from '@/lib/utils';

type PageParams = { id: string };

export default function StudySessionDetailPage({ params }: { params: Promise<PageParams> }) {
  const { id } = use(params);

  const { data: session, isLoading } = api.studySession.getByIdWithDetails.useQuery({ id });

  if (isLoading) {
    return <StudySessionDetailSkeleton />;
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground">Study session not found.</p>
        <Link href="/study-sessions" className="mt-4">
          <Button variant="link">← Back to Study Sessions</Button>
        </Link>
      </div>
    );
  }

  const { stats } = session;

  return (
    <div className="space-y-8">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Study Sessions', href: '/study-sessions' },
          { label: session.topic },
        ]}
      />

      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {session.topic}
            </h2>
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                session.status === 'COMPLETED'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
              )}
            >
              {session.status}
            </span>
          </div>
          <p className="text-muted-foreground mt-2 max-w-2xl">{session.scopeStatement}</p>
        </div>
        {session.status === 'ACTIVE' && (
          <Link href={`/explain?studySessionId=${session.id}`}>
            <Button className="gap-2">
              <BookOpen className="h-4 w-4" />
              Continue Session
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatsCard
          title="Total Attempts"
          value={stats.attemptsCount}
          icon={TrendingUp}
          description="Explanation attempts"
        />
        <StatsCard
          title="Mastery Streak"
          value={session.masteryStreak}
          icon={Trophy}
          description="Consecutive mastery"
          color="text-amber-500"
        />
        <StatsCard
          title="Overall Accuracy"
          value={stats.accuracy !== null ? `${Math.round(stats.accuracy)}%` : '-'}
          icon={Target}
          description="Quiz performance"
          color="text-green-500"
        />
        <StatsCard
          title="Time to Master"
          value={stats.timeToMasterDays !== null ? `${stats.timeToMasterDays} days` : '-'}
          icon={Calendar}
          description={session.completedAt ? 'Completed' : 'In progress'}
          color="text-violet-500"
        />
      </div>

      <Card className="overflow-hidden shadow-sm">
        <CardHeader>
          <CardTitle>Explanation Attempts</CardTitle>
          <CardDescription>
            Track your progress through each explanation attempt.
          </CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50/50 dark:bg-slate-900/50">
                <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">
                  ID
                </th>
                <th className="px-4 py-3 text-center font-medium text-slate-600 dark:text-slate-300">
                  Attempt
                </th>
                <th className="px-4 py-3 text-center font-medium text-slate-600 dark:text-slate-300">
                  Overall
                </th>
                <th className="px-4 py-3 text-center font-medium text-slate-600 dark:text-slate-300">
                  Correctness
                </th>
                <th className="px-4 py-3 text-center font-medium text-slate-600 dark:text-slate-300">
                  Clarity
                </th>
                <th className="px-4 py-3 text-center font-medium text-slate-600 dark:text-slate-300">
                  Depth
                </th>
                <th className="px-4 py-3 text-center font-medium text-slate-600 dark:text-slate-300">
                  Relevance
                </th>
                <th className="px-4 py-3 text-center font-medium text-slate-600 dark:text-slate-300">
                  Structure
                </th>
                <th className="px-4 py-3 text-center font-medium text-slate-600 dark:text-slate-300">
                  Quiz %
                </th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {session.explanations.map((explanation) => (
                <tr
                  key={explanation.id}
                  className="border-b transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-900/30"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/study-sessions/${session.id}/explanations/${explanation.id}`}
                      className="font-mono text-xs text-violet-600 hover:underline dark:text-violet-400"
                    >
                      {explanation.id.slice(0, 8)}…
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-center font-medium">
                    #{explanation.attemptNumber}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ScoreBadge score={explanation.evalOverallScore} max={10} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ScoreBadge score={explanation.evalCorrectness} max={10} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ScoreBadge score={explanation.evalClarity} max={10} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ScoreBadge score={explanation.evalDepth} max={10} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ScoreBadge score={explanation.evalRelevance} max={10} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ScoreBadge score={explanation.evalStructure} max={10} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    {explanation.quizSession?.score !== null &&
                    explanation.quizSession?.score !== undefined ? (
                      <span
                        className={cn(
                          'font-medium',
                          explanation.quizSession.score >= 80
                            ? 'text-green-600 dark:text-green-400'
                            : explanation.quizSession.score >= 60
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-red-600 dark:text-red-400'
                        )}
                      >
                        {Math.round(explanation.quizSession.score)}%
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/study-sessions/${session.id}/explanations/${explanation.id}`}
                    >
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="text-muted-foreground flex items-center justify-between text-xs">
        <span>
          Created: {formatDateTime(session.createdAt)}
          {session.completedAt && ` • Completed: ${formatDateTime(session.completedAt)}`}
        </span>
        <span>Total study time: {formatDuration(stats.totalDuration)}</span>
      </div>
    </div>
  );
}

function ScoreBadge({ score, max }: { score: number | null; max: number }) {
  if (score === null) {
    return <span className="text-slate-400">-</span>;
  }

  const percentage = (score / max) * 100;
  const colorClass =
    percentage >= 80
      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
      : percentage >= 60
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';

  return (
    <span
      className={cn(
        'inline-flex min-w-8 items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium',
        colorClass
      )}
    >
      {typeof score === 'number' && score % 1 !== 0 ? score.toFixed(1) : score}
    </span>
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
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  color,
}: {
  title: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  color?: string;
}) {
  return (
    <Card className="border-slate-200 shadow-sm dark:border-slate-800">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={cn('text-muted-foreground h-4 w-4', color)} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-muted-foreground text-xs">{description}</p>
      </CardContent>
    </Card>
  );
}

function StudySessionDetailSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}
