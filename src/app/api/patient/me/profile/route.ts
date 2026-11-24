import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthUser } from '@/lib/auth';
import { normalizePhoneToE164 } from '@/lib/phone';

export const dynamic = 'force-dynamic';

function formatProfileResponse(patientProfile: {
  id: string;
  userId: string;
  phone: string | null;
  location: string | null;
  dateOfBirth: Date | null;
  gender: string | null;
  bloodGroup: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}) {
  return {
    id: patientProfile.id,
    userId: patientProfile.userId,
    name: patientProfile.user.name,
    email: patientProfile.user.email,
    phone: patientProfile.phone || '',
    location: patientProfile.location || '',
    dateOfBirth: patientProfile.dateOfBirth
      ? patientProfile.dateOfBirth.toISOString().split('T')[0]
      : '',
    gender: patientProfile.gender || '',
    bloodGroup: patientProfile.bloodGroup || '',
  };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuthUser(req, ['PATIENT', 'ADMIN']);
    if (!auth.ok) return auth.response;
    const payload = { userId: auth.user.id };

    const patientProfile = await prisma.patientProfile.upsert({
      where: { userId: payload.userId },
      update: {},
      create: { userId: payload.userId },
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

    return NextResponse.json(
      { profile: formatProfileResponse(patientProfile) },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (error) {
    console.error('Error fetching patient profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuthUser(req, ['PATIENT', 'ADMIN']);
    if (!auth.ok) return auth.response;
    const payload = { userId: auth.user.id };

    const body = await req.json();
    const { name, phone, location, dateOfBirth, gender, bloodGroup } = body;

    let parsedDob: Date | null | undefined = undefined;
    if (dateOfBirth !== undefined) {
      if (dateOfBirth === null || String(dateOfBirth).trim() === '') {
        parsedDob = null;
      } else {
        const candidate = new Date(String(dateOfBirth).trim());
        if (Number.isNaN(candidate.getTime())) {
          return NextResponse.json({ error: 'Invalid date of birth' }, { status: 400 });
        }
        parsedDob = candidate;
      }
    }

    const cleanOptional = (val: unknown): string | null | undefined => {
      if (val === undefined) return undefined;
      if (val === null) return null;
      const trimmed = String(val).trim();
      return trimmed ? trimmed : null;
    };

    let normalizedPhoneUpdate: string | null | undefined = undefined;
    if (phone !== undefined) {
      const cleaned = cleanOptional(phone);
      if (cleaned) {
        const e164 = normalizePhoneToE164(cleaned);
        if (!e164) {
          return NextResponse.json(
            { error: 'Please provide a valid Indian (+91) or E.164 phone number.' },
            { status: 400 }
          );
        }
        normalizedPhoneUpdate = e164;
      } else {
        normalizedPhoneUpdate = null;
      }
    }

    const updatedProfile = await prisma.$transaction(async (tx) => {
      const currentProfile = await tx.patientProfile.findUnique({
        where: { userId: payload.userId },
        select: { phone: true },
      });
      const currentNormalizedPhone = normalizePhoneToE164(currentProfile?.phone);
      const phoneChanged =
        normalizedPhoneUpdate !== undefined && normalizedPhoneUpdate !== currentNormalizedPhone;

      if ((typeof name === 'string' && name.trim()) || phoneChanged) {
        await tx.user.update({
          where: { id: payload.userId },
          data: {
            ...(typeof name === 'string' && name.trim() ? { name: name.trim() } : {}),
            ...(phoneChanged ? { phoneVerifiedAt: null } : {}),
          },
        });
      }

      return tx.patientProfile.upsert({
        where: { userId: payload.userId },
        update: {
          phone: normalizedPhoneUpdate,
          location: cleanOptional(location),
          dateOfBirth: parsedDob,
          gender: cleanOptional(gender),
          bloodGroup: cleanOptional(bloodGroup),
        },
        create: {
          userId: payload.userId,
          phone: normalizedPhoneUpdate ?? null,
          location: cleanOptional(location) ?? null,
          dateOfBirth: parsedDob ?? null,
          gender: cleanOptional(gender) ?? null,
          bloodGroup: cleanOptional(bloodGroup) ?? null,
        },
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
    });

    return NextResponse.json({
      message: 'Profile updated successfully',
      profile: formatProfileResponse(updatedProfile),
    });
  } catch (error) {
    console.error('Error updating patient profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
