'use client';

import { cn } from '@/lib/utils';
import { calculateDelta, getDeltaType } from '@/lib/attempt-comparison-utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ScoreDeltaBadgeProps {
  current: number | null;
  previous: number | null;
  className?: string;
}

/**
 * ScoreDeltaBadge
 *
 * Displays the change in score from the previous attempt.
 * Shows a colored badge with an arrow indicating improvement or decline.
 */
export function ScoreDeltaBadge({ current, previous, className }: ScoreDeltaBadgeProps) {
  const delta = calculateDelta(current, previous);
  const type = getDeltaType(delta);

  if (type === 'none') {
    return null;
  }

  const config = {
    positive: {
      icon: TrendingUp,
      bgClass: 'bg-emerald-100 dark:bg-emerald-900/30',
      textClass: 'text-emerald-700 dark:text-emerald-300',
      prefix: '+',
    },
    negative: {
      icon: TrendingDown,
      bgClass: 'bg-red-100 dark:bg-red-900/30',
      textClass: 'text-red-700 dark:text-red-300',
      prefix: '',
    },
    neutral: {
      icon: Minus,
      bgClass: 'bg-slate-100 dark:bg-slate-800',
      textClass: 'text-slate-500 dark:text-slate-400',
      prefix: '',
    },
  }[type];

  const Icon = config.icon;

  return (
    <span
      className={cn(
        'ml-1 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
        config.bgClass,
        config.textClass,
        className
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {type === 'neutral' ? '0' : `${config.prefix}${delta}`}
    </span>
  );
}
