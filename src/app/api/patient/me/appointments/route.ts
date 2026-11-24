import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthUser } from '@/lib/auth';
import { createPatientAppointment } from '@/lib/appointmentService';
import {
  compareAppointmentsChronologically,
  computeSlotRange,
  toIstDateKey,
} from '@/lib/appointmentTime';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuthUser(req, ['PATIENT', 'ADMIN']);
    if (!auth.ok) return auth.response;
    const payload = { userId: auth.user.id };

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

    const formatted = appointments
      .map((a) => {
        const range = computeSlotRange(a.startTime, 30, a.endTime);
        return {
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
    console.error('Error fetching patient appointments:', error);
    return NextResponse.json({ error: 'Failed to retrieve appointments' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthUser(req, ['PATIENT', 'ADMIN'], {
      forbiddenMessage: 'Only approved registered patient accounts can book appointments',
    });
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const result = await createPatientAppointment(auth.user.id, body);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, ...(result.code ? { code: result.code } : {}) },
        { status: result.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Appointment successfully booked with ${result.appointment.doctorName}`,
      appointment: result.appointment,
    });
  } catch (error) {
    console.error('Error creating patient appointment:', error);
    return NextResponse.json({ error: 'Failed to book appointment' }, { status: 500 });
  }
}
