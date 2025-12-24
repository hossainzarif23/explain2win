'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, Square, Loader2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

import { api } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { AudioVisualizer } from '@/components/explain/audio-visualizer';

export default function ExplainPage() {
  const router = useRouter();
  const [topic, setTopic] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
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
  const createExplanationMutation = api.explanation.create.useMutation();
  const generateQuizMutation = api.quiz.generate.useMutation();

  const handleStartRecording = async () => {
    if (!topic.trim()) {
      toast.error('Please enter a topic first');
      return;
    }
    await startRecording();
  };

  const handleStopRecording = () => {
    stopRecording();
  };

  const handleSubmit = async () => {
    if (!mediaBlob || !topic) return;
    setIsProcessing(true);

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

      const { transcription, duration: detectedDuration } = (await transcribeResponse.json()) as {
        transcription: string;
        duration: number;
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

      const { url } = await uploadResponse.json();

      // 3. Create Explanation record
      const explanation = await createExplanationMutation.mutateAsync({
        topic,
        transcription,
        duration: detectedDuration,
        audioUrl: url,
      });

      toast.success('Explanation saved!');

      // 3. Generate Quiz (Optional immediately, or redirect)
      // For "Explain2Win", we usually auto-generate.
      try {
        toast.info('Generating AI Quiz...');
        const { quizSession } = await generateQuizMutation.mutateAsync({
          explanationId: explanation.id,
          studentType: 'CURIOUS', // Default
          questionCount: 5,
        });

        router.push(`/quiz/${quizSession.id}`);
      } catch (quizError: unknown) {
        const message = quizError instanceof Error ? quizError.message : 'Unknown error';
        toast.error(`Quiz generation failed: ${message}`);
        // Still redirect to dashboard or explanation view
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed: ${message}`);
    } finally {
      setIsProcessing(false);
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
              disabled={isRecording || isProcessing}
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
            <CardTitle>2. Record Explanation</CardTitle>
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

              {!isRecording && mediaBlob && (
                <>
                  <Button variant="outline" size="lg" onClick={clearRecording}>
                    Discard
                  </Button>
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
                        <Wand2 className="h-4 w-4" /> Generate Quiz
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
