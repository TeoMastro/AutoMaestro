import { NextRequest, NextResponse } from 'next/server';
import { stripe, getTierFromPriceId } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Role, TIER_LIMITS, SubscriptionTier } from '@/lib/constants';
import { getResourceUsage } from '@/lib/subscription';
import logger from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = createAdminClient();
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, stripe_customer_id, stripe_subscription_id, subscription_tier')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== Role.MANAGER) {
      return NextResponse.json({ error: 'Only managers can switch plans' }, { status: 403 });
    }

    if (!profile.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription to switch' }, { status: 400 });
    }

    const { priceId } = await req.json();

    const targetTier = getTierFromPriceId(priceId);
    if (!targetTier) {
      return NextResponse.json({ error: 'Invalid price ID' }, { status: 400 });
    }

    // Check if this is a downgrade and enforce resource limits
    const isDowngrade = isDowngradeTier(profile.subscription_tier as SubscriptionTier, targetTier);

    if (isDowngrade) {
      const usage = await getResourceUsage(user.id);
      const targetLimits = TIER_LIMITS[targetTier];

      const exceeded: string[] = [];
      if (usage.companies.current > targetLimits.companies) exceeded.push('companies');
      if (usage.workflows.current > targetLimits.workflows) exceeded.push('workflows');
      if (usage.clients.current > targetLimits.clients) exceeded.push('clients');

      if (exceeded.length > 0) {
        logger.info('Downgrade blocked due to resource limits', {
          userId: user.id,
          targetTier,
          exceeded,
          usage: {
            companies: usage.companies.current,
            workflows: usage.workflows.current,
            clients: usage.clients.current,
          },
          targetLimits,
        });

        return NextResponse.json(
          {
            error: 'downgradeBlocked',
            exceeded,
            usage: {
              companies: usage.companies.current,
              workflows: usage.workflows.current,
              clients: usage.clients.current,
            },
            targetLimits: {
              companies: targetLimits.companies,
              workflows: targetLimits.workflows,
              clients: targetLimits.clients,
            },
          },
          { status: 422 }
        );
      }
    }

    // Retrieve the current subscription to get the existing item ID
    const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
    const currentItem = subscription.items.data[0];

    if (!currentItem) {
      return NextResponse.json({ error: 'No subscription item found' }, { status: 400 });
    }

    // Update the subscription: swap the price on the existing item
    const updatedSubscription = await stripe.subscriptions.update(profile.stripe_subscription_id, {
      items: [
        {
          id: currentItem.id,
          price: priceId,
        },
      ],
      proration_behavior: 'create_prorations',
      metadata: { userId: user.id, tier: targetTier },
    });

    logger.info('Plan switched', {
      userId: user.id,
      from: profile.subscription_tier,
      to: targetTier,
      subscriptionId: updatedSubscription.id,
    });

    return NextResponse.json({ success: true, tier: targetTier });
  } catch (error) {
    logger.error('Error switching plan', {
      error: (error as Error).message,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const TIER_ORDER: Record<SubscriptionTier, number> = {
  freelancer: 1,
  agency: 2,
  scale: 3,
};

function isDowngradeTier(current: SubscriptionTier | null, target: SubscriptionTier): boolean {
  if (!current) return false;
  return (TIER_ORDER[target] ?? 0) < (TIER_ORDER[current] ?? 0);
}
