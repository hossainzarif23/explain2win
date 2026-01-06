/**
 * Backfill Knowledge Graph
 *
 * This script processes all completed study sessions and creates
 * TopicNode + TopicRelation entries for the knowledge graph.
 *
 * Run with: npx tsx scripts/backfill-knowledge-graph.ts
 */
import { PrismaClient } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';

const prisma = new PrismaClient();

// Initialize Gemini
const apiKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('❌ Missing GOOGLE_API_KEY or GEMINI_API_KEY');
  process.exit(1);
}
const gemini = new GoogleGenerativeAI(apiKey);

interface RelatedTopic {
  topic: string;
  relationshipType: 'PREREQUISITE' | 'RELATED' | 'SUBTOPIC';
  strength: number;
}

const SYSTEM_PROMPT = `You are an expert knowledge graph builder. Analyze a student's explanation and identify 3-6 related topics.

For each topic, provide:
- topic: Concise, properly capitalized name
- relationshipType: PREREQUISITE, RELATED, or SUBTOPIC
- strength: 0.3 to 1.0

Return ONLY valid JSON with this structure:
{
  "relatedTopics": [
    { "topic": "Example", "relationshipType": "RELATED", "strength": 0.7 }
  ]
}`;

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

  return null;
}

async function extractRelatedTopics(
  mainTopic: string,
  transcription: string,
  scopeStatement: string
): Promise<RelatedTopic[]> {
  const model = gemini.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
    },
  });

  const prompt = `Topic: ${mainTopic}
Scope: ${scopeStatement}

Explanation (excerpt):
"""
${transcription.slice(0, 2000)}
"""

Identify 3-6 related topics and return as JSON.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const parsed = tryParseJson(text);
    if (!parsed || typeof parsed !== 'object') {
      console.log(`   ⚠️ Could not parse AI response`);
      return [];
    }

    const obj = parsed as Record<string, unknown>;
    const topics = obj.relatedTopics;

    if (!Array.isArray(topics)) {
      return [];
    }

    return topics
      .filter(
        (t): t is RelatedTopic =>
          typeof t === 'object' &&
          t !== null &&
          typeof (t as Record<string, unknown>).topic === 'string' &&
          ['PREREQUISITE', 'RELATED', 'SUBTOPIC'].includes(
            (t as Record<string, unknown>).relationshipType as string
          )
      )
      .slice(0, 6);
  } catch (error) {
    console.error(`   ⚠️ AI extraction failed:`, (error as Error).message);
    return [];
  }
}

async function processSession(session: {
  id: string;
  userId: string;
  topic: string;
  scopeStatement: string;
  explanations: { transcription: string | null; evalOverallScore: number | null }[];
}) {
  const normalizedTopic = session.topic.toLowerCase().trim();

  // Check if node exists
  const existing = await prisma.topicNode.findUnique({
    where: {
      userId_normalizedTopic: {
        userId: session.userId,
        normalizedTopic,
      },
    },
    include: {
      outgoingEdges: { select: { id: true } },
    },
  });

  // Find best attempt (highest score)
  const bestAttempt = session.explanations
    .filter((e) => e.transcription)
    .sort((a, b) => (b.evalOverallScore ?? 0) - (a.evalOverallScore ?? 0))[0];

  if (!bestAttempt?.transcription) {
    console.log(`   ⚠️ No transcription found`);
    return { created: false, fixed: false, edges: 0 };
  }

  // evalOverallScore is 0-10, so mastery = score / 10
  const masteryLevel = bestAttempt.evalOverallScore
    ? Math.min(1, bestAttempt.evalOverallScore / 10)
    : 0.5;

  // Check if fully functional (has node, has edges, linked to session)
  if (existing) {
    const hasEdges = existing.outgoingEdges.length > 0;
    const isLinked = existing.studySessionId === session.id;
    
    if (hasEdges && isLinked) {
      console.log(`   ⏭️ Already functional (${existing.outgoingEdges.length} edges), skipping`);
      return { created: false, fixed: false, edges: 0 };
    }
    
    console.log(`   🔧 Fixing broken node (edges: ${existing.outgoingEdges.length}, linked: ${isLinked})`);
  }

  // Upsert node (creates if new, updates if existing but broken)
  const topicNode = await prisma.topicNode.upsert({
    where: {
      userId_normalizedTopic: {
        userId: session.userId,
        normalizedTopic,
      },
    },
    update: {
      masteryLevel,
      studySessionId: session.id,
      isExplored: true,
      isSuggested: false,
    },
    create: {
      userId: session.userId,
      topic: session.topic,
      normalizedTopic,
      masteryLevel,
      studySessionId: session.id,
      isExplored: true,
      isSuggested: false,
    },
  });

  const wasCreated = !existing;
  console.log(`   ${wasCreated ? '✅ Created' : '🔧 Updated'} node (mastery: ${Math.round(masteryLevel * 100)}%)`);

  // Check if we need to create edges
  const existingEdgeCount = existing?.outgoingEdges.length ?? 0;
  if (existingEdgeCount > 0) {
    console.log(`   ⏭️ Edges already exist (${existingEdgeCount}), skipping AI extraction`);
    return { created: wasCreated, fixed: !wasCreated, edges: 0 };
  }

  // Extract related topics
  const relatedTopics = await extractRelatedTopics(
    session.topic,
    bestAttempt.transcription,
    session.scopeStatement
  );

  let edgesCreated = 0;

  for (const related of relatedTopics) {
    const relatedNormalized = related.topic.toLowerCase().trim();

    // Skip self-references
    if (relatedNormalized === normalizedTopic) continue;

    // Find or create related node
    let relatedNode = await prisma.topicNode.findUnique({
      where: {
        userId_normalizedTopic: {
          userId: session.userId,
          normalizedTopic: relatedNormalized,
        },
      },
    });

    if (!relatedNode) {
      relatedNode = await prisma.topicNode.create({
        data: {
          userId: session.userId,
          topic: related.topic,
          normalizedTopic: relatedNormalized,
          isExplored: false,
          isSuggested: true,
        },
      });
    }

    // Create edge if doesn't exist
    const existingEdge = await prisma.topicRelation.findUnique({
      where: {
        fromNodeId_toNodeId: {
          fromNodeId: topicNode.id,
          toNodeId: relatedNode.id,
        },
      },
    });

    if (!existingEdge) {
      await prisma.topicRelation.create({
        data: {
          fromNodeId: topicNode.id,
          toNodeId: relatedNode.id,
          relationshipType: related.relationshipType,
          strength: related.strength ?? 0.5,
        },
      });
      edgesCreated++;
    }
  }

  console.log(`   🔗 Created ${edgesCreated} edges`);
  return { created: wasCreated, fixed: !wasCreated, edges: edgesCreated };
}

async function main() {
  console.log('🧠 Knowledge Graph Backfill Script\n');
  console.log('='.repeat(50));

  // Get all completed sessions
  const sessions = await prisma.studySession.findMany({
    where: { status: 'COMPLETED' },
    include: {
      explanations: {
        select: {
          transcription: true,
          evalOverallScore: true,
        },
        orderBy: { evalOverallScore: 'desc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`\n📊 Found ${sessions.length} completed sessions\n`);

  let totalCreated = 0;
  let totalFixed = 0;
  let totalEdges = 0;
  let skipped = 0;

  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i];
    console.log(`\n[${i + 1}/${sessions.length}] "${session.topic}"`);

    try {
      const result = await processSession(session);
      if (result.created) {
        totalCreated++;
        totalEdges += result.edges;
      } else if (result.fixed) {
        totalFixed++;
        totalEdges += result.edges;
      } else {
        skipped++;
      }

      // Rate limiting: 1.5 second delay between AI calls
      if (i < sessions.length - 1 && (result.created || result.fixed)) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    } catch (error) {
      console.error(`   ❌ Error:`, error);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('\n📈 Summary:');
  console.log(`   Nodes created: ${totalCreated}`);
  console.log(`   Nodes fixed: ${totalFixed}`);
  console.log(`   Edges created: ${totalEdges}`);
  console.log(`   Skipped (already functional): ${skipped}`);
  console.log('\n✅ Backfill complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

