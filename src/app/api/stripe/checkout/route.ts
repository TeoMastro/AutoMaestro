import { NextRequest, NextResponse } from 'next/server';
import { stripe, getTierFromPriceId } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Role } from '@/lib/constants';
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
      .select('role, email, first_name, last_name, stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== Role.MANAGER) {
      return NextResponse.json({ error: 'Only managers can subscribe' }, { status: 403 });
    }

    const { priceId } = await req.json();

    // Validate the price ID maps to a known tier
    const tier = getTierFromPriceId(priceId);
    if (!tier) {
      return NextResponse.json({ error: 'Invalid price ID' }, { status: 400 });
    }

    // Reuse existing Stripe customer or create a new one
    let customerId = profile.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email,
        name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
        metadata: { userId: user.id },
        ...(process.env.STRIPE_TEST_CLOCK_ID && { test_clock: process.env.STRIPE_TEST_CLOCK_ID }),
      });

      customerId = customer.id;

      await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);

      logger.info('Stripe customer created', { userId: user.id, customerId });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      currency: 'eur',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?subscription=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      subscription_data: {
        metadata: { userId: user.id, tier },
      },
      metadata: { userId: user.id },
      allow_promotion_codes: true,
    });

    logger.info('Checkout session created', {
      userId: user.id,
      sessionId: checkoutSession.id,
      tier,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    logger.error('Error creating checkout session', {
      error: (error as Error).message,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
