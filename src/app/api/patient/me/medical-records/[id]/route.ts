import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuthUser(req, ['PATIENT', 'ADMIN']);
    if (!auth.ok) return auth.response;
    const payload = { userId: auth.user.id };

    const patientProfile = await prisma.patientProfile.findUnique({
      where: { userId: payload.userId },
    });

    if (!patientProfile) {
      return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 });
    }

    const recordId = params.id;
    const existing = await prisma.medicalRecord.findUnique({
      where: { id: recordId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    if (existing.patientId !== patientProfile.id) {
      return NextResponse.json({ error: 'Unauthorized to delete this record' }, { status: 403 });
    }

    await prisma.medicalRecord.delete({
      where: { id: recordId },
    });

    return NextResponse.json({ message: 'Medical record deleted successfully' });
  } catch (error) {
    console.error('Error deleting medical record:', error);
    return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 });
  }
}
