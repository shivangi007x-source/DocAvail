import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { createPatientAppointment } from '@/lib/appointmentService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthUser(req, ['PATIENT', 'ADMIN'], {
      forbiddenMessage: 'Only approved patient accounts can schedule appointments.',
    });
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const result = await createPatientAppointment(auth.user.id, body);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      message: `Appointment scheduled with ${result.appointment.doctorName}`,
      appointment: result.appointment,
    });
  } catch (error) {
    console.error('Error creating appointment:', error);
    return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 });
  }
}
