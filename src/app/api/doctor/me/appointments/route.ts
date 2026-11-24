import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthUser } from '@/lib/auth';
import {
  compareAppointmentsChronologically,
  computeSlotRange,
  toIstDateKey,
} from '@/lib/appointmentTime';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuthUser(req, ['DOCTOR', 'ADMIN']);
    if (!auth.ok) return auth.response;
    const payload = { userId: auth.user.id };

    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: payload.userId },
    });

    if (!doctorProfile) {
      return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 });
    }

    const appointments = await prisma.appointment.findMany({
      where: { doctorId: doctorProfile.id },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            patientProfile: {
              select: {
                id: true,
                phone: true,
                location: true,
                bloodGroup: true,
              },
            },
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    const formatted = appointments
      .map((a) => {
        const range = computeSlotRange(a.startTime, 30, a.endTime);
        return {
          id: a.id,
          patientId: a.patientId,
          patientProfileId: a.patient.patientProfile?.id || null,
          patientName: a.patient.name,
          patientEmail: a.patient.email,
          phone: a.patient.patientProfile?.phone || null,
          date: a.date.toISOString(),
          appointmentDateKey: a.appointmentDateKey || toIstDateKey(a.date),
          startTime: range?.startTime || a.startTime,
          endTime: range?.endTime || a.endTime,
          status: a.status,
          consultationType: a.consultationType,
          reasonForVisit: a.reasonForVisit,
          symptoms: a.symptoms,
          existingConditions: a.existingConditions,
          currentMedications: a.currentMedications,
          knownAllergies: a.knownAllergies,
          patientNotes: a.patientNotes,
          doctorNotes: a.doctorNotes,
          createdAt: a.createdAt.toISOString(),
        };
      })
      .sort((a, b) => compareAppointmentsChronologically(a, b, 'desc'));

    return NextResponse.json(
      { appointments: formatted },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (error) {
    console.error('Error fetching doctor appointments:', error);
    return NextResponse.json({ error: 'Failed to retrieve appointments' }, { status: 500 });
  }
}
