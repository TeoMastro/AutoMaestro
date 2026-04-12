import { NextRequest, NextResponse } from 'next/server';
import { stripe, getTierFromPriceId } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import logger from '@/lib/logger';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (error) {
    logger.error('Webhook signature verification failed', {
      error: (error as Error).message,
    });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabaseAdmin = createAdminClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;

        if (!userId || session.mode !== 'subscription') break;

        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id;

        if (!subscriptionId) break;

        // Fetch the subscription to get price info
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const subItem = subscription.items.data[0];
        const priceId = subItem?.price?.id;
        const tier = priceId ? getTierFromPriceId(priceId) : null;
        const periodEnd = subItem?.current_period_end;

        await supabaseAdmin
          .from('profiles')
          .update({
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscriptionId,
            subscription_status: 'active',
            subscription_tier: tier,
            subscription_end_date: periodEnd
              ? new Date(periodEnd * 1000).toISOString()
              : null,
            trial_ends_at: null,
          })
          .eq('id', userId);

        logger.info('Subscription activated via checkout', { userId, tier, subscriptionId });
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        if (!userId) break;

        const subItemUpdated = subscription.items.data[0];
        const priceId = subItemUpdated?.price?.id;
        const tier = priceId ? getTierFromPriceId(priceId) : null;
        const periodEndUpdated = subItemUpdated?.current_period_end;

        const statusMap: Record<string, string> = {
          active: 'active',
          past_due: 'past_due',
          canceled: 'canceled',
          unpaid: 'unpaid',
          incomplete: 'past_due',
          incomplete_expired: 'canceled',
          trialing: 'trialing',
          paused: 'canceled',
        };

        const mappedStatus = statusMap[subscription.status] || 'none';

        await supabaseAdmin
          .from('profiles')
          .update({
            subscription_status: mappedStatus,
            subscription_tier: tier,
            subscription_end_date: periodEndUpdated
              ? new Date(periodEndUpdated * 1000).toISOString()
              : null,
          })
          .eq('id', userId);

        logger.info('Subscription updated', { userId, status: mappedStatus, tier });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        if (!userId) break;

        await supabaseAdmin
          .from('profiles')
          .update({
            subscription_status: 'canceled',
            subscription_tier: null,
            trial_ends_at: null,
          })
          .eq('id', userId);

        logger.info('Subscription canceled', { userId });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;

        if (!customerId) break;

        await supabaseAdmin
          .from('profiles')
          .update({ subscription_status: 'past_due' })
          .eq('stripe_customer_id', customerId);

        logger.info('Payment failed', { customerId });
        break;
      }

      default:
        logger.info('Unhandled webhook event', { type: event.type });
    }
  } catch (error) {
    logger.error('Webhook handler error', {
      type: event.type,
      error: (error as Error).message,
    });
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
