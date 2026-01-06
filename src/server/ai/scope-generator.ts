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

const SYSTEM_PROMPT = `You are an expert educational content designer creating scope statements for study sessions where students learn by TEACHING/EXPLAINING topics.

A scope statement should define HOW the student should explain the topic - the methodology, structure, and quality expectations. It should NOT describe the topic content itself.

GOOD scope statement example:
"Clearly and thoroughly describe how the system works from start to finish, explain why each part exists and show how the parts fit together, using clear structure and precise language suitable for teaching the topic at an academic level."

This is good because it:
- Focuses on explanation METHODOLOGY (clear structure, from start to finish)
- Sets QUALITY expectations (thorough, precise, academic level)
- Uses non-technical, accessible language
- Defines what a good explanation looks like

BAD scope statement example:
"Explain what X is and how it works with Y to accomplish Z."

This is bad because it:
- Describes CONTENT instead of explanation approach
- Doesn't set quality/depth expectations
- Is too vague about structure

Generate a scope statement that:
1. Is 1-2 sentences
2. Uses accessible, non-technical language
3. Defines HOW to explain (methodology, structure)
4. Sets clear quality expectations (thorough, academic, clear, etc.)
5. Does NOT describe the topic content itself

Return JSON with:
- scope: The methodology-focused scope statement
- learningObjectives: 2-3 teaching skills they'll develop`;

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
