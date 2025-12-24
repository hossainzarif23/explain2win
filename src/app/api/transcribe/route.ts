/**
 * Audio Transcription API Route
 *
 * Uses the server-side Google Gemini integration to convert audio to text.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/server/auth/auth.config';
import {
  calculateAudioDuration,
  cleanTranscription,
  transcribeAudio,
  validateAudioFile,
} from '@/server/ai/transcription';

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('audio') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const validation = validateAudioFile(file);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error ?? 'Invalid file' }, { status: 400 });
    }

    const audioBuffer = await file.arrayBuffer();
    const duration = calculateAudioDuration(audioBuffer);

    const raw = await transcribeAudio(file);
    const transcription = await cleanTranscription(raw);

    return NextResponse.json({ transcription, duration });
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
  }
}
