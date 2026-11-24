import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { getUserVerificationStatus } from '@/lib/verificationService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuthUser(req, ['PATIENT', 'DOCTOR', 'ADMIN']);
    if (!auth.ok) return auth.response;

    const status = await getUserVerificationStatus(auth.user.id);
    if (!status) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json(status, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (error) {
    console.error('Error fetching verification status:', error);
    return NextResponse.json({ error: 'Failed to retrieve verification status.' }, { status: 500 });
  }
}
