/**
 * Root Router
 *
 * Combines all tRPC routers into a single app router
 */
import { createTRPCRouter } from '@/server/api/trpc';
import { userRouter } from '@/server/api/routers/user';
import { explanationRouter } from '@/server/api/routers/explanation';
import { quizRouter } from '@/server/api/routers/quiz';
import { progressRouter } from '@/server/api/routers/progress';
import { billingRouter } from '@/server/api/routers/billing';
import { questionRouter } from '@/server/api/routers/question';
import { studySessionRouter } from '@/server/api/routers/study-session';
import { dashboardRouter } from '@/server/api/routers/dashboard';
import { comparisonRouter } from '@/server/api/routers/comparison';

/**
 * Main app router - combines all feature routers
 */
export const appRouter = createTRPCRouter({
  user: userRouter,
  explanation: explanationRouter,
  quiz: quizRouter,
  progress: progressRouter,
  billing: billingRouter,
  question: questionRouter,
  studySession: studySessionRouter,
  dashboard: dashboardRouter,
  comparison: comparisonRouter,
});


// Export type for client-side type inference
export type AppRouter = typeof appRouter;
