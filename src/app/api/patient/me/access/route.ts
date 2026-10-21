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
    if (!payload || (payload.role !== 'PATIENT' && payload.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const patientProfile = await prisma.patientProfile.findUnique({
      where: { userId: payload.userId },
    });

    if (!patientProfile) {
      return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 });
    }

    // Fetch existing grants
    const grants = await prisma.doctorPatientAccess.findMany({
      where: { patientId: patientProfile.id },
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
      orderBy: { grantedAt: 'desc' },
    });

    // Fetch all approved doctors to enable easy granting
    const allDoctors = await prisma.doctorProfile.findMany({
      where: { verificationStatus: 'APPROVED' },
      include: {
        user: {
          select: {
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    const formattedGrants = grants.map((g) => ({
      id: g.id,
      doctorId: g.doctorId,
      doctorName: g.doctor.user.name,
      doctorAvatar: g.doctor.user.avatarUrl,
      doctorSpecialization: g.doctor.specialization,
      doctorClinic: g.doctor.clinicName,
      status: g.status,
      grantedAt: g.grantedAt.toISOString(),
      reason: g.reason,
    }));

    const availableDoctors = allDoctors.map((d) => {
      const grant = grants.find((g) => g.doctorId === d.id);
      return {
        id: d.id,
        name: d.user.name,
        specialization: d.specialization,
        clinicName: d.clinicName,
        avatarUrl: d.user.avatarUrl,
        hasAccess: grant ? grant.status === 'GRANTED' : false,
        grantId: grant?.id || null,
      };
    });

    return NextResponse.json({
      grants: formattedGrants,
      doctors: availableDoctors,
    });
  } catch (error) {
    console.error('Error fetching doctor access permissions:', error);
    return NextResponse.json({ error: 'Failed to retrieve access permissions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(TOKEN_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyJwtToken(token);
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
    const { doctorId, action } = body; // action: 'GRANT' | 'REVOKE'

    if (!doctorId || !action || !['GRANT', 'REVOKE'].includes(action)) {
      return NextResponse.json({ error: 'Valid doctorId and action (GRANT/REVOKE) required' }, { status: 400 });
    }

    const newStatus = action === 'GRANT' ? 'GRANTED' : 'REVOKED';

    const accessRecord = await prisma.doctorPatientAccess.upsert({
      where: {
        patientId_doctorId: {
          patientId: patientProfile.id,
          doctorId,
        },
      },
      update: {
        status: newStatus,
        revokedAt: action === 'REVOKE' ? new Date() : null,
        grantedAt: action === 'GRANT' ? new Date() : undefined,
      },
      create: {
        patientId: patientProfile.id,
        doctorId,
        status: newStatus,
        reason: 'Patient self-service consent setting',
        grantedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: action === 'GRANT' ? 'Access granted to doctor' : 'Access revoked from doctor',
      access: accessRecord,
    });
  } catch (error) {
    console.error('Error updating doctor access permission:', error);
    return NextResponse.json({ error: 'Failed to update access permission' }, { status: 500 });
  }
}
