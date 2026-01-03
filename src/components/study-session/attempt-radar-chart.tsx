'use client';

import { useMemo } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  transformToChartData,
  getAttemptColor,
  type AttemptScores,
} from '@/lib/attempt-comparison-utils';

type Attempt = AttemptScores & {
  id: string;
  attemptNumber: number;
};

interface AttemptRadarChartProps {
  attempts: Attempt[];
  selectedAttemptNumbers?: number[];
  className?: string;
}

/**
 * AttemptRadarChart
 *
 * A multi-layer radar chart visualizing evaluation scores across multiple attempts.
 * Each attempt is rendered as a colored polygon, allowing easy comparison of
 * strengths and weaknesses across dimensions.
 */
export function AttemptRadarChart({
  attempts,
  selectedAttemptNumbers,
  className,
}: AttemptRadarChartProps) {
  // Filter to selected attempts, or show all if none selected
  const displayedAttempts = useMemo(() => {
    if (!selectedAttemptNumbers || selectedAttemptNumbers.length === 0) {
      // Show up to 4 most recent attempts by default
      return attempts.slice(-4);
    }
    return attempts.filter((a) => selectedAttemptNumbers.includes(a.attemptNumber));
  }, [attempts, selectedAttemptNumbers]);

  const chartData = useMemo(
    () => transformToChartData(displayedAttempts),
    [displayedAttempts]
  );

  if (attempts.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Score Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
              <PolarGrid
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-700"
              />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: 'currentColor', fontSize: 12 }}
                className="text-slate-600 dark:text-slate-400"
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 10]}
                tick={{ fill: 'currentColor', fontSize: 10 }}
                className="text-slate-400 dark:text-slate-500"
                tickCount={6}
              />
              {displayedAttempts.map((attempt) => (
                <Radar
                  key={attempt.id}
                  name={`Attempt ${attempt.attemptNumber}`}
                  dataKey={`Attempt ${attempt.attemptNumber}`}
                  stroke={getAttemptColor(attempt.attemptNumber)}
                  fill={getAttemptColor(attempt.attemptNumber)}
                  fillOpacity={0.15}
                  strokeWidth={2}
                  dot={{ r: 3, fill: getAttemptColor(attempt.attemptNumber) }}
                  animationDuration={500}
                  animationEasing="ease-out"
                />
              ))}
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--background)',
                  borderColor: 'var(--border)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
                labelStyle={{ fontWeight: 600, marginBottom: 4 }}
              />
              <Legend
                wrapperStyle={{ paddingTop: 16 }}
                formatter={(value) => (
                  <span className="text-sm text-slate-600 dark:text-slate-400">{value}</span>
                )}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
