import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { Role } from '@/lib/constants';

export default async function middleware(req: NextRequest) {
  const { supabase, user, supabaseResponse } = await updateSession(req);

  const pathname = req.nextUrl.pathname;

  // Skip auth pages — never block access to them
  if (pathname.startsWith('/auth')) {
    return supabaseResponse;
  }

  // Protect authenticated routes — redirect to signin if not logged in
  const protectedPaths = [
    '/dashboard',
    '/profile',
    '/settings',
    '/admin',
    '/manage',
    '/chat-history',
    '/trigger-history',
    '/workflow',
    '/pricing',
  ];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/auth/signin', req.url));
  }

  // For authenticated users, check profile
  if (user && isProtected) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status, subscription_status, trial_ends_at')
      .eq('id', user.id)
      .single();

    // If profile not found or inactive, redirect to signin
    if (!profile || profile.status !== 'ACTIVE') {
      const redirectResponse = NextResponse.redirect(new URL('/auth/signin', req.url));
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value);
      });
      return redirectResponse;
    }

    // Admin route protection (admin-only)
    if (pathname.startsWith('/admin') && profile.role !== Role.ADMIN) {
      return NextResponse.redirect(new URL('/auth/signin', req.url));
    }

    // Manage route protection (admin + manager)
    if (pathname.startsWith('/manage') && profile.role !== Role.ADMIN && profile.role !== Role.MANAGER) {
      return NextResponse.redirect(new URL('/auth/signin', req.url));
    }

    // ── Subscription gate ──
    // Paths exempt from subscription checks
    const subscriptionExemptPaths = ['/pricing', '/profile', '/settings'];
    const isSubscriptionExempt = subscriptionExemptPaths.some((p) => pathname.startsWith(p));

    if (!isSubscriptionExempt && profile.role !== Role.ADMIN) {
      if (profile.role === Role.MANAGER) {
        const hasActiveSub = isSubActive(profile.subscription_status, profile.trial_ends_at);
        if (!hasActiveSub) {
          return NextResponse.redirect(new URL('/pricing', req.url));
        }
      }

      if (profile.role === Role.CLIENT) {
        // Check if the client's manager has an active subscription
        // We use the SQL function via RPC through the admin supabase client
        // But in middleware we only have the user's supabase client (RLS-scoped).
        // Instead, do a lightweight check: query the manager's subscription
        // via the user_companies + profiles join.
        const { data: managerSub } = await supabase.rpc('any_manager_has_active_sub', {
          p_client_id: user.id,
        });

        if (managerSub !== true) {
          return NextResponse.redirect(new URL('/subscription-expired', req.url));
        }
      }
    }
  }

  // Protect API routes — allow Bearer-token routes used by n8n and Stripe webhook
  const bearerApiPaths = ['/api/logs/', '/api/knowledge-search', '/api/stripe/webhook'];
  const isBearerApi = bearerApiPaths.some((p) => pathname.startsWith(p));
  if (pathname.startsWith('/api') && !user && !isBearerApi) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Protect admin API routes (defense in depth)
  if (pathname.startsWith('/api/users') && user) {
    const { data: apiProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

    if (!apiProfile || apiProfile.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  return supabaseResponse;
}

/**
 * Lightweight subscription check for middleware.
 */
function isSubActive(subscriptionStatus: string | null, trialEndsAt: string | null): boolean {
  if (subscriptionStatus === 'active' || subscriptionStatus === 'past_due') {
    return true;
  }
  if (subscriptionStatus === 'trialing' && trialEndsAt) {
    return new Date(trialEndsAt) > new Date();
  }
  return false;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/profile/:path*',
    '/settings/:path*',
    '/admin/:path*',
    '/manage/:path*',
    '/auth/:path*',
    '/api/:path*',
    '/chat-history/:path*',
    '/trigger-history/:path*',
    '/workflow/:path*',
    '/pricing/:path*',
    '/subscription-expired',
  ],
};
