'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mic, Square, Loader2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

import { api } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { AudioVisualizer } from '@/components/explain/audio-visualizer';

export default function ExplainPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studySessionIdFromUrl = searchParams.get('studySessionId');
  const [topic, setTopic] = useState('');
  const [scopeStatement, setScopeStatement] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeStudySessionId, setActiveStudySessionId] = useState<string | null>(null);
  const [explanationId, setExplanationId] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<{
    overall?: number | null;
    correctness?: number | null;
    clarity?: number | null;
    depth?: number | null;
    relevance?: number | null;
    structure?: number | null;
    shortFeedback?: string | null;
  } | null>(null);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const {
    isRecording,
    startRecording,
    stopRecording,
    mediaBlob,
    duration,
    stream,
    clearRecording,
  } = useAudioRecorder();

  // TRPC Mutations
  const resumeSessionQuery = api.studySession.getById.useQuery(
    { id: studySessionIdFromUrl ?? '' },
    { enabled: !!studySessionIdFromUrl }
  );

  const getOrCreateStudySessionMutation = api.studySession.getOrCreate.useMutation();
  const createExplanationMutation = api.explanation.create.useMutation();
  const generateQuizMutation = api.quiz.generate.useMutation();

  const isContinuingStudySession = !!studySessionIdFromUrl || !!activeStudySessionId;
  
  // URL params for pre-filling from Knowledge Graph
  const topicFromUrl = searchParams.get('topic');
  const scopeFromUrl = searchParams.get('scope');
  const fromGraph = searchParams.get('fromGraph') === 'true';

  // Pre-fill from URL params (when coming from Knowledge Graph)
  useEffect(() => {
    if (topicFromUrl && !topic.trim()) {
      setTopic(topicFromUrl);
    }
    if (scopeFromUrl && !scopeStatement.trim()) {
      setScopeStatement(scopeFromUrl);
    }
  }, [topicFromUrl, scopeFromUrl]);

  useEffect(() => {
    const session = resumeSessionQuery.data;
    if (!session) return;
    if (activeStudySessionId) return;

    setActiveStudySessionId(session.id);
    if (!topic.trim()) setTopic(session.topic);
    if (!scopeStatement.trim()) setScopeStatement(session.scopeStatement);
  }, [resumeSessionQuery.data, activeStudySessionId, topic, scopeStatement]);

  const handleStartRecording = async () => {
    if (!topic.trim()) {
      toast.error('Please enter a topic first');
      return;
    }
    if (!scopeStatement.trim()) {
      toast.error('Please enter a scope statement first');
      return;
    }
    await startRecording();
  };

  const handleStopRecording = () => {
    stopRecording();
  };

  const handleDiscard = () => {
    clearRecording();
    setExplanationId(null);
    setEvaluation(null);
  };

  const handleSubmit = async () => {
    if (!mediaBlob || !topic.trim() || !scopeStatement.trim()) return;
    setIsProcessing(true);
    setExplanationId(null);
    setEvaluation(null);

    try {
      // 1. Transcribe audio
      const transcribeFormData = new FormData();
      transcribeFormData.append('audio', mediaBlob, 'recording.webm');

      const transcribeResponse = await fetch('/api/transcribe', {
        method: 'POST',
        body: transcribeFormData,
      });

      if (!transcribeResponse.ok) {
        const payload = await transcribeResponse.json().catch(() => null);
        throw new Error(payload?.error || 'Transcription failed');
      }

      const { transcription } = (await transcribeResponse.json()) as {
        transcription: string;
      };

      // 2. Upload audio
      const uploadFormData = new FormData();
      uploadFormData.append('audio', mediaBlob, 'recording.webm');

      // In a real app, we'd upload specific file to S3 via presigned URL
      // For now, we assume the backend handles the audio buffer directly or we use a utility
      // Actually, we created /api/upload. Let's use it.

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      const { key } = await uploadResponse.json();

      // 3. Start/resume StudySession (Option B)
      const session = activeStudySessionId
        ? { id: activeStudySessionId }
        : await getOrCreateStudySessionMutation.mutateAsync({
            topic: topic.trim(),
            scopeStatement: scopeStatement.trim(),
          });
      if (!activeStudySessionId) setActiveStudySessionId(session.id);

      // 4. Create Explanation attempt record (and evaluate server-side)
      const explanation = await createExplanationMutation.mutateAsync({
        topic: topic.trim(),
        scopeStatement: scopeStatement.trim(),
        studySessionId: session.id,
        transcription,
        duration, // Use accurate timer duration from recording, not estimated from file size
        audioUrl: key, // Store S3 key, not signed URL (URLs expire)
      });

      setExplanationId(explanation.id);
      setEvaluation({
        overall: explanation.evalOverallScore ?? null,
        correctness: explanation.evalCorrectness ?? null,
        clarity: explanation.evalClarity ?? null,
        depth: explanation.evalDepth ?? null,
        relevance: explanation.evalRelevance ?? null,
        structure: explanation.evalStructure ?? null,
        shortFeedback: explanation.evalShortFeedback ?? null,
      });

      toast.success('Explanation evaluated. Review your score, then start the quiz.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed: ${message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartQuiz = async () => {
    if (!explanationId) return;

    setIsGeneratingQuiz(true);
    try {
      toast.info('Generating AI Quiz...');
      const { quizSession } = await generateQuizMutation.mutateAsync({
        explanationId,
        studentType: 'CURIOUS',
        questionCount: 5,
      });
      router.push(`/quiz/${quizSession.id}`);
    } catch (quizError: unknown) {
      const message = quizError instanceof Error ? quizError.message : 'Unknown error';
      toast.error(`Quiz generation failed: ${message}`);
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Explain a Topic
        </h2>
        <p className="text-muted-foreground mt-1">
          Teach it to learn it. Record your explanation, and we&apos;ll test your knowledge.
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>1. Check Topic</CardTitle>
            <CardDescription>What concept are you explaining today?</CardDescription>
          </CardHeader>
          <CardContent>
            <Label htmlFor="topic">Topic / Concept</Label>
            <Input
              id="topic"
              placeholder="e.g. Quantum Entanglement, The French Revolution..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="mt-2"
              disabled={isRecording || isProcessing || isContinuingStudySession}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Scope Statement</CardTitle>
            <CardDescription>
              Define what a “good explanation” must cover. Be specific.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Label htmlFor="scope">Scope statement (required)</Label>
            <Textarea
              id="scope"
              placeholder="e.g. Explain packet switching vs circuit switching, including reliability tradeoffs, and give one concrete example."
              value={scopeStatement}
              onChange={(e) => setScopeStatement(e.target.value)}
              className="mt-2"
              disabled={isRecording || isProcessing || isContinuingStudySession}
            />
          </CardContent>
        </Card>

        <Card
          className={
            isRecording
              ? 'border-violet-500 shadow-lg shadow-violet-100 transition-all dark:shadow-violet-900/20'
              : ''
          }
        >
          <CardHeader>
            <CardTitle>3. Record Explanation</CardTitle>
            <CardDescription>Speak clearly. Aim for 1-2 minutes.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center space-y-6 py-6">
            {/* Visualizer */}
            <div className="flex h-40 w-full items-center justify-center overflow-hidden rounded-xl border bg-slate-50 dark:bg-slate-900">
              {isRecording ? (
                <AudioVisualizer
                  stream={stream}
                  isRecording={isRecording}
                  className="h-full w-full"
                />
              ) : mediaBlob ? (
                <div className="text-center text-slate-500">
                  <p className="text-sm font-medium">Recording Complete</p>
                  <p className="text-xs">{formatDuration(duration)}</p>
                </div>
              ) : (
                <div className="text-center text-slate-400">
                  <Mic className="mx-auto mb-2 h-8 w-8 opacity-20" />
                  <p className="text-xs">Visualizer will appear here</p>
                </div>
              )}
            </div>

            {/* Timer */}
            <div className="font-mono text-4xl font-bold tracking-wider text-slate-700 dark:text-slate-200">
              {formatDuration(duration)}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
              {!isRecording && !mediaBlob && (
                <Button
                  size="lg"
                  className="h-14 w-14 rounded-full bg-red-500 shadow-md hover:bg-red-600"
                  onClick={handleStartRecording}
                >
                  <Mic className="h-6 w-6 text-white" />
                </Button>
              )}

              {isRecording && (
                <Button
                  size="lg"
                  className="h-14 w-14 animate-pulse rounded-full bg-slate-800 shadow-md hover:bg-slate-900"
                  onClick={handleStopRecording}
                >
                  <Square className="h-5 w-5 fill-current text-white" />
                </Button>
              )}

              {!isRecording && mediaBlob && !evaluation && !isProcessing && (
                <Button variant="outline" size="lg" onClick={handleDiscard}>
                  Discard
                </Button>
              )}
              {!isRecording && mediaBlob && !evaluation && (
                <Button
                  size="lg"
                  className="gap-2 bg-violet-600 hover:bg-violet-700"
                  onClick={handleSubmit}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Processing...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4" /> Evaluate Explanation
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {explanationId && evaluation && (
          <Card>
            <CardHeader>
              <CardTitle>4. Scorecard</CardTitle>
              <CardDescription>Review your evaluation, then start the quiz.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border bg-white p-4 dark:bg-slate-900">
                  <div className="text-muted-foreground text-sm">Overall</div>
                  <div className="mt-1 text-4xl font-bold">
                    {typeof evaluation.overall === 'number' ? evaluation.overall.toFixed(1) : '—'}
                    /10
                  </div>
                </div>
                <div className="rounded-xl border bg-white p-4 dark:bg-slate-900">
                  <div className="text-muted-foreground text-sm">Short feedback</div>
                  <div className="mt-2 text-sm leading-relaxed">
                    {evaluation.shortFeedback?.trim()
                      ? evaluation.shortFeedback
                      : 'Evaluation details are unavailable. You can still continue to the quiz.'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
                <div className="rounded-xl border bg-white p-3 text-center dark:bg-slate-900">
                  <div className="text-muted-foreground text-xs">Correctness</div>
                  <div className="mt-1 text-lg font-semibold">{evaluation.correctness ?? '—'}</div>
                </div>
                <div className="rounded-xl border bg-white p-3 text-center dark:bg-slate-900">
                  <div className="text-muted-foreground text-xs">Clarity</div>
                  <div className="mt-1 text-lg font-semibold">{evaluation.clarity ?? '—'}</div>
                </div>
                <div className="rounded-xl border bg-white p-3 text-center dark:bg-slate-900">
                  <div className="text-muted-foreground text-xs">Depth</div>
                  <div className="mt-1 text-lg font-semibold">{evaluation.depth ?? '—'}</div>
                </div>
                <div className="rounded-xl border bg-white p-3 text-center dark:bg-slate-900">
                  <div className="text-muted-foreground text-xs">Relevance</div>
                  <div className="mt-1 text-lg font-semibold">{evaluation.relevance ?? '—'}</div>
                </div>
                <div className="rounded-xl border bg-white p-3 text-center dark:bg-slate-900">
                  <div className="text-muted-foreground text-xs">Structure</div>
                  <div className="mt-1 text-lg font-semibold">{evaluation.structure ?? '—'}</div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  size="lg"
                  className="gap-2 bg-violet-600 hover:bg-violet-700"
                  onClick={handleStartQuiz}
                  disabled={isGeneratingQuiz}
                >
                  {isGeneratingQuiz ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Generating quiz...
                    </>
                  ) : (
                    <>Start Quiz</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
