/**
 * AI Scope Generator
 *
 * Generates contextual scope statements for study sessions based on
 * the topic, its relationship to a parent topic, and learning context.
 */
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error('Missing GOOGLE_API_KEY or GEMINI_API_KEY');
}

const gemini = new GoogleGenerativeAI(apiKey);

interface ScopeGeneratorInput {
  topic: string;
  parentTopic?: string;
  relationshipType?: 'PREREQUISITE' | 'RELATED' | 'SUBTOPIC';
}

interface ScopeGeneratorOutput {
  scope: string;
  learningObjectives: string[];
}

const SYSTEM_PROMPT = `You are an expert educational content designer. Generate a focused, actionable scope statement for a study session.

The scope should:
1. Be 1-2 sentences, clear and specific
2. Focus on what the student will learn to EXPLAIN (not just understand)
3. Be appropriate for middle school to undergrad level
4. Connect to the parent topic if provided

Return JSON with:
- scope: The scope statement (1-2 sentences)
- learningObjectives: 2-3 bullet points of what they'll learn`;

export async function generateScope(
  input: ScopeGeneratorInput
): Promise<ScopeGeneratorOutput> {
  const model = gemini.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 512,
      responseMimeType: 'application/json',
    },
  });

  let prompt = `Generate a study scope for the topic: "${input.topic}"`;

  if (input.parentTopic && input.relationshipType) {
    const relationContext = {
      PREREQUISITE: `This topic is a PREREQUISITE for understanding "${input.parentTopic}". Focus on foundational concepts needed before tackling ${input.parentTopic}.`,
      RELATED: `This topic is RELATED to "${input.parentTopic}". Focus on connections and how understanding this topic enhances knowledge of ${input.parentTopic}.`,
      SUBTOPIC: `This is a SUBTOPIC of "${input.parentTopic}". Focus on this specific aspect in detail, building from general knowledge of ${input.parentTopic}.`,
    };
    prompt += `\n\nContext: ${relationContext[input.relationshipType]}`;
  }

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Parse JSON response
    const parsed = JSON.parse(text.trim());

    return {
      scope: parsed.scope || `Learn to explain ${input.topic} clearly and accurately.`,
      learningObjectives: parsed.learningObjectives || [],
    };
  } catch (error) {
    console.error('Scope generation failed:', error);
    // Return a sensible default
    return {
      scope: `Learn to explain the key concepts of ${input.topic} in a clear, understandable way.`,
      learningObjectives: [
        `Understand the core principles of ${input.topic}`,
        `Be able to explain ${input.topic} to others`,
      ],
    };
  }
}
