import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import {
  checkPublicIpRateLimit,
  issueEmailVerificationForUser,
} from '@/lib/verificationService';

export const dynamic = 'force-dynamic';

const GENERIC_RESEND_MESSAGE =
  'If an unverified account exists for that email address, a verification link has been dispatched.';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const sessionUser = await getSessionUser();

    if (sessionUser) {
      if (
        typeof body?.email === 'string' &&
        body.email.trim() !== '' &&
        body.email.trim().toLowerCase() !== sessionUser.email.toLowerCase()
      ) {
        return NextResponse.json(
          { error: 'Forbidden. You can only verify your own registered email address.' },
          { status: 403 }
        );
      }

      const result = await issueEmailVerificationForUser(sessionUser.id, {
        originUrl: new URL(req.url).origin,
      });

      if (!result.ok) {
        return NextResponse.json(
          {
            error: result.error,
            code: result.code,
            ...(result.retryAfterSeconds !== undefined
              ? { retryAfterSeconds: result.retryAfterSeconds }
              : {}),
          },
          { status: result.status }
        );
      }

      return NextResponse.json({
        success: true,
        alreadyVerified: Boolean(result.alreadyVerified),
        deliveryMode: result.deliveryMode,
        expiresAt: result.expiresAt || null,
        cooldownSeconds: result.cooldownSeconds,
        message: result.message,
      });
    }

    // Unauthenticated public resend: rate-limit by caller IP and never reveal account existence
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';
    if (!checkPublicIpRateLimit(clientIp)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before trying again.', code: 'RATE_LIMITED' },
        { status: 429 }
      );
    }

    const rawEmail = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.', code: 'INVALID_EMAIL' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: rawEmail },
      select: { id: true, emailVerifiedAt: true },
    });

    if (user && !user.emailVerifiedAt) {
      const result = await issueEmailVerificationForUser(user.id, {
        originUrl: new URL(req.url).origin,
      });
      if (!result.ok && result.code === 'DELIVERY_PROVIDER_UNCONFIGURED') {
        return NextResponse.json(
          { error: result.error, code: result.code },
          { status: result.status }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: GENERIC_RESEND_MESSAGE,
    });
  } catch (error) {
    console.error('Error handling email verification resend:', error);
    return NextResponse.json({ error: 'Failed to process verification request.' }, { status: 500 });
  }
}
