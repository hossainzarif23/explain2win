'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  ChevronRight,
  Clock,
  Filter,
  Library,
  Target,
  TrendingUp,
} from 'lucide-react';

import { api } from '@/trpc/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type StatusFilter = 'ALL' | 'ACTIVE' | 'COMPLETED';

type StudySession = {
  id: string;
  topic: string;
  scopeStatement: string;
  status: string;
  createdAt: Date;
  completedAt: Date | null;
  attemptsCount: number;
  accuracy: number | null;
};

export default function StudySessionsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  const { data, isLoading } = api.studySession.list.useQuery({
    limit: 50,
    status: statusFilter,
  });

  if (isLoading) {
    return <StudySessionsSkeleton />;
  }

  const sessions = data?.sessions ?? [];

  // Calculate aggregate stats
  const totalSessions = sessions.length;
  const completedSessions = sessions.filter((s: StudySession) => s.status === 'COMPLETED').length;
  const activeSessions = sessions.filter((s: StudySession) => s.status === 'ACTIVE').length;
  const avgAccuracy =
    sessions.filter((s: StudySession) => s.accuracy !== null).reduce((sum: number, s: StudySession) => sum + (s.accuracy ?? 0), 0) /
      (sessions.filter((s: StudySession) => s.accuracy !== null).length || 1) || 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Study Sessions
          </h2>
          <p className="text-muted-foreground mt-1">
            Review your learning journey organized by topic.
          </p>
        </div>
        <div className="flex gap-2">
          {(['ALL', 'ACTIVE', 'COMPLETED'] as StatusFilter[]).map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(status)}
              className="gap-1"
            >
              <Filter className="h-3 w-3" />
              {status === 'ALL' ? 'All' : status === 'ACTIVE' ? 'Active' : 'Completed'}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatsCard
          title="Total Sessions"
          value={totalSessions}
          icon={Library}
          description="Learning topics"
        />
        <StatsCard
          title="Completed"
          value={completedSessions}
          icon={Target}
          description="Mastered topics"
          color="text-green-500"
        />
        <StatsCard
          title="In Progress"
          value={activeSessions}
          icon={Clock}
          description="Active sessions"
          color="text-amber-500"
        />
        <StatsCard
          title="Avg. Accuracy"
          value={`${Math.round(avgAccuracy)}%`}
          icon={TrendingUp}
          description="Quiz performance"
          color="text-violet-500"
        />
      </div>

      {sessions.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-dashed p-12 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <BookOpen className="h-6 w-6 text-slate-400" />
          </div>
          <CardTitle>No study sessions yet</CardTitle>
          <CardDescription className="mt-2 max-w-sm">
            Start explaining a topic to create your first study session.
          </CardDescription>
          <Link href="/explain" className="mt-6">
            <Button>Start Explaining</Button>
          </Link>
        </Card>
      ) : (
        <Card className="overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50/50 dark:bg-slate-900/50">
                  <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">
                    Topic
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">
                    Scope
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">
                    Created
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">
                    Completed
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-300">
                    Attempts
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-300">
                    Accuracy
                  </th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session: StudySession) => (
                  <tr
                    key={session.id}
                    className="border-b transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-900/30"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/study-sessions/${session.id}`}
                        className="font-mono text-xs text-violet-600 hover:underline dark:text-violet-400"
                      >
                        {session.id.slice(0, 8)}…
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                      {session.topic}
                    </td>
                    <td className="max-w-xs px-4 py-3">
                      <ScopeCell scope={session.scopeStatement} />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                          session.status === 'COMPLETED'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                        )}
                      >
                        {session.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {formatDateTime(session.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {session.completedAt ? formatDateTime(session.completedAt) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {session.attemptsCount}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {session.accuracy !== null ? (
                        <span
                          className={cn(
                            'font-medium',
                            session.accuracy >= 80
                              ? 'text-green-600 dark:text-green-400'
                              : session.accuracy >= 60
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-red-600 dark:text-red-400'
                          )}
                        >
                          {Math.round(session.accuracy)}%
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/study-sessions/${session.id}`}>
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
      )}
    </div>
  );
}

function ScopeCell({ scope }: { scope: string }) {
  const [expanded, setExpanded] = useState(false);
  const truncated = scope.length > 50;
  const displayText = expanded || !truncated ? scope : `${scope.slice(0, 50)}…`;

  return (
    <div className="group relative">
      <p className="text-slate-600 dark:text-slate-400">
        {displayText}
        {truncated && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-1 text-xs text-violet-600 hover:underline dark:text-violet-400"
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </p>
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

function StudySessionsSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
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
