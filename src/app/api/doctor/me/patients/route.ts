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

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim().toLowerCase() || '';

    // Privacy & Access Control Enforcement:
    // Only retrieve patients where this doctor has an explicit GRANTED access status.
    const accessGrants = await prisma.doctorPatientAccess.findMany({
      where: {
        doctorId: doctorProfile.id,
        status: 'GRANTED',
      },
      include: {
        patient: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
            medicalRecords: {
              select: {
                id: true,
                recordType: true,
              },
            },
            prescriptions: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: { grantedAt: 'desc' },
    });

    // Also look up appointments to find last consultation dates
    const patientUserIds = accessGrants.map((g) => g.patient.user.id);
    const appointments = await prisma.appointment.findMany({
      where: {
        doctorId: doctorProfile.id,
        patientId: { in: patientUserIds },
      },
      orderBy: { date: 'desc' },
    });

    let authorizedPatients = accessGrants.map((grant) => {
      const p = grant.patient;
      const lastAppt = appointments.find((a) => a.patientId === p.user.id);

      return {
        id: p.id,
        userId: p.user.id,
        name: p.user.name,
        email: p.user.email,
        phone: p.phone,
        location: p.location,
        dateOfBirth: p.dateOfBirth?.toISOString() || null,
        gender: p.gender,
        bloodGroup: p.bloodGroup,
        recordCount: p.medicalRecords.length,
        prescriptionCount: p.prescriptions.filter((rx) => rx.status === 'ACTIVE').length,
        allergyCount: p.medicalRecords.filter((r) => r.recordType === 'ALLERGY').length,
        lastVisit: lastAppt ? lastAppt.date.toISOString() : null,
        accessStatus: grant.status,
        accessGrantedAt: grant.grantedAt.toISOString(),
        accessReason: grant.reason,
      };
    });

    // Apply search filter if provided
    if (search) {
      authorizedPatients = authorizedPatients.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.email.toLowerCase().includes(search) ||
          (p.phone && p.phone.toLowerCase().includes(search))
      );
    }

    return NextResponse.json({
      patients: authorizedPatients,
      count: authorizedPatients.length,
    });
  } catch (error) {
    console.error('Error fetching authorized patients:', error);
    return NextResponse.json({ error: 'Failed to retrieve patient records' }, { status: 500 });
  }
}
