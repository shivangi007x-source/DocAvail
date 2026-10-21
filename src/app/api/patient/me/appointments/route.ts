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

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(TOKEN_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: 'Authentication required to book an appointment' }, { status: 401 });
    }

    const payload = verifyJwtToken(token);
    if (!payload || (payload.role !== 'PATIENT' && payload.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Only registered patient accounts can book appointments' }, { status: 403 });
    }

    const body = await req.json();
    const {
      doctorId,
      date,
      startTime,
      endTime,
      consultationType,
      reasonForVisit,
      patientNotes,
    } = body;

    if (!doctorId) {
      return NextResponse.json({ error: 'Doctor ID is required' }, { status: 400 });
    }

    // Resolve DoctorProfile by id or userId
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

    // Ensure PatientProfile exists
    let patientProfile = await prisma.patientProfile.findUnique({
      where: { userId: payload.userId },
    });

    if (!patientProfile) {
      patientProfile = await prisma.patientProfile.create({
        data: {
          userId: payload.userId,
        },
      });
    }

    // Parse appointment date
    let appointmentDate = new Date();
    if (date) {
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        appointmentDate = parsed;
      }
    }

    // Create Appointment in database
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
            user: {
              select: {
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    // Establish privacy access consent between Patient and Doctor
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
      message: `Appointment successfully booked with ${doctorProfile.user.name}`,
      appointment: {
        id: appointment.id,
        doctorId: appointment.doctorId,
        doctorName: appointment.doctor.user.name,
        date: appointment.date.toISOString(),
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        status: appointment.status,
        consultationType: appointment.consultationType,
        reasonForVisit: appointment.reasonForVisit,
      },
    });
  } catch (error) {
    console.error('Error creating patient appointment:', error);
    return NextResponse.json({ error: 'Failed to book appointment' }, { status: 500 });
  }
}
