/**
 * Next.js Edge Middleware — Route Protection
 *
 * Reference: SoulLink — Admin, Moderator & Analytics Walkthrough Plan
 * Section: "2. Login Flow → Role-Based Dashboard Redirect"
 *
 * Protects /admin and /moderation routes at the edge (before the page renders).
 * Reads the `userRole` cookie that is set on successful login in the
 * `login/page.tsx` component. If the cookie is absent or insufficient,
 * the request is redirected to /login immediately.
 *
 * Role access rules:
 *   /admin/*      → requires cookie userRole === 'ADMIN'
 *   /moderation/* → requires cookie userRole === 'ADMIN' | 'MODERATOR'
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_ROLES  = ['ADMIN'] as const;
const MOD_ROLES    = ['ADMIN', 'MODERATOR'] as const;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Read auth cookies set at login
  const token    = request.cookies.get('sl_token')?.value;
  const userRole = request.cookies.get('sl_role')?.value;

  // ── Guard: /admin/* ──────────────────────────────────────────────────────
  if (pathname.startsWith('/admin')) {
    if (!token || !ADMIN_ROLES.includes(userRole as typeof ADMIN_ROLES[number])) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      loginUrl.searchParams.set('reason', 'auth_required');
      return NextResponse.redirect(loginUrl);
    }
  }

  // ── Guard: /moderation/* ────────────────────────────────────────────────
  if (pathname.startsWith('/moderation')) {
    if (!token || !MOD_ROLES.includes(userRole as typeof MOD_ROLES[number])) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      loginUrl.searchParams.set('reason', 'auth_required');
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

/**
 * Matcher config — only run this middleware on protected paths.
 * Static files, API routes, and Next.js internals are excluded automatically.
 */
export const config = {
  matcher: [
    '/admin/:path*',
    '/moderation/:path*',
  ],
};
