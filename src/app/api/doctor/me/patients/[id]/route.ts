import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJwtToken, TOKEN_COOKIE_NAME } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = req.cookies.get(TOKEN_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyJwtToken(token);
    if (!payload || (payload.role !== 'DOCTOR' && payload.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden. Doctor credentials required.' }, { status: 403 });
    }

    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: payload.userId },
    });

    if (!doctorProfile) {
      return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 });
    }

    const patientProfileId = params.id;

    // MANDATORY BACKEND AUTHORIZATION CHECK
    // Verify that this doctor has explicit GRANTED access for this patient
    const accessGrant = await prisma.doctorPatientAccess.findUnique({
      where: {
        patientId_doctorId: {
          patientId: patientProfileId,
          doctorId: doctorProfile.id,
        },
      },
    });

    if (!accessGrant || accessGrant.status !== 'GRANTED') {
      return NextResponse.json(
        {
          error:
            'Access Denied. You do not have patient consent or authorized permission to view this medical chart.',
        },
        { status: 403 }
      );
    }

    // Retrieve Patient Profile
    const patientProfile = await prisma.patientProfile.findUnique({
      where: { id: patientProfileId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!patientProfile) {
      return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 });
    }

    // Retrieve Chronological Medical Records
    const records = await prisma.medicalRecord.findMany({
      where: { patientId: patientProfileId },
      include: {
        doctor: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: [
        { diagnosedDate: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Retrieve Prescriptions
    const prescriptions = await prisma.prescription.findMany({
      where: { patientId: patientProfileId },
      include: {
        doctor: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { prescribedDate: 'desc' },
    });

    // Retrieve Previous Consultations with this doctor / clinic
    const appointments = await prisma.appointment.findMany({
      where: {
        patientId: patientProfile.userId,
        doctorId: doctorProfile.id,
      },
      orderBy: { date: 'desc' },
    });

    const formattedRecords = records.map((r) => ({
      id: r.id,
      patientId: r.patientId,
      doctorId: r.doctorId,
      doctorName: r.doctor?.user.name || null,
      doctorSpecialization: r.doctor?.specialization || null,
      doctorClinic: r.doctor?.clinicName || null,
      title: r.title,
      recordType: r.recordType,
      description: r.description,
      diagnosedDate: r.diagnosedDate?.toISOString() || null,
      severity: r.severity,
      status: r.status,
      fileUrl: r.fileUrl,
      addedByRole: r.addedByRole,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    const formattedPrescriptions = prescriptions.map((p) => ({
      id: p.id,
      patientId: p.patientId,
      doctorId: p.doctorId,
      doctorName: p.doctor.user.name,
      doctorSpecialization: p.doctor.specialization,
      doctorClinic: p.doctor.clinicName,
      medicationName: p.medicationName,
      dosage: p.dosage,
      frequency: p.frequency,
      duration: p.duration,
      instructions: p.instructions,
      prescribedDate: p.prescribedDate.toISOString(),
      status: p.status,
      createdAt: p.createdAt.toISOString(),
    }));

    const formattedAppointments = appointments.map((a) => ({
      id: a.id,
      date: a.date.toISOString(),
      startTime: a.startTime,
      endTime: a.endTime,
      status: a.status,
      consultationType: a.consultationType,
      reasonForVisit: a.reasonForVisit,
      patientNotes: a.patientNotes,
      doctorNotes: a.doctorNotes,
    }));

    return NextResponse.json({
      patient: {
        id: patientProfile.id,
        userId: patientProfile.userId,
        name: patientProfile.user.name,
        email: patientProfile.user.email,
        phone: patientProfile.phone,
        location: patientProfile.location,
        dateOfBirth: patientProfile.dateOfBirth?.toISOString() || null,
        gender: patientProfile.gender,
        bloodGroup: patientProfile.bloodGroup,
        accessGrantedAt: accessGrant.grantedAt.toISOString(),
        accessReason: accessGrant.reason,
      },
      records: formattedRecords,
      prescriptions: formattedPrescriptions,
      consultations: formattedAppointments,
      allergies: formattedRecords.filter((r) => r.recordType === 'ALLERGY'),
    });
  } catch (error) {
    console.error('Error fetching patient chart:', error);
    return NextResponse.json({ error: 'Failed to retrieve patient chart' }, { status: 500 });
  }
}
