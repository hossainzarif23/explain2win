/**
 * tRPC Server Configuration
 *
 * This file sets up the tRPC server with context and procedures
 */
import { initTRPC, TRPCError } from '@trpc/server';
import { type Session } from 'next-auth';
import superjson from 'superjson';
import { ZodError } from 'zod';

import { prisma } from '@/server/db/client';
import { auth } from '@/server/auth/auth.config';

/**
 * Context passed to all tRPC procedures
 */
export interface Context {
  prisma: typeof prisma;
  session: Session | null;
}

/**
 * Create context for each request
 */
export const createContext = async (): Promise<Context> => {
  const session = await auth();

  return {
    prisma,
    session,
  };
};

/**
 * Initialize tRPC
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Export reusable router and procedure helpers
 */
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

/**
 * Public procedure - no authentication required
 */
export const publicProcedure = t.procedure;

/**
 * Middleware to check if user is authenticated
 */
const enforceAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

/**
 * Protected procedure - requires authentication
 */
export const protectedProcedure = t.procedure.use(enforceAuth);

/**
 * Middleware to check subscription tier
 */
const enforceSubscription = (requiredTiers: string[]) =>
  t.middleware(async ({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    const subscription = await ctx.prisma.subscription.findUnique({
      where: { userId: ctx.session.user.id },
    });

    const userTier = subscription?.tier ?? 'FREE';

    if (!requiredTiers.includes(userTier)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Upgrade your plan to access this feature',
      });
    }

    return next({
      ctx: {
        ...ctx,
        subscription,
      },
    });
  });

/**
 * Pro procedure - requires PRO or PREMIUM tier
 */
export const proProcedure = protectedProcedure.use(enforceSubscription(['PRO', 'PREMIUM']));

/**
 * Premium procedure - requires PREMIUM tier only
 */
export const premiumProcedure = protectedProcedure.use(enforceSubscription(['PREMIUM']));
