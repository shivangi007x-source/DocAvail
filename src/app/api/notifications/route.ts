import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { getUserNotifications } from '@/lib/notificationService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuthUser(req, ['PATIENT', 'DOCTOR', 'ADMIN']);
    if (!auth.ok) return auth.response;

    const rawLimit = Number(req.nextUrl.searchParams.get('limit') || '40');
    const limit = Number.isFinite(rawLimit) ? rawLimit : 40;

    const data = await getUserNotifications(auth.user.id, auth.user.role, limit);

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Failed to retrieve notifications.' }, { status: 500 });
  }
}
