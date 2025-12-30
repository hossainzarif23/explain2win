/**
 * Quiz Generator
 *
 * Uses Google Gemini to generate quiz questions from explanations
 */
import { GoogleGenerativeAI } from '@google/generative-ai';

import {
  QUIZ_GENERATION_SYSTEM_PROMPT,
  QUIZ_GENERATION_USER_PROMPT,
  QUIZ_GENERATION_USER_PROMPT_V2,
  STUDENT_TYPE_PROMPTS,
} from '@/server/ai/prompts';

let geminiClient: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI {
  if (geminiClient) return geminiClient;

  const apiKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing Gemini API key (set GOOGLE_API_KEY or GEMINI_API_KEY)');
  }

  geminiClient = new GoogleGenerativeAI(apiKey);
  return geminiClient;
}

function getQuizModel(systemInstruction: string) {
  const modelName = process.env.GEMINI_QUIZ_MODEL ?? 'gemini-3-flash';
  return getGeminiClient().getGenerativeModel({
    model: modelName,
    systemInstruction,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
    },
  });
}

function getAnalysisModel(systemInstruction: string) {
  const modelName = process.env.GEMINI_ANALYSIS_MODEL ?? 'gemini-3-flash';
  return getGeminiClient().getGenerativeModel({
    model: modelName,
    systemInstruction,
    generationConfig: {
      temperature: 0.5,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json',
    },
  });
}

interface GeneratedQuestion {
  questionText: string;
  questionType: 'MULTIPLE_CHOICE' | 'SHORT_ANSWER';
  options: string[] | null;
  correctAnswer: string;
  explanation: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
}

interface GenerateQuizParams {
  topic: string;
  transcription: string;
  studentType: 'CURIOUS' | 'EXAM_FOCUSED' | 'CHALLENGING' | 'BEGINNER';
  questionCount: number;
  missingConcepts?: string[];
  learningObjectives?: string[];
}

function tryParseJson(text: string): unknown {
  const trimmed = text.trim();
  const candidates: string[] = [trimmed];

  const withoutFences = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
  if (withoutFences !== trimmed) candidates.push(withoutFences);

  const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
  if (arrayMatch) candidates.push(arrayMatch[0]);

  const objMatch = trimmed.match(/\{[\s\S]*\}/);
  if (objMatch) candidates.push(objMatch[0]);

  for (const candidate of candidates) {
    const repaired = candidate.replace(/,\s*([}\]])/g, '$1');
    try {
      return JSON.parse(repaired);
    } catch {
      // try next
    }
  }

  throw new Error('Failed to parse JSON');
}

function normalizeQuestions(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  if (typeof parsed === 'object' && parsed !== null) {
    const maybe = (parsed as { questions?: unknown }).questions;
    if (Array.isArray(maybe)) return maybe;
  }
  throw new Error('Invalid response format');
}

/**
 * Generate quiz questions using GPT-4
 */
export async function generateQuizQuestions({
  topic,
  transcription,
  studentType,
  questionCount,
  missingConcepts,
  learningObjectives,
}: GenerateQuizParams): Promise<GeneratedQuestion[]> {
  const studentTypeContext = STUDENT_TYPE_PROMPTS[studentType];

  const model = getQuizModel(
    `${QUIZ_GENERATION_SYSTEM_PROMPT}\n\nStudent Persona:\n${studentTypeContext}`
  );

  const shouldUseFocus =
    (missingConcepts?.length ?? 0) > 0 || (learningObjectives?.length ?? 0) > 0;

  const userPrompt = shouldUseFocus
    ? QUIZ_GENERATION_USER_PROMPT_V2({
        topic,
        transcription,
        studentType,
        questionCount,
        missingConcepts,
        learningObjectives,
      })
    : QUIZ_GENERATION_USER_PROMPT(topic, transcription, studentType, questionCount);

  const result = await model.generateContent(userPrompt);

  const content = result.response.text();

  if (!content) {
    throw new Error('Failed to generate quiz questions');
  }

  try {
    const parsed = tryParseJson(content);
    const questions = normalizeQuestions(parsed);

    return questions.map((q: unknown) => {
      const item = q as Partial<GeneratedQuestion>;
      return {
        questionText: String(item.questionText ?? ''),
        questionType: validateQuestionType(String(item.questionType ?? 'MULTIPLE_CHOICE')),
        options: (Array.isArray(item.options) ? item.options : null) as string[] | null,
        correctAnswer: String(item.correctAnswer ?? ''),
        explanation: typeof item.explanation === 'string' ? item.explanation : '',
        difficulty: validateDifficulty(String(item.difficulty ?? 'MEDIUM')),
      };
    });
  } catch (error) {
    console.error('Failed to parse quiz questions:', error);
    throw new Error('Failed to parse generated questions');
  }
}

function validateQuestionType(type: string): GeneratedQuestion['questionType'] {
  const validTypes = ['MULTIPLE_CHOICE', 'SHORT_ANSWER'];
  return validTypes.includes(type)
    ? (type as GeneratedQuestion['questionType'])
    : 'MULTIPLE_CHOICE';
}

function validateDifficulty(difficulty: string): GeneratedQuestion['difficulty'] {
  const validDifficulties = ['EASY', 'MEDIUM', 'HARD'];
  return validDifficulties.includes(difficulty)
    ? (difficulty as GeneratedQuestion['difficulty'])
    : 'MEDIUM';
}

/**
 * Analyze explanation for missing concepts
 */
export async function analyzeExplanation(
  topic: string,
  transcription: string
): Promise<{ missingConcepts: string[]; suggestions: string[] }> {
  const model = getAnalysisModel(
    `You are an expert tutor analyzing a student's explanation of a topic.
Identify key concepts that are missing or could be explained better.
Be constructive and helpful, not critical.`
  );

  const result = await model.generateContent(
    `Topic: ${topic}\n\nExplanation:\n${transcription}\n\nProvide a JSON response with:\n{
  "missingConcepts": ["concept1", "concept2"],
  "suggestions": ["suggestion1", "suggestion2"]
}`
  );

  const content = result.response.text();

  if (!content) {
    return { missingConcepts: [], suggestions: [] };
  }

  try {
    return JSON.parse(content);
  } catch {
    return { missingConcepts: [], suggestions: [] };
  }
}
