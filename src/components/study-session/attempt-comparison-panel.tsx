'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  FileText,
  Sparkles,
  AlertTriangle,
  Loader2,
  Volume2,
  Zap,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { api } from '@/trpc/react';

type AttemptData = {
  id: string;
  attemptNumber: number;
  transcription: string;
  audioUrl: string | null;
  createdAt: Date;
  evalCorrectness: number | null;
  evalClarity: number | null;
  evalDepth: number | null;
  evalRelevance: number | null;
  evalStructure: number | null;
};

interface AttemptComparisonPanelProps {
  attemptA: AttemptData;
  attemptB: AttemptData;
  onClose: () => void;
  className?: string;
}

/**
 * AttemptComparisonPanel
 *
 * Shows side-by-side transcriptions with audio playback.
 * Allows user to generate AI-powered comparison analysis (1 credit).
 */
export function AttemptComparisonPanel({
  attemptA,
  attemptB,
  onClose,
  className,
}: AttemptComparisonPanelProps) {
  // Determine which is earlier/later
  const [earlier, later] =
    attemptA.attemptNumber < attemptB.attemptNumber
      ? [attemptA, attemptB]
      : [attemptB, attemptA];

  // Fetch existing comparison (if cached)
  const { data, isLoading: isLoadingComparison } = api.comparison.getComparison.useQuery({
    earlierAttemptId: earlier.id,
    laterAttemptId: later.id,
  });

  // Generate comparison mutation
  const generateMutation = api.comparison.generateComparison.useMutation({
    onSuccess: (result) => {
      if (result.creditCharged) {
        toast.success('Analysis generated! 1 credit used.');
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const comparison = data?.comparison ?? (generateMutation.data || null);
  const hasComparison = !!comparison;

  const handleGenerate = () => {
    generateMutation.mutate({
      earlierAttemptId: earlier.id,
      laterAttemptId: later.id,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={className}
    >
      <Card className="border-2 border-violet-200 shadow-xl dark:border-violet-800">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Compare Attempts</CardTitle>
              <p className="text-sm text-slate-500">
                Attempt #{earlier.attemptNumber} → Attempt #{later.attemptNumber}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Side-by-Side Transcriptions with Audio */}
          <div className="grid gap-4 md:grid-cols-2">
            <TranscriptionCard
              label={`Attempt #${earlier.attemptNumber}`}
              transcription={earlier.transcription}
              audioUrl={data?.earlier?.presignedAudioUrl ?? null}
              createdAt={earlier.createdAt}
              isEarlier
            />
            <TranscriptionCard
              label={`Attempt #${later.attemptNumber}`}
              transcription={later.transcription}
              audioUrl={data?.later?.presignedAudioUrl ?? null}
              createdAt={later.createdAt}
              isEarlier={false}
            />
          </div>

          {/* Generate Analysis Button (if no cached comparison) */}
          {!hasComparison && !isLoadingComparison && (
            <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-900/50">
              <Zap className="h-8 w-8 text-amber-500" />
              <div className="text-center">
                <p className="font-medium text-slate-700 dark:text-slate-300">
                  Generate AI Analysis
                </p>
                <p className="text-sm text-slate-500">
                  Identify new concepts, missing concepts, and understand score changes
                </p>
              </div>
              <Button
                onClick={handleGenerate}
                disabled={generateMutation.isPending}
                className="gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Analysis (1 Credit)
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Loading state */}
          {(isLoadingComparison || generateMutation.isPending) && !comparison && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
            </div>
          )}

          {/* Comparison Results */}
          {hasComparison && (
            <div className="space-y-4">
              {/* Summary */}
              {comparison.summary && (
                <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-900/50">
                  <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    {comparison.summary}
                  </p>
                </div>
              )}

              {/* New Concepts */}
              {comparison.newConcepts && comparison.newConcepts.length > 0 && (
                <ConceptsSection
                  title="New Concepts"
                  subtitle={`Added in Attempt #${later.attemptNumber}`}
                  concepts={comparison.newConcepts}
                  icon={<TrendingUp className="h-4 w-4" />}
                  colorClass="emerald"
                />
              )}

              {/* Missing Concepts */}
              {comparison.missingConcepts && comparison.missingConcepts.length > 0 && (
                <ConceptsSection
                  title="Missing Concepts"
                  subtitle={`Present in Attempt #${earlier.attemptNumber} but not later`}
                  concepts={comparison.missingConcepts}
                  icon={<AlertTriangle className="h-4 w-4" />}
                  colorClass="amber"
                />
              )}

              {/* Dimension Analysis */}
              {comparison.dimensionAnalysis &&
                Object.keys(comparison.dimensionAnalysis).length > 0 && (
                  <div className="space-y-3">
                    <h4 className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                      <TrendingUp className="h-4 w-4 text-violet-500" />
                      Score Changes Explained
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(comparison.dimensionAnalysis).map(([dim, explanation]) => (
                        <DimensionRow
                          key={dim}
                          dimension={dim}
                          explanation={explanation as string}
                          earlierScore={earlier[`eval${capitalize(dim)}` as keyof AttemptData] as number | null}
                          laterScore={later[`eval${capitalize(dim)}` as keyof AttemptData] as number | null}
                        />
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function TranscriptionCard({
  label,
  transcription,
  audioUrl,
  createdAt,
  isEarlier,
}: {
  label: string;
  transcription: string;
  audioUrl: string | null;
  createdAt: Date;
  isEarlier: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'text-sm font-medium',
            isEarlier ? 'text-slate-500' : 'text-violet-600 dark:text-violet-400'
          )}
        >
          {label}
        </span>
        <span className="text-xs text-slate-400">{formatDate(createdAt)}</span>
      </div>

      {/* Audio Player */}
      {audioUrl && (
        <div className="flex items-center gap-2 rounded-lg bg-slate-100 p-2 dark:bg-slate-800">
          <Volume2 className="h-4 w-4 text-slate-500" />
          <audio controls src={audioUrl} className="h-8 w-full">
            Your browser does not support audio playback.
          </audio>
        </div>
      )}

      {/* Transcription */}
      <div className="max-h-60 overflow-y-auto rounded-lg border bg-white p-4 text-sm leading-relaxed text-slate-700 dark:bg-slate-950 dark:text-slate-300">
        {transcription}
      </div>
    </div>
  );
}

function ConceptsSection({
  title,
  subtitle,
  concepts,
  icon,
  colorClass,
}: {
  title: string;
  subtitle: string;
  concepts: string[];
  icon: React.ReactNode;
  colorClass: 'emerald' | 'amber';
}) {
  const colors = {
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      text: 'text-emerald-700 dark:text-emerald-300',
      badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-800/50 dark:text-emerald-200',
    },
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      text: 'text-amber-700 dark:text-amber-300',
      badge: 'bg-amber-100 text-amber-800 dark:bg-amber-800/50 dark:text-amber-200',
    },
  };

  const c = colors[colorClass];

  return (
    <div className={cn('rounded-lg p-4', c.bg)}>
      <div className={cn('mb-2 flex items-center gap-2 text-sm font-medium', c.text)}>
        {icon}
        {title}
      </div>
      <p className="mb-3 text-xs text-slate-500">{subtitle}</p>
      <div className="flex flex-wrap gap-2">
        {concepts.map((concept, idx) => (
          <span key={idx} className={cn('rounded-full px-3 py-1 text-xs font-medium', c.badge)}>
            {concept}
          </span>
        ))}
      </div>
    </div>
  );
}

function DimensionRow({
  dimension,
  explanation,
  earlierScore,
  laterScore,
}: {
  dimension: string;
  explanation: string;
  earlierScore: number | null;
  laterScore: number | null;
}) {
  const delta =
    earlierScore !== null && laterScore !== null ? laterScore - earlierScore : null;
  const isPositive = delta !== null && delta > 0;

  return (
    <div className="rounded-lg border bg-white p-3 dark:bg-slate-900">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-medium capitalize text-slate-700 dark:text-slate-300">
          {dimension}
        </span>
        {delta !== null && (
          <span
            className={cn(
              'flex items-center gap-1 text-xs font-medium',
              isPositive ? 'text-emerald-600' : 'text-red-600'
            )}
          >
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {isPositive ? '+' : ''}
            {delta}
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500">{explanation}</p>
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Re-export with old name for backwards compatibility
export { AttemptComparisonPanel as TranscriptionDiffPanel };
