import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJwtToken, TOKEN_COOKIE_NAME } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(TOKEN_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJwtToken(token);
    if (!payload || (payload.role !== 'PATIENT' && payload.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Retrieve PatientProfile
    const patientProfile = await prisma.patientProfile.findUnique({
      where: { userId: payload.userId },
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

    // Retrieve Medical Records
    const records = await prisma.medicalRecord.findMany({
      where: { patientId: patientProfile.id },
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
      where: { patientId: patientProfile.id },
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

    // Retrieve Completed or Past Consultations/Appointments
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
      doctorId: a.doctorId,
      doctorName: a.doctor.user.name,
      doctorSpecialization: a.doctor.specialization,
      clinicName: a.doctor.clinicName,
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
      profile: {
        id: patientProfile.id,
        userId: patientProfile.userId,
        name: patientProfile.user.name,
        email: patientProfile.user.email,
        phone: patientProfile.phone,
        location: patientProfile.location,
        dateOfBirth: patientProfile.dateOfBirth?.toISOString() || null,
        gender: patientProfile.gender,
        bloodGroup: patientProfile.bloodGroup,
      },
      records: formattedRecords,
      prescriptions: formattedPrescriptions,
      consultations: formattedAppointments,
    });
  } catch (error) {
    console.error('Error fetching patient medical records:', error);
    return NextResponse.json({ error: 'Failed to retrieve medical records' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(TOKEN_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJwtToken(token);
    if (!payload || (payload.role !== 'PATIENT' && payload.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const patientProfile = await prisma.patientProfile.findUnique({
      where: { userId: payload.userId },
    });

    if (!patientProfile) {
      return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 });
    }

    const body = await req.json();
    const { title, recordType, description, diagnosedDate, severity, status, fileUrl } = body;

    if (!title || !description || !recordType) {
      return NextResponse.json(
        { error: 'Title, record type, and description are required' },
        { status: 400 }
      );
    }

    const validRecordTypes = ['DIAGNOSIS', 'ALLERGY', 'MEDICATION', 'CONSULTATION_NOTE', 'LAB_REPORT', 'OTHER'];
    if (!validRecordTypes.includes(recordType)) {
      return NextResponse.json({ error: 'Invalid record type' }, { status: 400 });
    }

    const newRecord = await prisma.medicalRecord.create({
      data: {
        patientId: patientProfile.id,
        title: title.trim(),
        recordType,
        description: description.trim(),
        diagnosedDate: diagnosedDate ? new Date(diagnosedDate) : new Date(),
        severity: severity || 'MILD',
        status: status || 'ACTIVE',
        fileUrl: fileUrl ? fileUrl.trim() : null,
        addedByRole: 'PATIENT',
      },
    });

    return NextResponse.json(
      {
        message: 'Medical record added successfully',
        record: newRecord,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error adding patient medical record:', error);
    return NextResponse.json({ error: 'Failed to create medical record' }, { status: 500 });
  }
}
