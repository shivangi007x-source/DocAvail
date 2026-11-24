import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { issueEmailVerificationForUser } from '@/lib/verificationService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthUser(req, ['PATIENT', 'DOCTOR', 'ADMIN']);
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => ({}));
    if (
      typeof body?.email === 'string' &&
      body.email.trim() !== '' &&
      body.email.trim().toLowerCase() !== auth.user.email.toLowerCase()
    ) {
      return NextResponse.json(
        { error: 'Forbidden. You can only verify your own registered email address.' },
        { status: 403 }
      );
    }

    const result = await issueEmailVerificationForUser(auth.user.id, {
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
  } catch (error) {
    console.error('Error sending email verification:', error);
    return NextResponse.json({ error: 'Failed to send verification email.' }, { status: 500 });
  }
}
