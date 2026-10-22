import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJwtToken, TOKEN_COOKIE_NAME } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(TOKEN_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyJwtToken(token);
    if (!payload || (payload.role !== 'PATIENT' && payload.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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

    return NextResponse.json({
      profile: {
        id: patientProfile.id,
        userId: patientProfile.userId,
        name: patientProfile.user.name,
        email: patientProfile.user.email,
        phone: patientProfile.phone,
        location: patientProfile.location,
        dateOfBirth: patientProfile.dateOfBirth?.toISOString().split('T')[0] || '',
        gender: patientProfile.gender || '',
        bloodGroup: patientProfile.bloodGroup || '',
      },
    });
  } catch (error) {
    console.error('Error fetching patient profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = req.cookies.get(TOKEN_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyJwtToken(token);
    if (!payload || (payload.role !== 'PATIENT' && payload.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { name, phone, location, dateOfBirth, gender, bloodGroup } = body;

    // Update User name if provided
    if (name) {
      await prisma.user.update({
        where: { id: payload.userId },
        data: { name: name.trim() },
      });
    }

    // Update PatientProfile
    const updatedProfile = await prisma.patientProfile.upsert({
      where: { userId: payload.userId },
      update: {
        phone: phone !== undefined ? phone.trim() : undefined,
        location: location !== undefined ? location.trim() : undefined,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        gender: gender !== undefined ? gender : undefined,
        bloodGroup: bloodGroup !== undefined ? bloodGroup : undefined,
      },
      create: {
        userId: payload.userId,
        phone: phone ? phone.trim() : null,
        location: location ? location.trim() : null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender: gender || null,
        bloodGroup: bloodGroup || null,
      },
    });

    return NextResponse.json({
      message: 'Profile updated successfully',
      profile: updatedProfile,
    });
  } catch (error) {
    console.error('Error updating patient profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
