/**
 * Billing Router
 *
 * Handles Stripe subscriptions and credit management
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import Stripe from 'stripe';

import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';

let stripeClient: Stripe | null = null;

function getStripeClient(): Stripe {
  if (stripeClient) return stripeClient;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Stripe is not configured',
    });
  }

  stripeClient = new Stripe(secretKey, {
    apiVersion: '2025-12-15.clover',
  });
  return stripeClient;
}

export const billingRouter = createTRPCRouter({
  /**
   * Get billing portal URL
   */
  getPortalUrl: protectedProcedure.mutation(async ({ ctx }) => {
    const stripe = getStripeClient();
    const subscription = await ctx.prisma.subscription.findUnique({
      where: { userId: ctx.session.user.id },
    });

    if (!subscription?.stripeCustomerId || subscription.stripeCustomerId.startsWith('temp_')) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No active subscription found',
      });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
    });

    return { url: portalSession.url };
  }),

  /**
   * Create checkout session for subscription
   */
  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        tier: z.enum(['PRO', 'PREMIUM']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const stripe = getStripeClient();
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.session.user.id },
        include: { subscription: true },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      let customerId = user.subscription?.stripeCustomerId;

      // Create Stripe customer if doesn't exist
      if (!customerId || customerId.startsWith('temp_')) {
        const customer = await stripe.customers.create({
          email: user.email!,
          name: user.name ?? undefined,
          metadata: { userId: user.id },
        });
        customerId = customer.id;

        // Update subscription with real Stripe customer ID
        await ctx.prisma.subscription.update({
          where: { userId: user.id },
          data: { stripeCustomerId: customerId },
        });
      }

      const priceId =
        input.tier === 'PRO'
          ? process.env.STRIPE_PRO_PRICE_ID!
          : process.env.STRIPE_PREMIUM_PRICE_ID!;

      const checkoutSession = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
        metadata: { userId: user.id, tier: input.tier },
      });

      return { url: checkoutSession.url };
    }),

  /**
   * Get current subscription details
   */
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const subscription = await ctx.prisma.subscription.findUnique({
      where: { userId: ctx.session.user.id },
    });

    const credits = await ctx.prisma.credits.findUnique({
      where: { userId: ctx.session.user.id },
    });

    return { subscription, credits };
  }),

  /**
   * Cancel subscription
   */
  cancelSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    const stripe = getStripeClient();
    const subscription = await ctx.prisma.subscription.findUnique({
      where: { userId: ctx.session.user.id },
    });

    if (!subscription?.stripeSubscriptionId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No active subscription to cancel',
      });
    }

    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    await ctx.prisma.subscription.update({
      where: { userId: ctx.session.user.id },
      data: { cancelAtPeriodEnd: true },
    });

    return { success: true };
  }),

  /**
   * Resume a cancelled subscription
   */
  resumeSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    const stripe = getStripeClient();
    const subscription = await ctx.prisma.subscription.findUnique({
      where: { userId: ctx.session.user.id },
    });

    if (!subscription?.stripeSubscriptionId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No subscription to resume',
      });
    }

    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    await ctx.prisma.subscription.update({
      where: { userId: ctx.session.user.id },
      data: { cancelAtPeriodEnd: false },
    });

    return { success: true };
  }),

  /**
   * Get payment history
   */
  getPaymentHistory: protectedProcedure.query(async ({ ctx }) => {
    const stripe = getStripeClient();
    const subscription = await ctx.prisma.subscription.findUnique({
      where: { userId: ctx.session.user.id },
    });

    if (!subscription?.stripeCustomerId || subscription.stripeCustomerId.startsWith('temp_')) {
      return { payments: [] };
    }

    const invoices = await stripe.invoices.list({
      customer: subscription.stripeCustomerId,
      limit: 10,
    });

    return {
      payments: invoices.data.map((invoice) => ({
        id: invoice.id,
        amount: invoice.amount_paid / 100,
        currency: invoice.currency,
        status: invoice.status,
        date: new Date(invoice.created * 1000),
        pdfUrl: invoice.invoice_pdf,
      })),
    };
  }),
});
