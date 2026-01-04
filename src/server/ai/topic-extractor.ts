/**
 * Topic Extractor
 *
 * Analyzes a completed study session's best attempt to identify related topics.
 * Called ONCE per session completion to create knowledge graph edges.
 */
import { GoogleGenerativeAI } from '@google/generative-ai';

let geminiClient: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI {
  if (geminiClient) return geminiClient;

  const apiKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing Gemini API key');
  }

  geminiClient = new GoogleGenerativeAI(apiKey);
  return geminiClient;
}

export interface RelatedTopic {
  topic: string;
  relationshipType: 'PREREQUISITE' | 'RELATED' | 'SUBTOPIC';
  strength: number; // 0-1
  reason: string;
}

export interface TopicExtractionResult {
  relatedTopics: RelatedTopic[];
}

interface ExtractionInput {
  mainTopic: string;
  transcription: string;
  scopeStatement: string;
}

const SYSTEM_PROMPT = `You are an expert knowledge graph builder for an educational platform.

Your task is to analyze a student's explanation of a topic and identify related topics that connect to their learning.

For each related topic, specify:
1. **topic**: A concise, properly capitalized topic name
2. **relationshipType**: 
   - PREREQUISITE: Topics the student should understand BEFORE this topic
   - SUBTOPIC: More specific topics within this broader topic
   - RELATED: Topics that complement or extend this knowledge
3. **strength**: How strongly related (0.3 = loosely related, 0.7 = strongly related, 1.0 = essential)
4. **reason**: Brief explanation of why this topic is related (1 sentence)

Guidelines:
- Return 3-6 related topics
- Avoid overly generic topics (e.g., "Computer Science")
- Prefer specific, actionable learning topics
- Consider what the student would naturally learn next
- Return ONLY valid JSON`;

function buildPrompt(input: ExtractionInput): string {
  return `Main Topic: ${input.mainTopic}

Scope: ${input.scopeStatement}

Student's Explanation:
"""
${input.transcription}
"""

Based on this explanation, identify related topics that would help build a knowledge graph.

Respond with this JSON structure:
{
  "relatedTopics": [
    {
      "topic": "Example Topic Name",
      "relationshipType": "PREREQUISITE" | "RELATED" | "SUBTOPIC",
      "strength": 0.7,
      "reason": "Brief explanation"
    }
  ]
}

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

function validateRelatedTopic(topic: unknown): RelatedTopic | null {
  if (typeof topic !== 'object' || topic === null) return null;
  const obj = topic as Record<string, unknown>;

  const topicName = obj.topic;
  const relationshipType = obj.relationshipType;
  const strength = obj.strength;
  const reason = obj.reason;

  if (typeof topicName !== 'string' || !topicName.trim()) return null;
  if (!['PREREQUISITE', 'RELATED', 'SUBTOPIC'].includes(relationshipType as string)) return null;
  if (typeof strength !== 'number' || strength < 0 || strength > 1) return null;

  return {
    topic: topicName.trim(),
    relationshipType: relationshipType as 'PREREQUISITE' | 'RELATED' | 'SUBTOPIC',
    strength,
    reason: typeof reason === 'string' ? reason : '',
  };
}

/**
 * Extract related topics from a study session's best explanation.
 * Called once per session completion.
 */
export async function extractRelatedTopics(
  input: ExtractionInput
): Promise<TopicExtractionResult> {
  const model = getGeminiClient().getGenerativeModel({
    model: process.env.GEMINI_TOPIC_MODEL ?? 'gemini-2.5-flash',
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
    },
  });

  const prompt = buildPrompt(input);

  try {
    const result = await model.generateContent(prompt);
    const content = result.response.text();

    if (!content) {
      console.error('Empty response from topic extraction');
      return { relatedTopics: [] };
    }

    const parsed = tryParseJson(content) as Record<string, unknown>;
    const rawTopics = parsed.relatedTopics;

    if (!Array.isArray(rawTopics)) {
      return { relatedTopics: [] };
    }

    const relatedTopics = rawTopics
      .map(validateRelatedTopic)
      .filter((t): t is RelatedTopic => t !== null)
      .slice(0, 6); // Cap at 6 topics

    return { relatedTopics };
  } catch (error) {
    console.error('Topic extraction failed:', error);
    return { relatedTopics: [] };
  }
}
