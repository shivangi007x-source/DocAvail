import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthUser } from '@/lib/auth';

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

    const formatted = appointments.map((a) => ({
      id: a.id,
      patientId: a.patientId,
      patientProfileId: a.patient.patientProfile?.id || null,
      patientName: a.patient.name,
      patientEmail: a.patient.email,
      phone: a.patient.patientProfile?.phone || null,
      date: a.date.toISOString(),
      startTime: a.startTime,
      endTime: a.endTime,
      status: a.status,
      consultationType: a.consultationType,
      reasonForVisit: a.reasonForVisit,
      patientNotes: a.patientNotes,
      doctorNotes: a.doctorNotes,
      createdAt: a.createdAt.toISOString(),
    }));

    return NextResponse.json({ appointments: formatted });
  } catch (error) {
    console.error('Error fetching doctor appointments:', error);
    return NextResponse.json({ error: 'Failed to retrieve appointments' }, { status: 500 });
  }
}
