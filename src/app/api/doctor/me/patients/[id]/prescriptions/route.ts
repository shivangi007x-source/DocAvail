import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuthUser(req, ['DOCTOR', 'ADMIN'], {
      forbiddenMessage: 'Forbidden. Doctor account required.',
    });
    if (!auth.ok) return auth.response;
    const payload = { userId: auth.user.id };

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
        { error: 'Forbidden. You do not have patient consent to prescribe medications.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { medicationName, dosage, frequency, duration, instructions } = body;

    if (!medicationName || !dosage || !frequency || !duration) {
      return NextResponse.json(
        { error: 'Medication name, dosage, frequency, and duration are required.' },
        { status: 400 }
      );
    }

    const newPrescription = await prisma.prescription.create({
      data: {
        patientId: patientProfileId,
        doctorId: doctorProfile.id,
        medicationName: medicationName.trim(),
        dosage: dosage.trim(),
        frequency: frequency.trim(),
        duration: duration.trim(),
        instructions: instructions ? instructions.trim() : null,
        status: 'ACTIVE',
        prescribedDate: new Date(),
      },
    });

    return NextResponse.json(
      {
        message: 'Prescription recorded successfully',
        prescription: newPrescription,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error recording prescription:', error);
    return NextResponse.json({ error: 'Failed to record prescription' }, { status: 500 });
  }
}
