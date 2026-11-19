import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJwtToken, TOKEN_COOKIE_NAME } from '@/lib/jwt';

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
    return NextResponse.redirect(loginUrl);
  }

  const payload = await verifyJwtToken(token);

  if (!payload) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = payload.role;
  const approvalStatus = payload.approvalStatus;

  // Enforce approval status in Edge middleware for protected portals
  if (approvalStatus !== 'APPROVED') {
    const unauthorizedUrl = new URL('/unauthorized', req.url);
    if (approvalStatus === 'REJECTED') {
      unauthorizedUrl.searchParams.set('status', 'rejected');
    } else if (approvalStatus === 'PENDING') {
      unauthorizedUrl.searchParams.set('status', 'pending');
    } else {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.redirect(unauthorizedUrl);
  }

  // Role-based Access Control (RBAC) enforcement
  if (isPatientRoute && role !== 'PATIENT' && role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/unauthorized', req.url));
  }

  if (isDoctorRoute && role !== 'DOCTOR' && role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/unauthorized', req.url));
  }

  if (isAdminRoute && role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/unauthorized', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/patient/:path*', '/doctor/:path*', '/admin/:path*'],
};
