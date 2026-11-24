import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { sendPhoneVerificationOtp } from '@/lib/verificationService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthUser(req, ['PATIENT', 'DOCTOR', 'ADMIN']);
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => ({}));
    const rawPhone = typeof body?.phone === 'string' ? body.phone : undefined;

    const result = await sendPhoneVerificationOtp(auth.user.id, rawPhone);
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

    // Never expose raw OTP in API responses
    return NextResponse.json({
      success: true,
      phoneE164: result.phoneE164,
      phoneMasked: result.phoneMasked,
      expiresAt: result.expiresAt,
      cooldownSeconds: result.cooldownSeconds,
      deliveryMode: result.deliveryMode,
      message: result.message,
    });
  } catch (error) {
    console.error('Error sending phone OTP:', error);
    return NextResponse.json({ error: 'Failed to send verification OTP.' }, { status: 500 });
  }
}
