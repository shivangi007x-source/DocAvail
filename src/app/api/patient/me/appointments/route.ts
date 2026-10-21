import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJwtToken, TOKEN_COOKIE_NAME } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(TOKEN_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyJwtToken(token);
    if (!payload || (payload.role !== 'PATIENT' && payload.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const appointments = await prisma.appointment.findMany({
      where: { patientId: payload.userId },
      include: {
        doctor: {
          include: {
            user: {
              select: {
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    const formatted = appointments.map((a) => ({
      id: a.id,
      doctorId: a.doctorId,
      doctorName: a.doctor.user.name,
      avatarUrl: a.doctor.user.avatarUrl,
      specialization: a.doctor.specialization,
      clinicName: a.doctor.clinicName,
      clinicAddress: a.doctor.clinicAddress,
      city: a.doctor.city,
      consultationFee: a.doctor.consultationFee,
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
    console.error('Error fetching patient appointments:', error);
    return NextResponse.json({ error: 'Failed to retrieve appointments' }, { status: 500 });
  }
}
