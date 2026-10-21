import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJwtToken, TOKEN_COOKIE_NAME } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(
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
      return NextResponse.json({ error: 'Forbidden. Doctor account required.' }, { status: 403 });
    }

    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: payload.userId },
    });

    if (!doctorProfile) {
      return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 });
    }

    const patientProfileId = params.id;

    // MANDATORY BACKEND AUTHORIZATION CHECK
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
        { error: 'Forbidden. You do not have patient consent to modify records.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { title, recordType, description, severity, status, diagnosedDate } = body;

    if (!title || !description || !recordType) {
      return NextResponse.json(
        { error: 'Title, record type, and description are required.' },
        { status: 400 }
      );
    }

    const validRecordTypes = ['DIAGNOSIS', 'ALLERGY', 'MEDICATION', 'CONSULTATION_NOTE', 'LAB_REPORT', 'OTHER'];
    if (!validRecordTypes.includes(recordType)) {
      return NextResponse.json({ error: 'Invalid record type' }, { status: 400 });
    }

    const newRecord = await prisma.medicalRecord.create({
      data: {
        patientId: patientProfileId,
        doctorId: doctorProfile.id,
        title: title.trim(),
        recordType,
        description: description.trim(),
        severity: severity || 'MILD',
        status: status || 'ACTIVE',
        diagnosedDate: diagnosedDate ? new Date(diagnosedDate) : new Date(),
        addedByRole: 'DOCTOR',
      },
    });

    return NextResponse.json(
      {
        message: 'Clinical record added to patient chart',
        record: newRecord,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error adding doctor clinical record:', error);
    return NextResponse.json({ error: 'Failed to add clinical record' }, { status: 500 });
  }
}
