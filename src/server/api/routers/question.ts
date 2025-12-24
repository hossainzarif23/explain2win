import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const questionRouter = createTRPCRouter({
  /**
   * Get all questions saved in the user's bank
   * Grouped by explanation/topic
   */
  getBank: protectedProcedure.query(async ({ ctx }) => {
    const explanations = await ctx.prisma.explanation.findMany({
      where: { userId: ctx.session.user.id },
      include: {
        questions: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return explanations.map((exp) => ({
      id: exp.id,
      topic: exp.topic,
      createdAt: exp.createdAt,
      questionCount: exp.questions.length,
      questions: exp.questions,
    }));
  }),

  /**
   * Delete a question from the bank
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const question = await ctx.prisma.question.findUnique({
        where: { id: input.id },
        include: { explanationRef: true },
      });

      if (!question || question.explanationRef.userId !== ctx.session.user.id) {
        throw new Error("Question not found or unauthorized");
      }

      return ctx.prisma.question.delete({
        where: { id: input.id },
      });
    }),
});
