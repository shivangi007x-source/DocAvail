import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { cancelPatientAppointment } from '@/lib/appointmentService';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuthUser(req, ['PATIENT', 'ADMIN'], {
      forbiddenMessage: 'Only registered patient accounts can cancel appointments.',
    });
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => ({}));
    const action = typeof body?.action === 'string' ? body.action.trim().toUpperCase() : 'CANCEL';

    if (action !== 'CANCEL') {
      return NextResponse.json({ error: 'Invalid action. Expected CANCEL.' }, { status: 400 });
    }

    const result = await cancelPatientAppointment(params.id, auth.user.id, auth.user.role);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      message: 'Appointment cancelled. The time slot has been released.',
      appointment: result.appointment,
    });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    return NextResponse.json({ error: 'Failed to cancel appointment' }, { status: 500 });
  }
}
