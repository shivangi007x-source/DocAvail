import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { verifyPhoneOtpForUser } from '@/lib/verificationService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthUser(req, ['PATIENT', 'DOCTOR', 'ADMIN']);
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => ({}));
    const rawOtp = typeof body?.otp === 'string' ? body.otp : '';
    const rawPhone = typeof body?.phone === 'string' ? body.phone : undefined;

    const result = await verifyPhoneOtpForUser(auth.user.id, rawOtp, rawPhone);
    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          code: result.code,
          ...(result.remainingAttempts !== undefined
            ? { remainingAttempts: result.remainingAttempts }
            : {}),
        },
        { status: result.status }
      );
    }

    return NextResponse.json({
      success: true,
      phoneE164: result.phoneE164,
      phoneMasked: result.phoneMasked,
      phoneVerifiedAt: result.phoneVerifiedAt,
      message: result.message,
    });
  } catch (error) {
    console.error('Error verifying phone OTP:', error);
    return NextResponse.json({ error: 'Failed to verify OTP.' }, { status: 500 });
  }
}
