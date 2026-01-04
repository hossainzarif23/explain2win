/**
 * Comparison Analyzer
 *
 * Uses Google Gemini to analyze differences between two explanation attempts.
 * Identifies new concepts, missing concepts, and provides per-dimension analysis.
 */
import { GoogleGenerativeAI } from '@google/generative-ai';

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

export interface DimensionAnalysis {
  correctness?: string;
  clarity?: string;
  depth?: string;
  relevance?: string;
  structure?: string;
}

export interface ComparisonResult {
  newConcepts: string[];
  missingConcepts: string[];
  dimensionAnalysis: DimensionAnalysis;
  summary: string;
}

interface AttemptScores {
  correctness: number | null;
  clarity: number | null;
  depth: number | null;
  relevance: number | null;
  structure: number | null;
}

interface ComparisonInput {
  topic: string;
  earlierTranscription: string;
  laterTranscription: string;
  earlierScores: AttemptScores;
  laterScores: AttemptScores;
}

const SYSTEM_PROMPT = `You are an expert educational assessment analyst. Your task is to compare two explanation attempts by the same student on the same topic.

You will receive:
1. The topic being explained
2. Two transcriptions (earlier and later attempts)
3. Score changes across 5 dimensions

Your analysis should identify:
1. NEW CONCEPTS: Key concepts, terms, or ideas that appear in the LATER attempt but NOT in the earlier one
2. MISSING CONCEPTS: Key concepts that were in the EARLIER attempt but are ABSENT from the later one
3. PER-DIMENSION ANALYSIS: For each dimension where the score CHANGED, explain WHY it changed based on the transcription differences

Be specific and reference actual content from the transcriptions.
Keep explanations concise (1-2 sentences per dimension).
Return ONLY valid JSON.`;

function buildUserPrompt(input: ComparisonInput): string {
  const dimensions = ['correctness', 'clarity', 'depth', 'relevance', 'structure'] as const;
  
  const scoreChanges = dimensions
    .map((dim) => {
      const earlier = input.earlierScores[dim];
      const later = input.laterScores[dim];
      if (earlier === null || later === null) return null;
      const delta = later - earlier;
      if (delta === 0) return null;
      return `- ${dim}: ${earlier} → ${later} (${delta > 0 ? '+' : ''}${delta})`;
    })
    .filter(Boolean)
    .join('\n');

  return `Topic: ${input.topic}

EARLIER ATTEMPT:
"""
${input.earlierTranscription}
"""

LATER ATTEMPT:
"""
${input.laterTranscription}
"""

SCORE CHANGES:
${scoreChanges || '(No significant score changes)'}

Respond with this JSON structure:
{
  "newConcepts": ["concept1", "concept2", ...],
  "missingConcepts": ["concept3", ...],
  "dimensionAnalysis": {
    "correctness": "Why correctness changed (only if score changed)",
    "clarity": "Why clarity changed (only if score changed)",
    "depth": "Why depth changed (only if score changed)",
    "relevance": "Why relevance changed (only if score changed)",
    "structure": "Why structure changed (only if score changed)"
  },
  "summary": "A brief 2-3 sentence overall comparison of the two attempts"
}

Only include dimensions in dimensionAnalysis that had score changes.
Return ONLY the JSON, no other text.`;
}

function tryParseJson(text: string): unknown {
  const trimmed = text.trim();
  const candidates: string[] = [trimmed];

  // Remove markdown code fences
  const withoutFences = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
  if (withoutFences !== trimmed) candidates.push(withoutFences);

  // Try to find JSON object
  const objMatch = trimmed.match(/\{[\s\S]*\}/);
  if (objMatch) candidates.push(objMatch[0]);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try next
    }
  }

  throw new Error('Failed to parse JSON response');
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}

function safeDimensionAnalysis(value: unknown): DimensionAnalysis {
  if (typeof value !== 'object' || value === null) return {};
  const obj = value as Record<string, unknown>;
  const result: DimensionAnalysis = {};
  
  const dimensions = ['correctness', 'clarity', 'depth', 'relevance', 'structure'] as const;
  for (const dim of dimensions) {
    if (typeof obj[dim] === 'string' && obj[dim]) {
      result[dim] = obj[dim] as string;
    }
  }
  return result;
}

/**
 * Analyze the differences between two explanation attempts using LLM.
 */
export async function analyzeAttemptComparison(
  input: ComparisonInput
): Promise<ComparisonResult> {
  const model = getGeminiClient().getGenerativeModel({
    model: process.env.GEMINI_COMPARISON_MODEL ?? 'gemini-2.5-flash',

    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 65536,
      responseMimeType: 'application/json',
    },
  });

  const userPrompt = buildUserPrompt(input);
  const result = await model.generateContent(userPrompt);
  const content = result.response.text();

  if (!content) {
    throw new Error('Empty response from comparison analysis');
  }

  try {
    const parsed = tryParseJson(content) as Record<string, unknown>;

    return {
      newConcepts: safeStringArray(parsed.newConcepts),
      missingConcepts: safeStringArray(parsed.missingConcepts),
      dimensionAnalysis: safeDimensionAnalysis(parsed.dimensionAnalysis),
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    };
  } catch (error) {
    console.error('Failed to parse comparison analysis:', error);
    throw new Error('Failed to parse comparison analysis response');
  }
}
