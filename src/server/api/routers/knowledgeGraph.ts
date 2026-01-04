/**
 * Knowledge Graph Router
 *
 * Handles fetching and managing the user's knowledge graph visualization.
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';

export const knowledgeGraphRouter = createTRPCRouter({
  /**
   * Get the user's complete knowledge graph
   */
  getGraph: protectedProcedure.query(async ({ ctx }) => {
    const nodes = await ctx.prisma.topicNode.findMany({
      where: { userId: ctx.session.user.id },
      include: {
        outgoingEdges: {
          include: {
            toNode: {
              select: { id: true, topic: true },
            },
          },
        },
        studySession: {
          select: {
            id: true,
            status: true,
            masteryStreak: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Transform to graph-friendly format
    const graphNodes = nodes.map((node) => ({
      id: node.id,
      topic: node.topic,
      masteryLevel: node.masteryLevel,
      isExplored: node.isExplored,
      isSuggested: node.isSuggested,
      studySessionId: node.studySessionId,
      sessionStatus: node.studySession?.status ?? null,
      masteryStreak: node.studySession?.masteryStreak ?? 0,
      positionX: node.positionX,
      positionY: node.positionY,
    }));

    const edges = nodes.flatMap((node) =>
      node.outgoingEdges.map((edge) => ({
        id: edge.id,
        source: edge.fromNodeId,
        target: edge.toNodeId,
        relationshipType: edge.relationshipType,
        strength: edge.strength,
      }))
    );

    return { nodes: graphNodes, edges };
  }),

  /**
   * Create or update a topic node (called when study session starts/completes)
   */
  upsertNode: protectedProcedure
    .input(
      z.object({
        topic: z.string().min(1),
        studySessionId: z.string().optional(),
        masteryLevel: z.number().min(0).max(1).optional(),
        isExplored: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const normalizedTopic = input.topic.toLowerCase().trim();

      const node = await ctx.prisma.topicNode.upsert({
        where: {
          userId_normalizedTopic: {
            userId: ctx.session.user.id,
            normalizedTopic,
          },
        },
        update: {
          masteryLevel: input.masteryLevel,
          studySessionId: input.studySessionId,
          isExplored: input.isExplored ?? true,
          isSuggested: false, // No longer suggested once explored
        },
        create: {
          userId: ctx.session.user.id,
          topic: input.topic,
          normalizedTopic,
          masteryLevel: input.masteryLevel ?? 0,
          studySessionId: input.studySessionId,
          isExplored: input.isExplored ?? true,
          isSuggested: false,
        },
      });

      return node;
    }),

  /**
   * Create edges between nodes (topic relationships)
   */
  createEdges: protectedProcedure
    .input(
      z.object({
        fromNodeId: z.string(),
        edges: z.array(
          z.object({
            toTopic: z.string(),
            relationshipType: z.enum(['PREREQUISITE', 'RELATED', 'SUBTOPIC']),
            strength: z.number().min(0).max(1).default(0.5),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const results = [];

      for (const edge of input.edges) {
        const normalizedToTopic = edge.toTopic.toLowerCase().trim();

        // Find or create the target node
        let toNode = await ctx.prisma.topicNode.findUnique({
          where: {
            userId_normalizedTopic: {
              userId: ctx.session.user.id,
              normalizedTopic: normalizedToTopic,
            },
          },
        });

        if (!toNode) {
          // Create as suggested node
          toNode = await ctx.prisma.topicNode.create({
            data: {
              userId: ctx.session.user.id,
              topic: edge.toTopic,
              normalizedTopic: normalizedToTopic,
              isExplored: false,
              isSuggested: true,
            },
          });
        }

        // Create edge if doesn't exist
        const existingEdge = await ctx.prisma.topicRelation.findUnique({
          where: {
            fromNodeId_toNodeId: {
              fromNodeId: input.fromNodeId,
              toNodeId: toNode.id,
            },
          },
        });

        if (!existingEdge) {
          const newEdge = await ctx.prisma.topicRelation.create({
            data: {
              fromNodeId: input.fromNodeId,
              toNodeId: toNode.id,
              relationshipType: edge.relationshipType,
              strength: edge.strength,
            },
          });
          results.push(newEdge);
        }
      }

      return results;
    }),

  /**
   * Update node position (for persisting layout)
   */
  updateNodePosition: protectedProcedure
    .input(
      z.object({
        nodeId: z.string(),
        positionX: z.number(),
        positionY: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const node = await ctx.prisma.topicNode.findFirst({
        where: { id: input.nodeId, userId: ctx.session.user.id },
      });

      if (!node) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Node not found',
        });
      }

      return ctx.prisma.topicNode.update({
        where: { id: input.nodeId },
        data: {
          positionX: input.positionX,
          positionY: input.positionY,
        },
      });
    }),

  /**
   * Get graph statistics
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const [totalNodes, exploredNodes, masteredNodes, totalEdges] = await Promise.all([
      ctx.prisma.topicNode.count({
        where: { userId: ctx.session.user.id },
      }),
      ctx.prisma.topicNode.count({
        where: { userId: ctx.session.user.id, isExplored: true },
      }),
      ctx.prisma.topicNode.count({
        where: { userId: ctx.session.user.id, masteryLevel: { gte: 0.8 } },
      }),
      ctx.prisma.topicRelation.count({
        where: { fromNode: { userId: ctx.session.user.id } },
      }),
    ]);

    return {
      totalNodes,
      exploredNodes,
      masteredNodes,
      suggestedNodes: totalNodes - exploredNodes,
      totalEdges,
    };
  }),
});
