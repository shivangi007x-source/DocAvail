import { NextRequest, NextResponse } from 'next/server';
import { verifyEmailWithToken } from '@/lib/verificationService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === 'string' ? body.token : '';

    const result = await verifyEmailWithToken(token);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: result.status }
      );
    }

    return NextResponse.json({
      success: true,
      email: result.email,
      emailVerifiedAt: result.emailVerifiedAt,
      message: result.message,
    });
  } catch (error) {
    console.error('Error verifying email token:', error);
    return NextResponse.json({ error: 'Failed to verify email token.' }, { status: 500 });
  }
}
