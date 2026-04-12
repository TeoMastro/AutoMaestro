import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Role } from '@/lib/constants';
import logger from '@/lib/logger';

export async function POST() {
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
      .select('role, stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== Role.MANAGER) {
      return NextResponse.json({ error: 'Only managers can access the portal' }, { status: 403 });
    }

    if (!profile.stripe_customer_id) {
      return NextResponse.json({ error: 'No Stripe customer found' }, { status: 400 });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile`,
    });

    logger.info('Portal session created', { userId: user.id });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    logger.error('Error creating portal session', {
      error: (error as Error).message,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
