/**
 * Attempt Comparison Utilities
 *
 * Helper functions for comparing explanation attempts within a Study Session.
 */

export type AttemptScores = {
  evalOverallScore: number | null;
  evalCorrectness: number | null;
  evalClarity: number | null;
  evalDepth: number | null;
  evalRelevance: number | null;
  evalStructure: number | null;
};

export type ChartDataPoint = {
  subject: string;
  fullMark: number;
  [key: string]: string | number;
};

/**
 * Calculate the delta between two scores.
 * Returns null if either score is null.
 */
export function calculateDelta(
  current: number | null,
  previous: number | null
): number | null {
  if (current === null || previous === null) {
    return null;
  }
  return Number((current - previous).toFixed(1));
}

/**
 * Get delta type for styling purposes.
 */
export function getDeltaType(delta: number | null): 'positive' | 'negative' | 'neutral' | 'none' {
  if (delta === null) return 'none';
  if (delta > 0) return 'positive';
  if (delta < 0) return 'negative';
  return 'neutral';
}

/**
 * Transform explanation attempts into chart-compatible data format.
 * Each data point represents one dimension (Correctness, Clarity, etc.)
 * with values for each attempt.
 */
export function transformToChartData<T extends AttemptScores & { attemptNumber: number }>(
  attempts: T[]
): ChartDataPoint[] {
  const dimensions = [
    { key: 'evalCorrectness', label: 'Correctness' },
    { key: 'evalClarity', label: 'Clarity' },
    { key: 'evalDepth', label: 'Depth' },
    { key: 'evalRelevance', label: 'Relevance' },
    { key: 'evalStructure', label: 'Structure' },
  ] as const;

  return dimensions.map((dim) => {
    const point: ChartDataPoint = {
      subject: dim.label,
      fullMark: 10,
    };

    attempts.forEach((attempt) => {
      const value = attempt[dim.key];
      point[`Attempt ${attempt.attemptNumber}`] = value ?? 0;
    });

    return point;
  });
}

/**
 * Generate a consistent color for an attempt number.
 * Uses a predefined palette that works well in both light and dark modes.
 */
export function getAttemptColor(attemptNumber: number): string {
  const colors = [
    '#8b5cf6', // violet-500
    '#06b6d4', // cyan-500
    '#f59e0b', // amber-500
    '#10b981', // emerald-500
    '#ef4444', // red-500
    '#ec4899', // pink-500
    '#6366f1', // indigo-500
    '#84cc16', // lime-500
  ];
  return colors[(attemptNumber - 1) % colors.length];
}

/**
 * Format a score for display.
 */
export function formatScore(score: number | null): string {
  if (score === null) return '-';
  return score % 1 !== 0 ? score.toFixed(1) : String(score);
}
