'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  Brain,
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  Mic,
  Plus,
  Sparkles,
  Target,
  Trophy,
  TrendingUp,
  Zap,
} from 'lucide-react';

import { api } from '@/trpc/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type ActiveSession = {
  id: string;
  topic: string;
  scopeStatement: string;
  currentAttempt: number;
  latestScore: number | null;
  masteryStreak: number;
  lastActivityAt: Date;
  createdAt: Date;
};

export default function DashboardPage() {
  const { data, isLoading } = api.dashboard.getDashboardData.useQuery();

  if (isLoading || !data) {
    return <DashboardSkeleton />;
  }

  const { user, stats, activeSessions, recentlyMastered, weeklyActivity } = data;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = user?.name?.split(' ')[0] || 'Learner';

  return (
    <div className="mx-auto max-w-7xl space-y-8 py-4">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="overflow-hidden border-0 bg-linear-to-br from-violet-600 via-purple-600 to-fuchsia-600 text-white shadow-2xl">
          <CardContent className="relative py-8">
            {/* Background decorations */}
            <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute top-0 right-0 h-full w-1/3 bg-linear-to-l from-white/5 to-transparent" />

            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 shadow-lg">
                    <Brain className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white/80">{getGreeting()}</p>
                    <h1 className="text-2xl font-bold sm:text-3xl">{firstName}! 👋</h1>
                  </div>
                </div>
                <p className="max-w-md text-sm text-white/80">
                  {activeSessions.length > 0
                    ? `You have ${activeSessions.length} active study session${activeSessions.length > 1 ? 's' : ''} waiting. Keep up the momentum!`
                    : 'Ready to master a new concept? Start a study session and teach to learn!'}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {activeSessions.length > 0 && (
                  <Link href={`/explain?studySessionId=${activeSessions[0].id}`}>
                    <Button
                      size="lg"
                      className="gap-2 bg-white font-semibold text-violet-600 shadow-lg hover:bg-slate-100"
                    >
                      <Zap className="h-4 w-4" />
                      Continue Learning
                    </Button>
                  </Link>
                )}
                <Link href="/explain">
                  <Button
                    size="lg"
                    variant="outline"
                    className="gap-2 border-white/30 bg-white/10 font-semibold text-white backdrop-blur hover:bg-white/20"
                  >
                    <Plus className="h-4 w-4" />
                    New Session
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatsCard
          title="Sessions Mastered"
          value={stats.completedSessions}
          icon={Trophy}
          description="Topics fully understood"
          linear="from-green-500 to-emerald-500"
          iconBg="bg-green-100 dark:bg-green-900/30"
          iconColor="text-green-600 dark:text-green-400"
        />
        <StatsCard
          title="In Progress"
          value={stats.activeSessions}
          icon={Target}
          description="Active study sessions"
          linear="from-violet-500 to-fuchsia-500"
          iconBg="bg-violet-100 dark:bg-violet-900/30"
          iconColor="text-violet-600 dark:text-violet-400"
        />
        <StatsCard
          title="Total Attempts"
          value={stats.totalExplanations}
          icon={Mic}
          description="Explanations recorded"
          linear="from-blue-500 to-cyan-500"
          iconBg="bg-blue-100 dark:bg-blue-900/30"
          iconColor="text-blue-600 dark:text-blue-400"
        />
        <StatsCard
          title="Mastery Rate"
          value={`${stats.masteryRate}%`}
          icon={TrendingUp}
          description="Session completion rate"
          linear="from-amber-500 to-orange-500"
          iconBg="bg-amber-100 dark:bg-amber-900/30"
          iconColor="text-amber-600 dark:text-amber-400"
        />
      </motion.div>

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
              <Target className="h-5 w-5 text-violet-500" />
              Active Study Sessions
            </h2>
            <Link href="/study-sessions" className="text-sm text-violet-600 hover:underline dark:text-violet-400">
              View all →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeSessions.slice(0, 6).map((session: ActiveSession, idx: number) => (
              <ActiveSessionCard key={session.id} session={session} index={idx} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Recently Mastered */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-4"
        >
          <Card className="overflow-hidden border-0 shadow-lg">
            <div className="h-1 bg-linear-to-r from-green-500 to-emerald-500" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                  <Trophy className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                Recently Mastered
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentlyMastered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                    <BookOpen className="h-8 w-8 text-slate-400" />
                  </div>
                  <p className="mb-2 text-sm text-slate-500">No mastered sessions yet</p>
                  <p className="text-xs text-slate-400">
                    Complete a study session to see it here!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentlyMastered.map((session) => (
                    <Link
                      key={session.id}
                      href={`/study-sessions/${session.id}`}
                      className="flex items-center gap-4 rounded-xl border bg-white p-4 transition-all hover:shadow-md dark:bg-slate-950"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30">
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                          {session.topic}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {session.completedAt
                              ? new Date(session.completedAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : 'N/A'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Mic className="h-3 w-3" />
                            {session.totalAttempts} attempt{session.totalAttempts !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Weekly Activity & Streak */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-6 lg:col-span-3"
        >
          {/* Streak Card */}
          <Card className="overflow-hidden border-0 shadow-lg">
            <div className="h-1 bg-linear-to-r from-orange-500 to-amber-500" />
            <CardContent className="py-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-orange-500 to-amber-500 text-white shadow-lg">
                  <Flame className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {stats.currentStreak}
                  </p>
                  <p className="text-sm text-slate-500">Day streak</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xs text-slate-500">Keep learning daily</p>
                  <p className="text-xs text-slate-500">to maintain your streak!</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Activity */}
          <Card className="overflow-hidden border-0 shadow-lg">
            <div className="h-1 bg-linear-to-r from-violet-500 to-fuchsia-500" />
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-violet-500" />
                This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between gap-2">
                {weeklyActivity.map((day, idx) => {
                  const maxExp = Math.max(...weeklyActivity.map((d) => d.explanations), 1);
                  const height = day.explanations > 0 ? (day.explanations / maxExp) * 100 : 8;
                  const dayName = new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' });
                  const isToday = idx === weeklyActivity.length - 1;

                  return (
                    <div key={day.date} className="flex flex-1 flex-col items-center gap-2">
                      <div className="relative flex h-20 w-full items-end justify-center">
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${height}%` }}
                          transition={{ delay: idx * 0.1, duration: 0.5 }}
                          className={cn(
                            'w-full max-w-8 rounded-t-md',
                            day.explanations > 0
                              ? 'bg-linear-to-t from-violet-500 to-fuchsia-500'
                              : 'bg-slate-200 dark:bg-slate-700'
                          )}
                        />
                      </div>
                      <span
                        className={cn(
                          'text-xs',
                          isToday
                            ? 'font-semibold text-violet-600 dark:text-violet-400'
                            : 'text-slate-500'
                        )}
                      >
                        {dayName}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Quick Tip */}
          <Card className="border-0 bg-linear-to-br from-slate-50 to-slate-100 shadow-lg dark:from-slate-900 dark:to-slate-950">
            <CardContent className="py-5">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
                  <Zap className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400">
                    Learning Tip
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Explaining concepts out loud improves retention by 50% compared to just reading.
                    Teach it to learn it!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  linear,
  iconBg,
  iconColor,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description: string;
  linear: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <Card className="overflow-hidden border-0 shadow-lg transition-shadow hover:shadow-xl">
      <div className={cn('h-1 bg-linear-to-r', linear)} />
      <CardContent className="pt-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</p>
            <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
            <p className="mt-1 text-xs text-slate-500">{description}</p>
          </div>
          <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', iconBg)}>
            <Icon className={cn('h-6 w-6', iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ActiveSessionCard({
  session,
  index,
}: {
  session: {
    id: string;
    topic: string;
    scopeStatement: string;
    currentAttempt: number;
    latestScore: number | null;
    masteryStreak: number;
    lastActivityAt: Date;
  };
  index: number;
}) {
  const scoreColor =
    session.latestScore !== null
      ? session.latestScore >= 9
        ? 'from-green-500 to-emerald-500'
        : session.latestScore >= 7
          ? 'from-amber-500 to-orange-500'
          : 'from-violet-500 to-fuchsia-500'
      : 'from-slate-400 to-slate-500';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.05 }}
    >
      <Link href={`/explain?studySessionId=${session.id}`}>
        <Card className="group overflow-hidden border-0 shadow-lg transition-all hover:shadow-xl hover:-translate-y-1">
          <div className={cn('h-1 bg-linear-to-r', scoreColor)} />
          <CardContent className="pt-5">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30">
                <Brain className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              {session.latestScore !== null && (
                <div
                  className={cn(
                    'rounded-full px-2.5 py-1 text-xs font-semibold text-white',
                    session.latestScore >= 9
                      ? 'bg-green-500'
                      : session.latestScore >= 7
                        ? 'bg-amber-500'
                        : 'bg-violet-500'
                  )}
                >
                  {session.latestScore.toFixed(1)}/10
                </div>
              )}
            </div>

            <h3 className="mb-1 truncate font-semibold text-slate-900 dark:text-slate-100">
              {session.topic}
            </h3>
            <p className="mb-3 line-clamp-2 text-xs text-slate-500">
              {session.scopeStatement}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Mic className="h-3 w-3" />
                  Attempt {session.currentAttempt}
                </span>
                <span className="flex items-center gap-1">
                  <Flame className="h-3 w-3 text-orange-500" />
                  {session.masteryStreak}/2
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1" />
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 py-4">
      <Skeleton className="h-40 rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-7">
        <Skeleton className="h-80 rounded-2xl lg:col-span-4" />
        <div className="space-y-6 lg:col-span-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
