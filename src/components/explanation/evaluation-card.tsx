'use client';

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { Target } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface EvaluationScores {
  correctness: number | null;
  clarity: number | null;
  depth: number | null;
  relevance: number | null;
  structure: number | null;
}

interface EvaluationCardProps {
  scores: EvaluationScores;
  overallScore: number | null;
  shortFeedback?: string | null;
  className?: string;
}

const DIMENSION_COLORS = {
  Correctness: '#8b5cf6',
  Clarity: '#06b6d4',
  Depth: '#10b981',
  Relevance: '#f59e0b',
  Structure: '#ec4899',
};

export function EvaluationCard({
  scores,
  overallScore,
  shortFeedback,
  className,
}: EvaluationCardProps) {
  const evaluationData = [
    { name: 'Correctness', value: scores.correctness ?? 0, fill: DIMENSION_COLORS.Correctness },
    { name: 'Clarity', value: scores.clarity ?? 0, fill: DIMENSION_COLORS.Clarity },
    { name: 'Depth', value: scores.depth ?? 0, fill: DIMENSION_COLORS.Depth },
    { name: 'Relevance', value: scores.relevance ?? 0, fill: DIMENSION_COLORS.Relevance },
    { name: 'Structure', value: scores.structure ?? 0, fill: DIMENSION_COLORS.Structure },
  ];

  return (
    <div className={cn('space-y-4', className)}>
      {/* Overall Score Badge */}
      {overallScore !== null && (
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'inline-flex items-center rounded-full px-4 py-1.5 text-lg font-bold',
              overallScore >= 9
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                : overallScore >= 7
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
            )}
          >
            {overallScore.toFixed(1)}/10
          </span>
          <span className="text-muted-foreground text-sm">Overall Score</span>
        </div>
      )}

      {/* Chart Card */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-violet-500" />
            Evaluation Breakdown
          </CardTitle>
          <CardDescription>Performance across the five key dimensions.</CardDescription>
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

          {/* Dimension Legend */}
          <div className="mt-4 flex flex-wrap gap-3">
            {evaluationData.map((dim) => (
              <div key={dim.name} className="flex items-center gap-1.5 text-xs">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: dim.fill }}
                />
                <span className="text-slate-600 dark:text-slate-300">{dim.name}</span>
                <span className="font-medium">{dim.value}/10</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Short Feedback */}
      {shortFeedback && (
        <Card className="border-l-4 border-l-violet-500 shadow-sm">
          <CardContent className="py-4">
            <p className="text-lg leading-relaxed text-slate-700 dark:text-slate-200">
              {shortFeedback}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
