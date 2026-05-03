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
  ];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/auth/signin', req.url));
  }

  // For authenticated users, check profile
  if (user && isProtected) {
    const { data: profile } = await supabase.from('profiles').select('role, status').eq('id', user.id).single();

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
  }

  // Protect API routes — allow Bearer-token routes used by n8n
  const bearerApiPaths = ['/api/logs/', '/api/knowledge-search'];
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
  ],
};
