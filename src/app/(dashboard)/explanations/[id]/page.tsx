'use client';

import { use } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Brain,
  Calendar,
  CheckCircle2,
  Clock,
  Lightbulb,
  MessageSquare,
  Mic,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  XCircle,
  Zap,
} from 'lucide-react';

import { api } from '@/trpc/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { AudioPlayer } from '@/components/audio/audio-player';
import { cn } from '@/lib/utils';

type PageParams = { id: string };

export default function ExplanationDetailPage({ params }: { params: Promise<PageParams> }) {
  const { id } = use(params);

  const { data: explanation, isLoading } = api.explanation.getById.useQuery({ id });

  if (isLoading) {
    return <ExplanationDetailSkeleton />;
  }

  if (!explanation) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <XCircle className="h-8 w-8 text-slate-400" />
          </div>
          <p className="text-muted-foreground">Explanation not found.</p>
          <Link href="/study-sessions">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Study Sessions
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  const studySessionId = explanation.studySessionId;
  const score = explanation.evalOverallScore ?? 0;
  const scorePercent = (score / 10) * 100;

  const strengths = Array.isArray(explanation.evalStrengths)
    ? (explanation.evalStrengths as string[])
    : [];
  const improvements = Array.isArray(explanation.evalImprovements)
    ? (explanation.evalImprovements as string[])
    : [];
  const missingConcepts = Array.isArray(explanation.evalMissingConcepts)
    ? (explanation.evalMissingConcepts as string[])
    : [];
  const learningObjectives = Array.isArray(explanation.evalLearningObjectives)
    ? (explanation.evalLearningObjectives as string[])
    : [];

  const getScoreColor = () => {
    if (score >= 9) return 'from-green-500 to-emerald-600';
    if (score >= 7) return 'from-amber-500 to-orange-600';
    return 'from-violet-500 to-fuchsia-600';
  };

  const getScoreBg = () => {
    if (score >= 9) return 'bg-green-500';
    if (score >= 7) return 'bg-amber-500';
    return 'bg-violet-500';
  };

  const dimensions = [
    { key: 'correctness', label: 'Correctness', value: explanation.evalCorrectness, icon: CheckCircle2 },
    { key: 'clarity', label: 'Clarity', value: explanation.evalClarity, icon: Sparkles },
    { key: 'depth', label: 'Depth', value: explanation.evalDepth, icon: Brain },
    { key: 'relevance', label: 'Relevance', value: explanation.evalRelevance, icon: Target },
    { key: 'structure', label: 'Structure', value: explanation.evalStructure, icon: TrendingUp },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-4">
      {/* Breadcrumbs */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Breadcrumbs
          items={[
            { label: 'Study Sessions', href: '/study-sessions' },
            { label: explanation.studySession?.topic ?? 'Session', href: `/study-sessions/${studySessionId}` },
            { label: `Attempt #${explanation.attemptNumber}` },
          ]}
        />
      </motion.div>

      {/* Hero Score Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="overflow-hidden border-0 shadow-2xl">
          <div className={cn('relative bg-gradient-to-br p-6 text-white sm:p-8', getScoreColor())}>
            {/* Background decoration */}
            <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-white/10 blur-3xl" />

            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              {/* Left: Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                    <Brain className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white/80">Attempt #{explanation.attemptNumber}</p>
                    <h2 className="text-xl font-bold sm:text-2xl">
                      {explanation.studySession?.topic ?? 'Explanation'}
                    </h2>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-white/80">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDateTime(explanation.createdAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {formatDuration(explanation.duration)}
                  </span>
                </div>
              </div>

              {/* Right: Score */}
              <div className="flex items-center gap-4">
                <div className="relative h-24 w-24 sm:h-28 sm:w-28">
                  {/* Circle background */}
                  <svg className="h-full w-full -rotate-90">
                    <circle
                      cx="50%"
                      cy="50%"
                      r="45%"
                      fill="none"
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth="8"
                    />
                    <motion.circle
                      cx="50%"
                      cy="50%"
                      r="45%"
                      fill="none"
                      stroke="white"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 45}`}
                      initial={{ strokeDashoffset: 2 * Math.PI * 45 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 45 * (1 - scorePercent / 100) }}
                      transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black sm:text-4xl">{score.toFixed(1)}</span>
                    <span className="text-xs text-white/70">out of 10</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dimension Scores */}
          <div className="grid grid-cols-5 divide-x divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950">
            {dimensions.map((dim, idx) => {
              const Icon = dim.icon;
              const value = dim.value ?? 0;
              return (
                <motion.div
                  key={dim.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + idx * 0.1 }}
                  className="flex flex-col items-center gap-1 py-4"
                >
                  <Icon className="h-4 w-4 text-slate-400" />
                  <span className="text-lg font-bold text-slate-900 dark:text-slate-100 sm:text-xl">
                    {value}
                  </span>
                  <span className="text-[10px] text-slate-500 sm:text-xs">{dim.label}</span>
                </motion.div>
              );
            })}
          </div>
        </Card>
      </motion.div>

      {/* Short Feedback */}
      {explanation.evalShortFeedback && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-0 bg-gradient-to-br from-slate-50 to-slate-100 shadow-lg dark:from-slate-900 dark:to-slate-950">
            <CardContent className="flex items-start gap-4 py-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400">
                  AI Summary
                </p>
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  {explanation.evalShortFeedback}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Feedback Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid gap-4 md:grid-cols-2"
      >
        {/* Strengths */}
        {strengths.length > 0 && (
          <Card className="overflow-hidden border-0 shadow-lg">
            <div className="h-1 bg-gradient-to-r from-green-500 to-emerald-500" />
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                Strengths
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2">
                {strengths.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Improvements */}
        {improvements.length > 0 && (
          <Card className="overflow-hidden border-0 shadow-lg">
            <div className="h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                Areas to Improve
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2">
                {improvements.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Missing Concepts */}
        {missingConcepts.length > 0 && (
          <Card className="overflow-hidden border-0 shadow-lg">
            <div className="h-1 bg-gradient-to-r from-red-500 to-rose-500" />
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                  <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                Missing Concepts
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2">
                {missingConcepts.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Learning Objectives */}
        {learningObjectives.length > 0 && (
          <Card className="overflow-hidden border-0 shadow-lg">
            <div className="h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                Learning Objectives
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2">
                {learningObjectives.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* Audio & Transcription */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="overflow-hidden border-0 shadow-lg">
          <div className="h-1 bg-gradient-to-r from-violet-500 to-fuchsia-500" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
                <Mic className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              Your Explanation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {explanation.audioUrl && (
              <AudioPlayer src={explanation.audioUrl} duration={explanation.duration} />
            )}
            <div className="rounded-xl border bg-slate-50 p-4 text-sm leading-relaxed whitespace-pre-wrap text-slate-700 dark:bg-slate-900 dark:text-slate-300">
              {explanation.transcription}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Detailed Feedback */}
      {explanation.evalDetailedFeedback && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="overflow-hidden border-0 shadow-lg">
            <div className="h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                  <MessageSquare className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                Detailed Feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-slate dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                {explanation.evalDetailedFeedback}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Quiz Link */}
      {explanation.quizSession && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="overflow-hidden border-0 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 text-white shadow-2xl">
            <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 shadow-lg">
                  <Trophy className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-lg font-bold">Quiz Results</p>
                  <p className="text-sm text-violet-100">
                    Score: {explanation.quizSession.score !== null ? `${Math.round(explanation.quizSession.score)}%` : 'Not completed'} •{' '}
                    {explanation.quizSession.correctAnswers}/{explanation.quizSession.totalQuestions} correct
                  </p>
                </div>
              </div>
              <Link href={`/quiz/${explanation.quizSession.id}`}>
                <Button
                  size="lg"
                  className="gap-2 bg-white font-semibold text-violet-600 shadow-lg hover:bg-slate-100"
                >
                  <BookOpen className="h-4 w-4" />
                  View Quiz
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Navigation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="flex justify-between pt-4"
      >
        <Link href={`/study-sessions/${studySessionId}`}>
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Session
          </Button>
        </Link>
        {explanation.studySession?.status === 'ACTIVE' && (
          <Link href={`/explain?studySessionId=${studySessionId}`}>
            <Button className="gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-lg">
              <Zap className="h-4 w-4" />
              Next Attempt
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </motion.div>
    </div>
  );
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
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function ExplanationDetailSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 py-4">
      <Skeleton className="h-4 w-64" />
      <Skeleton className="h-48 rounded-2xl" />
      <Skeleton className="h-20 rounded-2xl" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}
