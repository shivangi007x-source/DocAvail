import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { markNotificationAsRead } from '@/lib/notificationService';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuthUser(req, ['PATIENT', 'DOCTOR', 'ADMIN']);
    if (!auth.ok) return auth.response;

    const result = await markNotificationAsRead(params.id, auth.user.id, auth.user.role);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      notification: result.notification,
      unreadCount: result.unreadCount,
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json({ error: 'Failed to update notification.' }, { status: 500 });
  }
}
