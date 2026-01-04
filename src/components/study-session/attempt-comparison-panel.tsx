'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Sparkles,
  AlertTriangle,
  Loader2,
  Volume2,
  Zap,
  TrendingUp,
  TrendingDown,
  GitCompare,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950 shadow-2xl">
        {/* Premium Header */}
        <CardHeader className="border-b border-white/10 bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/25">
                <GitCompare className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Attempt Comparison</h3>
                <p className="text-sm text-violet-200">
                  Attempt #{earlier.attemptNumber} → Attempt #{later.attemptNumber}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-10 w-10 rounded-full text-white/70 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          {/* Side-by-Side Transcriptions with Audio */}
          <div className="grid gap-6 lg:grid-cols-2">
            <TranscriptionCard
              attemptNumber={earlier.attemptNumber}
              transcription={earlier.transcription}
              audioUrl={data?.earlier?.presignedAudioUrl ?? null}
              createdAt={earlier.createdAt}
              variant="earlier"
            />
            <TranscriptionCard
              attemptNumber={later.attemptNumber}
              transcription={later.transcription}
              audioUrl={data?.later?.presignedAudioUrl ?? null}
              createdAt={later.createdAt}
              variant="later"
            />
          </div>

          {/* Generate Analysis Button (if no cached comparison) */}
          {!hasComparison && !isLoadingComparison && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative overflow-hidden rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-900/50 to-fuchsia-900/50 p-8"
            >
              {/* Animated background glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 via-fuchsia-600/10 to-violet-600/10 animate-pulse" />
              
              <div className="relative flex flex-col items-center gap-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/25">
                  <Zap className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">
                    Unlock AI-Powered Insights
                  </h4>
                  <p className="mt-1 text-sm text-slate-300">
                    Discover new concepts learned, identify gaps, and understand your score changes
                  </p>
                </div>
                <Button
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending}
                  size="lg"
                  className="mt-2 gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-8 text-white shadow-lg shadow-violet-500/25 hover:from-violet-500 hover:to-fuchsia-500 hover:shadow-violet-500/40"
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Analyzing Your Progress...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      Generate Analysis (1 Credit)
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Loading state */}
          {(isLoadingComparison || generateMutation.isPending) && !comparison && (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
                <p className="text-sm text-slate-400">Analyzing your explanations...</p>
              </div>
            </div>
          )}

          {/* Comparison Results */}
          {hasComparison && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5"
            >
              {/* New Concepts */}
              {comparison.newConcepts && comparison.newConcepts.length > 0 && (
                <ConceptsSection
                  title="New Concepts"
                  subtitle={`Added in Attempt #${later.attemptNumber}`}
                  concepts={comparison.newConcepts}
                  icon={<CheckCircle2 className="h-5 w-5" />}
                  variant="success"
                />
              )}

              {/* Missing Concepts */}
              {comparison.missingConcepts && comparison.missingConcepts.length > 0 && (
                <ConceptsSection
                  title="Missing Concepts"
                  subtitle={`Present in Attempt #${earlier.attemptNumber} but not later`}
                  concepts={comparison.missingConcepts}
                  icon={<XCircle className="h-5 w-5" />}
                  variant="warning"
                />
              )}

              {/* Dimension Analysis */}
              {comparison.dimensionAnalysis &&
                Object.keys(comparison.dimensionAnalysis).length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20">
                        <TrendingUp className="h-4 w-4 text-violet-400" />
                      </div>
                      <h4 className="text-lg font-semibold text-white">
                        Score Changes Explained
                      </h4>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {Object.entries(comparison.dimensionAnalysis).map(([dim, explanation]) => (
                        <DimensionCard
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
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function TranscriptionCard({
  attemptNumber,
  transcription,
  audioUrl,
  createdAt,
  variant,
}: {
  attemptNumber: number;
  transcription: string;
  audioUrl: string | null;
  createdAt: Date;
  variant: 'earlier' | 'later';
}) {
  const isLater = variant === 'later';

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold',
              isLater
                ? 'bg-violet-500/20 text-violet-300'
                : 'bg-slate-700/50 text-slate-300'
            )}
          >
            Attempt #{attemptNumber}
          </span>
          {isLater && (
            <span className="text-xs font-medium text-emerald-400">Latest</span>
          )}
        </div>
        <span className="text-xs text-slate-400">{formatDate(createdAt)}</span>
      </div>

      {/* Audio Player */}
      {audioUrl && (
        <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-slate-800/50 p-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20">
            <Volume2 className="h-4 w-4 text-violet-400" />
          </div>
          <audio controls src={audioUrl} className="h-8 w-full [&::-webkit-media-controls-panel]:bg-slate-700">
            Your browser does not support audio playback.
          </audio>
        </div>
      )}

      {/* Transcription */}
      <div className="max-h-64 overflow-y-auto rounded-xl border border-white/5 bg-slate-800/30 p-4 text-sm leading-relaxed text-slate-200 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-700">
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
  variant,
}: {
  title: string;
  subtitle: string;
  concepts: string[];
  icon: React.ReactNode;
  variant: 'success' | 'warning';
}) {
  const styles = {
    success: {
      container: 'border-emerald-500/20 bg-emerald-950/30',
      header: 'text-emerald-400',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
    warning: {
      container: 'border-amber-500/20 bg-amber-950/30',
      header: 'text-amber-400',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
  };

  const s = styles[variant];

  return (
    <div className={cn('rounded-xl border p-5', s.container)}>
      <div className={cn('mb-1 flex items-center gap-2 font-semibold', s.header)}>
        {icon}
        {title}
      </div>
      <p className="mb-4 text-sm text-slate-400">{subtitle}</p>
      <div className="flex flex-wrap gap-2">
        {concepts.map((concept, idx) => (
          <span
            key={idx}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm font-medium',
              s.badge
            )}
          >
            {concept}
          </span>
        ))}
      </div>
    </div>
  );
}

function DimensionCard({
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
    <div className="rounded-xl border border-white/5 bg-slate-800/40 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold capitalize text-white">
          {dimension}
        </span>
        {delta !== null && (
          <span
            className={cn(
              'flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-bold',
              isPositive
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-red-500/20 text-red-400'
            )}
          >
            {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {isPositive ? '+' : ''}
            {delta}
          </span>
        )}
      </div>
      <p className="text-sm leading-relaxed text-slate-300">{explanation}</p>
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
