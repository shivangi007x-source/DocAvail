import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { markAllNotificationsAsRead } from '@/lib/notificationService';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuthUser(req, ['PATIENT', 'DOCTOR', 'ADMIN']);
    if (!auth.ok) return auth.response;

    const result = await markAllNotificationsAsRead(auth.user.id);

    return NextResponse.json({
      success: true,
      updatedCount: result.updatedCount,
      unreadCount: result.unreadCount,
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json({ error: 'Failed to mark notifications as read.' }, { status: 500 });
  }
}
