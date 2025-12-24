/**
 * Quiz Generator
 *
 * Uses Google Gemini to generate quiz questions from explanations
 */
import { GoogleGenerativeAI } from '@google/generative-ai';

import {
  QUIZ_GENERATION_SYSTEM_PROMPT,
  QUIZ_GENERATION_USER_PROMPT,
  STUDENT_TYPE_PROMPTS,
} from '@/server/ai/prompts';

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

function getQuizModel(systemInstruction: string) {
  const modelName = process.env.GEMINI_QUIZ_MODEL ?? 'gemini-2.5-flash';
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
  const modelName = process.env.GEMINI_ANALYSIS_MODEL ?? 'gemini-2.5-flash';
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
  questionType: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'FILL_BLANK';
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
}

/**
 * Generate quiz questions using GPT-4
 */
export async function generateQuizQuestions({
  topic,
  transcription,
  studentType,
  questionCount,
}: GenerateQuizParams): Promise<GeneratedQuestion[]> {
  const studentTypeContext = STUDENT_TYPE_PROMPTS[studentType];

  const model = getQuizModel(
    `${QUIZ_GENERATION_SYSTEM_PROMPT}\n\nStudent Persona:\n${studentTypeContext}`
  );

  const result = await model.generateContent(
    QUIZ_GENERATION_USER_PROMPT(topic, transcription, studentType, questionCount)
  );

  const content = result.response.text();

  if (!content) {
    throw new Error('Failed to generate quiz questions');
  }

  try {
    // Parse the JSON response
    const parsed = JSON.parse(content);

    // Handle both array and object with questions array
    const questions = Array.isArray(parsed) ? parsed : parsed.questions;

    if (!Array.isArray(questions)) {
      throw new Error('Invalid response format');
    }

    // Validate and transform questions
    return questions.map((q: GeneratedQuestion) => ({
      questionText: q.questionText,
      questionType: validateQuestionType(q.questionType),
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation || '',
      difficulty: validateDifficulty(q.difficulty),
    }));
  } catch (error) {
    console.error('Failed to parse quiz questions:', error);
    throw new Error('Failed to parse generated questions');
  }
}

function validateQuestionType(type: string): GeneratedQuestion['questionType'] {
  const validTypes = ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER', 'FILL_BLANK'];
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
