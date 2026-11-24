import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJwtToken, TOKEN_COOKIE_NAME } from '@/lib/jwt';

function uncachedRedirect(url: URL) {
  const res = NextResponse.redirect(url);
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protected paths
  const isPatientRoute = pathname.startsWith('/patient');
  const isDoctorRoute = pathname.startsWith('/doctor');
  const isAdminRoute = pathname.startsWith('/admin');

  if (!isPatientRoute && !isDoctorRoute && !isAdminRoute) {
    return NextResponse.next();
  }

  const token = req.cookies.get(TOKEN_COOKIE_NAME)?.value;

  if (!token) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return uncachedRedirect(loginUrl);
  }

  const payload = await verifyJwtToken(token);

  if (!payload) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return uncachedRedirect(loginUrl);
  }

  const role = payload.role;
  const approvalStatus = payload.approvalStatus;

  // Enforce approval status in Edge middleware for protected portals.
  // Patients do not require admin approval; only explicitly REJECTED patients are blocked.
  const isBlockedPending = role !== 'PATIENT' && approvalStatus === 'PENDING';
  const isMissingStatus =
    approvalStatus !== 'APPROVED' && approvalStatus !== 'PENDING' && approvalStatus !== 'REJECTED';

  if (approvalStatus === 'REJECTED' || isBlockedPending) {
    const unauthorizedUrl = new URL('/unauthorized', req.url);
    unauthorizedUrl.searchParams.set(
      'status',
      approvalStatus === 'REJECTED' ? 'rejected' : 'pending'
    );
    return uncachedRedirect(unauthorizedUrl);
  }

  if (isMissingStatus) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return uncachedRedirect(loginUrl);
  }

  // Role-based Access Control (RBAC) enforcement
  if (isPatientRoute && role !== 'PATIENT' && role !== 'ADMIN') {
    return uncachedRedirect(new URL('/unauthorized', req.url));
  }

  if (isDoctorRoute && role !== 'DOCTOR' && role !== 'ADMIN') {
    return uncachedRedirect(new URL('/unauthorized', req.url));
  }

  if (isAdminRoute && role !== 'ADMIN') {
    return uncachedRedirect(new URL('/unauthorized', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/patient/:path*', '/doctor/:path*', '/admin/:path*'],
};
