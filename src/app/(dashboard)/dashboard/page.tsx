'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Mic, Trophy, BookOpen, Clock, ArrowRight, Zap, type LucideIcon } from 'lucide-react';

import { api } from '@/trpc/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = api.progress.getOverview.useQuery();
  const { data: user } = api.user.getProfile.useQuery();

  if (statsLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Dashboard
          </h2>
          <p className="text-muted-foreground mt-1">
            Welcome back, {user?.name?.split(' ')[0] || 'Teacher'}! Ready to explain something new?
          </p>
        </div>
        <Link href="/explain">
          <Button size="lg" className="shadow-md">
            <Mic className="mr-2 h-4 w-4" />
            New Explanation
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Quizzes"
          value={stats?.stats.totalQuizzes || 0}
          icon={BookOpen}
          description="Quizzes completed"
          color="text-blue-500"
        />
        <StatsCard
          title="Avg. Score"
          value={`${Math.round(stats?.stats.averageScore || 0)}%`}
          icon={Trophy}
          description="Overall performance"
          color="text-yellow-500"
        />
        <StatsCard
          title="Current Streak"
          value={`${stats?.stats.streak.current || 0} Days`}
          icon={Zap}
          description="Keep it up!"
          color="text-orange-500"
        />
        <StatsCard
          title="Study Time"
          value="2h 15m"
          icon={Clock}
          description="This week"
          color="text-green-500"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-slate-200 shadow-sm dark:border-slate-800">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest explanations and quiz results.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {stats?.activityHistory.length === 0 ? (
                <div className="text-muted-foreground flex flex-col items-center justify-center py-8 text-center">
                  <p className="mb-2">No activity yet</p>
                  <Link href="/explain">
                    <Button variant="link">Start your first explanation</Button>
                  </Link>
                </div>
              ) : (
                stats?.activityHistory.map((activity, index) => (
                  <div key={index} className="flex items-center">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border bg-slate-50 dark:bg-slate-900">
                      <Trophy className="h-4 w-4 text-violet-500" />
                    </div>
                    <div className="ml-4 space-y-1">
                      <p className="text-sm leading-none font-medium">Completed Quiz</p>
                      <p className="text-muted-foreground text-xs">
                        {activity.topic || 'Unknown Topic'}
                      </p>
                    </div>
                    <div className="ml-auto font-medium">+{Math.round(activity.score)}%</div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 border-none border-slate-200 bg-linear-to-br from-violet-500 to-indigo-600 text-white shadow-sm dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Start Explain2Win</CardTitle>
            <CardDescription className="text-violet-100">
              The best way to learn is to teach. Explain a concept and let AI test your
              understanding.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-white/10 p-4 backdrop-blur-sm">
              <p className="mb-1 text-sm font-semibold">💡 Daily Tip</p>
              <p className="text-xs text-violet-100">
                Explaining concepts out loud improves retention by 50% compared to just reading.
              </p>
            </div>
            <Link href="/explain" className="block">
              <Button
                variant="secondary"
                className="w-full border-none bg-white text-violet-600 hover:bg-slate-100"
              >
                Try it now <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  color,
}: {
  title: string;
  value: ReactNode;
  icon: LucideIcon;
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

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-50" />
          <Skeleton className="h-4 w-75" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-30 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Skeleton className="col-span-4 h-75 rounded-xl" />
        <Skeleton className="col-span-3 h-75 rounded-xl" />
      </div>
    </div>
  );
}
