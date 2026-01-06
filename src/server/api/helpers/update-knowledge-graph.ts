/**
 * Knowledge Graph Update Helper
 *
 * Updates the knowledge graph when a study session is completed.
 * Handles both new topics and existing suggested nodes.
 */
import type { PrismaClient } from '@prisma/client';
import { extractRelatedTopics } from '@/server/ai/topic-extractor';

interface UpdateKnowledgeGraphInput {
  prisma: PrismaClient;
  userId: string;
  studySessionId: string;
  topic: string;
  scopeStatement: string;
  transcription: string;
  masteryLevel: number; // 0-1 scale
}

/**
 * Updates knowledge graph on study session completion.
 * - Upserts TopicNode (creates if new, updates if existing suggested node)
 * - Extracts related topics via AI
 * - Creates edges between topics
 */
export async function updateKnowledgeGraphOnCompletion(
  input: UpdateKnowledgeGraphInput
): Promise<{ success: boolean; relatedTopicsCount: number; error?: string }> {
  const {
    prisma,
    userId,
    studySessionId,
    topic,
    scopeStatement,
    transcription,
    masteryLevel,
  } = input;

  const normalizedTopic = topic.toLowerCase().trim();

  try {
    // 1. Upsert TopicNode (handles both new topics and existing suggested nodes)
    const topicNode = await prisma.topicNode.upsert({
      where: {
        userId_normalizedTopic: {
          userId,
          normalizedTopic,
        },
      },
      update: {
        masteryLevel,
        studySessionId,
        isExplored: true,
        isSuggested: false,
      },
      create: {
        userId,
        topic,
        normalizedTopic,
        masteryLevel,
        studySessionId,
        isExplored: true,
        isSuggested: false,
      },
    });

    // 2. Extract related topics via AI
    let relatedTopicsCount = 0;

    try {
      const { relatedTopics } = await extractRelatedTopics({
        mainTopic: topic,
        transcription,
        scopeStatement,
      });

      // 3. Create edges to related topics
      for (const related of relatedTopics) {
        const relatedNormalized = related.topic.toLowerCase().trim();

        // Skip self-reference
        if (relatedNormalized === normalizedTopic) continue;

        // Find or create the related topic node
        let relatedNode = await prisma.topicNode.findUnique({
          where: {
            userId_normalizedTopic: {
              userId,
              normalizedTopic: relatedNormalized,
            },
          },
        });

        if (!relatedNode) {
          relatedNode = await prisma.topicNode.create({
            data: {
              userId,
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
              strength: related.strength,
            },
          });
          relatedTopicsCount++;
        }
      }
    } catch (aiError) {
      console.error('AI topic extraction failed:', aiError);
      // Don't fail the whole operation if AI extraction fails
    }

    return { success: true, relatedTopicsCount };
  } catch (error) {
    console.error('Knowledge graph update failed:', error);
    return {
      success: false,
      relatedTopicsCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
