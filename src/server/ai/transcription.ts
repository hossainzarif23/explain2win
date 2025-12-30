/**
 * Transcription Service
 *
 * Uses Google Gemini for speech-to-text + cleanup
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { TRANSCRIPTION_SYSTEM_PROMPT } from '@/server/ai/prompts';

let geminiClient: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI {
  if (geminiClient) return geminiClient;

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY (or GEMINI_API_KEY) is not set');
  }

  geminiClient = new GoogleGenerativeAI(apiKey);
  return geminiClient;
}

function getTranscriptionModel() {
  const modelName = process.env.GEMINI_TRANSCRIBE_MODEL ?? 'gemini-2.5-flash';
  return getGeminiClient().getGenerativeModel({
    model: modelName,
    systemInstruction:
      'You are a precise speech-to-text transcriber. Transcribe the provided audio verbatim. ' +
      'Do not add extra content. Output only the transcript text.',
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 4096,
    },
  });
}

function getCleanupModel() {
  const modelName = process.env.GEMINI_CLEANUP_MODEL ?? 'gemini-2.5-flash';
  return getGeminiClient().getGenerativeModel({
    model: modelName,
    systemInstruction: TRANSCRIPTION_SYSTEM_PROMPT,
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 4096,
    },
  });
}

function toBase64(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString('base64');
}

/**
 * Transcribe audio file using Gemini
 */
export async function transcribeAudio(audioFile: File): Promise<string> {
  const audioBuffer = await audioFile.arrayBuffer();
  const mimeType = audioFile.type || 'audio/webm';

  const model = getTranscriptionModel();
  const result = await model.generateContent([
    {
      inlineData: {
        data: toBase64(audioBuffer),
        mimeType,
      },
    },
    {
      text: 'Transcribe the provided audio in English. Output only the transcript text.',
    },
  ]);

  return result.response.text().trim();
}

/**
 * Clean up transcription using Gemini
 */
export async function cleanTranscription(rawTranscription: string): Promise<string> {
  const model = getCleanupModel();
  const result = await model.generateContent(
    `Clean up this transcription (do not add new information):\n\n${rawTranscription}`
  );

  const cleaned = result.response.text().trim();
  return cleaned || rawTranscription;
}

/**
 * Calculate transcription duration from audio buffer
 */
export function calculateAudioDuration(audioBuffer: ArrayBuffer): number {
  // This is a simplified calculation
  // For WebM/Opus, actual calculation would require parsing the container
  // We estimate based on typical bitrate (48kbps for voice)
  const bytesPerSecond = 48000 / 8; // 6000 bytes per second
  return Math.ceil(audioBuffer.byteLength / bytesPerSecond);
}

/**
 * Validate audio file
 */
export function validateAudioFile(file: File): { valid: boolean; error?: string } {
  // Check file size (keep at 25MB to stay safe for typical API limits)
  const maxSize = 25 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: 'File size exceeds 25MB limit' };
  }

  // Check file type
  const allowedTypes = [
    'audio/webm',
    'audio/mp3',
    'audio/mpeg',
    'audio/mp4',
    'audio/wav',
    'audio/ogg',
  ];
  if (!allowedTypes.some((type) => file.type.startsWith(type.split('/')[0]))) {
    return { valid: false, error: 'Invalid audio format' };
  }

  return { valid: true };
}
