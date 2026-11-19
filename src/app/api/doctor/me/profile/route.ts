import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuthUser(req, ['DOCTOR', 'ADMIN']);
    if (!auth.ok) return auth.response;
    const payload = { userId: auth.user.id };

    const doctorProfile = await prisma.doctorProfile.findUnique({
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

    if (!doctorProfile) {
      return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 });
    }

    return NextResponse.json({ profile: doctorProfile });
  } catch (error) {
    console.error('Error fetching doctor profile:', error);
    return NextResponse.json({ error: 'Failed to fetch doctor profile' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuthUser(req, ['DOCTOR', 'ADMIN']);
    if (!auth.ok) return auth.response;
    const payload = { userId: auth.user.id };

    const body = await req.json();
    const {
      name,
      treatedConditions,
      consultationFee,
      clinicName,
      clinicAddress,
      city,
      consultationType,
      experience,
      qualification,
    } = body;

    if (name) {
      await prisma.user.update({
        where: { id: payload.userId },
        data: { name: name.trim() },
      });
    }

    const updated = await prisma.doctorProfile.update({
      where: { userId: payload.userId },
      data: {
        treatedConditions: treatedConditions !== undefined ? treatedConditions.trim() : undefined,
        consultationFee: consultationFee !== undefined ? parseFloat(consultationFee) : undefined,
        clinicName: clinicName !== undefined ? clinicName.trim() : undefined,
        clinicAddress: clinicAddress !== undefined ? clinicAddress.trim() : undefined,
        city: city !== undefined ? city.trim() : undefined,
        consultationType: consultationType !== undefined ? consultationType : undefined,
        experience: experience !== undefined ? parseInt(experience, 10) : undefined,
        qualification: qualification !== undefined ? qualification.trim() : undefined,
      },
    });

    return NextResponse.json({
      message: 'Doctor profile and clinical expertise updated successfully',
      profile: updated,
    });
  } catch (error) {
    console.error('Error updating doctor profile:', error);
    return NextResponse.json({ error: 'Failed to update doctor profile' }, { status: 500 });
  }
}
