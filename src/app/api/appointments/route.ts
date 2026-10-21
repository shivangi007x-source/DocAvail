import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJwtToken, TOKEN_COOKIE_NAME } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(TOKEN_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: 'Authentication required. Please sign in as a patient.' }, { status: 401 });
    }

    const payload = verifyJwtToken(token);
    if (!payload || (payload.role !== 'PATIENT' && payload.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Only patient accounts can schedule appointments.' }, { status: 403 });
    }

    const body = await req.json();
    const { doctorId, date, startTime, endTime, consultationType, reasonForVisit, patientNotes } = body;

    if (!doctorId) {
      return NextResponse.json({ error: 'Doctor ID is required' }, { status: 400 });
    }

    let doctorProfile = await prisma.doctorProfile.findUnique({
      where: { id: doctorId },
      include: { user: true },
    });

    if (!doctorProfile) {
      doctorProfile = await prisma.doctorProfile.findUnique({
        where: { userId: doctorId },
        include: { user: true },
      });
    }

    if (!doctorProfile) {
      return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 });
    }

    let patientProfile = await prisma.patientProfile.findUnique({
      where: { userId: payload.userId },
    });

    if (!patientProfile) {
      patientProfile = await prisma.patientProfile.create({
        data: { userId: payload.userId },
      });
    }

    let appointmentDate = new Date();
    if (date) {
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        appointmentDate = parsed;
      }
    }

    const appointment = await prisma.appointment.create({
      data: {
        patientId: payload.userId,
        doctorId: doctorProfile.id,
        date: appointmentDate,
        startTime: startTime || '10:00 AM',
        endTime: endTime || '10:30 AM',
        status: 'CONFIRMED',
        consultationType: consultationType || 'IN_PERSON',
        reasonForVisit: reasonForVisit || 'Medical Consultation',
        patientNotes: patientNotes || null,
      },
      include: {
        doctor: {
          include: {
            user: { select: { name: true, avatarUrl: true } },
          },
        },
      },
    });

    await prisma.doctorPatientAccess.upsert({
      where: {
        patientId_doctorId: {
          patientId: patientProfile.id,
          doctorId: doctorProfile.id,
        },
      },
      update: {
        status: 'GRANTED',
        reason: reasonForVisit || 'Consultation appointment booking consent',
        revokedAt: null,
      },
      create: {
        patientId: patientProfile.id,
        doctorId: doctorProfile.id,
        status: 'GRANTED',
        reason: reasonForVisit || 'Consultation appointment booking consent',
      },
    });

    return NextResponse.json({
      success: true,
      message: `Appointment scheduled with ${doctorProfile.user.name}`,
      appointment,
    });
  } catch (error) {
    console.error('Error creating appointment:', error);
    return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 });
  }
}
