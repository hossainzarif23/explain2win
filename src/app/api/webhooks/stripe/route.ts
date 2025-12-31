/**
 * Stripe Webhook Handler
 *
 * Handles Stripe webhook events for subscription management
 */
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/server/db/client';
import { TIER_LIMITS } from '@/lib/constants';

function getStripeClient() {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
  return new Stripe(apiKey, {
    apiVersion: '2025-12-15.clover',
  });
}

export async function POST(request: NextRequest) {
  const stripe = getStripeClient();

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(stripe, session);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }
}

async function handleCheckoutComplete(stripe: Stripe, session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const tier = session.metadata?.tier as 'PRO' | 'PREMIUM';

  if (!userId || !tier) return;

  const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

  await prisma.subscription.update({
    where: { userId },
    data: {
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0]?.price.id,
      tier,
      status: 'ACTIVE',
    },
  });

  // Update credits for new tier
  const newCredits = TIER_LIMITS[tier].monthlyCredits;
  if (newCredits !== Infinity) {
    await prisma.credits.update({
      where: { userId },
      data: { balance: newCredits },
    });
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const dbSubscription = await prisma.subscription.findUnique({
    where: { stripeCustomerId: customerId },
  });

  if (!dbSubscription) return;

  // Refill credits on successful payment
  const tier = dbSubscription.tier as keyof typeof TIER_LIMITS;
  const monthlyCredits = TIER_LIMITS[tier].monthlyCredits;

  if (monthlyCredits !== Infinity) {
    const credits = await prisma.credits.findUnique({
      where: { userId: dbSubscription.userId },
    });

    if (credits) {
      await prisma.$transaction([
        prisma.credits.update({
          where: { userId: dbSubscription.userId },
          data: { balance: monthlyCredits },
        }),
        prisma.creditUsage.create({
          data: {
            creditsId: credits.id,
            amount: monthlyCredits,
            type: 'MONTHLY_REFILL',
            description: `Monthly credit refill (${tier})`,
          },
        }),
      ]);
    }
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const dbSubscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!dbSubscription) return;

  // Determine tier from price ID
  let tier: 'FREE' | 'PRO' | 'PREMIUM' = 'FREE';
  const priceId = subscription.items.data[0]?.price.id;

  if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
    tier = 'PRO';
  } else if (priceId === process.env.STRIPE_PREMIUM_PRICE_ID) {
    tier = 'PREMIUM';
  }

  await prisma.subscription.update({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      tier,
      status: subscription.status === 'active' ? 'ACTIVE' : 'PAST_DUE',
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const dbSubscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!dbSubscription) return;

  // Clear Stripe identifiers and downgrade tier
  await prisma.subscription.update({
    where: { userId: dbSubscription.userId },
    data: {
      tier: 'FREE',
      status: 'CANCELED',
      stripeSubscriptionId: null,
      stripePriceId: null,
      cancelAtPeriodEnd: false,
    },
  });

  // Reset to free tier credits
  await prisma.credits.update({
    where: { userId: dbSubscription.userId },
    data: { balance: TIER_LIMITS.FREE.monthlyCredits },
  });
}
