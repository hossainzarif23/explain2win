'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import type { ComponentType, ReactNode } from 'react';
import { Trophy, TrendingUp, Calendar, Target } from 'lucide-react';

import { api } from '@/trpc/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProgressPage() {
  const { data: stats, isLoading } = api.progress.getOverview.useQuery();

  if (isLoading) {
    return <ProgressSkeleton />;
  }

  // Transform topic performance for chart
  const chartData =
    stats?.topicPerformance.map((item) => ({
      topic: item.topic,
      score: Math.round(item.averageScore),
      quizzes: item.count,
    })) || [];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Your Progress
        </h2>
        <p className="text-muted-foreground mt-1">
          Track your learning journey and mastery over time.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total XP"
          value={(stats?.stats.totalCorrectAnswers || 0) * 10}
          icon={TrendingUp}
          description="Based on correct answers"
        />
        <StatsCard
          title="Quizzes Taken"
          value={stats?.stats.totalQuizzes || 0}
          icon={Calendar}
          description="Total sessions"
        />
        <StatsCard
          title="Accuracy"
          value={`${Math.round(stats?.stats.averageScore || 0)}%`}
          icon={Target}
          description="Average score"
        />
        <StatsCard
          title="Best Streak"
          value={`${stats?.stats.streak.longest || 0} Days`}
          icon={Trophy}
          description="Personal record"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Topic Mastery</CardTitle>
            <CardDescription>Average score per topic you&apos;ve explained.</CardDescription>
          </CardHeader>
          <CardContent className="pl-0">
            <div className="h-87.5 w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis dataKey="topic" type="category" width={100} tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: 'none',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                      cursor={{ fill: 'transparent' }}
                    />
                    <Bar
                      dataKey="score"
                      fill="#8b5cf6"
                      radius={[0, 4, 4, 0]}
                      barSize={20}
                      name="Avg. Score (%)"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-muted-foreground flex h-full items-center justify-center">
                  No data available. Take a quiz to see stats!
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Detailed history of your recent sessions.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {stats?.activityHistory.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-500 dark:bg-slate-800">
                      {Math.round(activity.score)}
                    </div>
                    <div>
                      <p className="font-medium">{activity.topic}</p>
                      <p className="text-muted-foreground text-xs">
                        {new Date(activity.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        activity.score >= 80
                          ? 'bg-green-100 text-green-800'
                          : activity.score >= 60
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {activity.score >= 80
                        ? 'Mastered'
                        : activity.score >= 60
                          ? 'Good'
                          : 'Needs Practice'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
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
}: {
  title: string;
  value: ReactNode;
  icon: ComponentType<{ className?: string }>;
  description: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="text-muted-foreground h-4 w-4" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-muted-foreground text-xs">{description}</p>
      </CardContent>
    </Card>
  );
}

function ProgressSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-9 w-50" />
        <Skeleton className="h-4 w-75" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-30" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-100" />
        <Skeleton className="h-100" />
      </div>
    </div>
  );
}
