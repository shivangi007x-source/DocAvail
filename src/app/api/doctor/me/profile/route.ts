import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthUser } from '@/lib/auth';
import { getDivisionForDistrict } from '@/lib/constants';
import { normalizePhoneToE164 } from '@/lib/phone';

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
      phone,
      treatedConditions,
      consultationFee,
      clinicName,
      clinicAddress,
      city,
      district,
      consultationType,
      experience,
      qualification,
    } = body;

    let normalizedPhoneUpdate: string | null | undefined = undefined;
    if (phone !== undefined) {
      const trimmed = phone === null ? '' : String(phone).trim();
      if (trimmed) {
        const e164 = normalizePhoneToE164(trimmed);
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

    const cleanDistrict =
      district !== undefined
        ? typeof district === 'string' && district.trim()
          ? district.trim()
          : null
        : undefined;
    const derivedDivision =
      cleanDistrict !== undefined
        ? cleanDistrict
          ? getDivisionForDistrict(cleanDistrict)
          : null
        : undefined;

    const currentProfile = await prisma.doctorProfile.findUnique({
      where: { userId: payload.userId },
      select: { phone: true },
    });
    const currentNormalizedPhone = normalizePhoneToE164(currentProfile?.phone);
    const phoneChanged =
      normalizedPhoneUpdate !== undefined && normalizedPhoneUpdate !== currentNormalizedPhone;

    if (name || phoneChanged) {
      await prisma.user.update({
        where: { id: payload.userId },
        data: {
          ...(name ? { name: name.trim() } : {}),
          ...(phoneChanged ? { phoneVerifiedAt: null } : {}),
        },
      });
    }

    const updated = await prisma.doctorProfile.update({
      where: { userId: payload.userId },
      data: {
        phone: normalizedPhoneUpdate,
        treatedConditions: treatedConditions !== undefined ? treatedConditions.trim() : undefined,
        consultationFee: consultationFee !== undefined ? parseFloat(consultationFee) : undefined,
        clinicName: clinicName !== undefined ? clinicName.trim() : undefined,
        clinicAddress: clinicAddress !== undefined ? clinicAddress.trim() : undefined,
        city: city !== undefined ? city.trim() : undefined,
        district: cleanDistrict,
        division: derivedDivision,
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
