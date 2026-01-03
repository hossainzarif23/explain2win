'use client';

import { use, useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  ChevronRight,
  Clock,
  GitCompare,
  Target,
  TrendingUp,
  Trophy,
} from 'lucide-react';

import { api } from '@/trpc/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { cn } from '@/lib/utils';
import {
  AttemptRadarChart,
  AttemptComparisonPanel,
  ScoreDeltaBadge,
} from '@/components/study-session';

type PageParams = { id: string };

type Explanation = {
  id: string;
  attemptNumber: number;
  topic: string;
  duration: number;
  transcription: string;
  evalOverallScore: number | null;
  evalCorrectness: number | null;
  evalClarity: number | null;
  evalDepth: number | null;
  evalRelevance: number | null;
  evalStructure: number | null;
  createdAt: Date;
  quizSession: {
    id: string;
    completedAt: Date | null;
    score: number | null;
    totalQuestions: number;
    correctAnswers: number;
  } | null;
};

export default function StudySessionDetailPage({ params }: { params: Promise<PageParams> }) {
  const { id } = use(params);

  const { data: session, isLoading } = api.studySession.getByIdWithDetails.useQuery({ id });

  // State for comparison features
  const [selectedAttemptIds, setSelectedAttemptIds] = useState<Set<string>>(new Set());
  const [showComparisonPanel, setShowComparisonPanel] = useState(false);

  // Memoized sorted explanations for easy access to previous attempt
  const sortedExplanations = useMemo(() => {
    if (!session?.explanations) return [];
    return [...session.explanations].sort((a, b) => a.attemptNumber - b.attemptNumber);
  }, [session?.explanations]);

  // Get previous attempt for delta calculation
  const getPreviousAttempt = (attemptNumber: number): Explanation | undefined => {
    const index = sortedExplanations.findIndex((e) => e.attemptNumber === attemptNumber);
    return index > 0 ? sortedExplanations[index - 1] : undefined;
  };

  // Handle checkbox toggle
  const toggleAttemptSelection = (id: string) => {
    setSelectedAttemptIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 2) {
        next.add(id);
      }
      return next;
    });
  };

  // Get selected attempts for comparison
  const selectedAttemptsArray = useMemo(
    () => sortedExplanations.filter((e) => selectedAttemptIds.has(e.id)),
    [sortedExplanations, selectedAttemptIds]
  );

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

      {/* Radar Chart for Score Comparison */}
      {sortedExplanations.length > 0 && (
        <AttemptRadarChart
          attempts={sortedExplanations}
          selectedAttemptNumbers={
            selectedAttemptsArray.length > 0
              ? selectedAttemptsArray.map((a) => a.attemptNumber)
              : undefined
          }
        />
      )}

      {/* Compare Button */}
      <AnimatePresence>
        {selectedAttemptIds.size === 2 && !showComparisonPanel && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex justify-center"
          >
            <Button
              onClick={() => setShowComparisonPanel(true)}
              className="gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700"
            >
              <GitCompare className="h-4 w-4" />
              Compare Selected Attempts
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comparison Panel */}
      <AnimatePresence>
        {showComparisonPanel && selectedAttemptsArray.length === 2 && (
          <AttemptComparisonPanel
            attemptA={selectedAttemptsArray[0]}
            attemptB={selectedAttemptsArray[1]}
            onClose={() => {
              setShowComparisonPanel(false);
              setSelectedAttemptIds(new Set());
            }}
          />
        )}
      </AnimatePresence>

      <Card className="overflow-hidden shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Explanation Attempts</CardTitle>
              <CardDescription>
                Track your progress through each explanation attempt.
                {sortedExplanations.length >= 2 && (
                  <span className="ml-2 text-violet-600 dark:text-violet-400">
                    Select 2 attempts to compare.
                  </span>
                )}
              </CardDescription>
            </div>
            {selectedAttemptIds.size > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedAttemptIds(new Set())}
              >
                Clear Selection
              </Button>
            )}
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50/50 dark:bg-slate-900/50">
                {sortedExplanations.length >= 2 && (
                  <th className="w-10 px-4 py-3">
                    <span className="sr-only">Select</span>
                  </th>
                )}
                <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">
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
              {sortedExplanations.map((explanation: Explanation) => {
                const previousAttempt = getPreviousAttempt(explanation.attemptNumber);
                const isSelected = selectedAttemptIds.has(explanation.id);

                return (
                  <tr
                    key={explanation.id}
                    className={cn(
                      'border-b transition-colors',
                      isSelected
                        ? 'bg-violet-50/50 dark:bg-violet-900/20'
                        : 'hover:bg-slate-50/50 dark:hover:bg-slate-900/30'
                    )}
                  >
                    {sortedExplanations.length >= 2 && (
                      <td className="px-4 py-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleAttemptSelection(explanation.id)}
                          disabled={!isSelected && selectedAttemptIds.size >= 2}
                        />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">#{explanation.attemptNumber}</span>
                        <span className="text-xs text-slate-400">
                          {formatDate(explanation.createdAt)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center">
                        <ScoreBadge score={explanation.evalOverallScore} max={10} />
                        <ScoreDeltaBadge
                          current={explanation.evalOverallScore}
                          previous={previousAttempt?.evalOverallScore ?? null}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center">
                        <ScoreBadge score={explanation.evalCorrectness} max={10} />
                        <ScoreDeltaBadge
                          current={explanation.evalCorrectness}
                          previous={previousAttempt?.evalCorrectness ?? null}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center">
                        <ScoreBadge score={explanation.evalClarity} max={10} />
                        <ScoreDeltaBadge
                          current={explanation.evalClarity}
                          previous={previousAttempt?.evalClarity ?? null}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center">
                        <ScoreBadge score={explanation.evalDepth} max={10} />
                        <ScoreDeltaBadge
                          current={explanation.evalDepth}
                          previous={previousAttempt?.evalDepth ?? null}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center">
                        <ScoreBadge score={explanation.evalRelevance} max={10} />
                        <ScoreDeltaBadge
                          current={explanation.evalRelevance}
                          previous={previousAttempt?.evalRelevance ?? null}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center">
                        <ScoreBadge score={explanation.evalStructure} max={10} />
                        <ScoreDeltaBadge
                          current={explanation.evalStructure}
                          previous={previousAttempt?.evalStructure ?? null}
                        />
                      </div>
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
                      <Link href={`/explanations/${explanation.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
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

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
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
      <Skeleton className="h-80 rounded-xl" />
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}
