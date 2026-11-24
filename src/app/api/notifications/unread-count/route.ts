import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { getUnreadNotificationCount } from '@/lib/notificationService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuthUser(req, ['PATIENT', 'DOCTOR', 'ADMIN']);
    if (!auth.ok) return auth.response;

    const unreadCount = await getUnreadNotificationCount(auth.user.id);

    return NextResponse.json(
      { unreadCount },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (error) {
    console.error('Error fetching unread notification count:', error);
    return NextResponse.json({ error: 'Failed to retrieve unread count.' }, { status: 500 });
  }
}
