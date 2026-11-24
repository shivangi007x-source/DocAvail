import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getDivisionForDistrict, JK_ALL_DISTRICTS } from '@/lib/constants';
import { normalizePhoneToE164 } from '@/lib/phone';
import { issueEmailVerificationForUser } from '@/lib/verificationService';

const ALLOWED_DOC_MIMES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
]);
const MAX_DOC_BYTES = 2 * 1024 * 1024; // 2 MB

interface ParsedDoctorBody {
  role?: string;
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  phone?: string;
  specialization?: string;
  qualification?: string;
  experience?: string | number;
  licenseNumber?: string;
  consultationFee?: string | number;
  clinicName?: string;
  clinicAddress?: string;
  city?: string;
  district?: string;
  facilityId?: string;
  consultationType?: string;
  verificationDoc?: {
    name: string;
    mime: string;
    size: number;
    content: Buffer;
  } | null;
}

async function parseDoctorPayload(req: Request): Promise<ParsedDoctorBody> {
  const contentType = req.headers.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData();
    const getStr = (k: string) => {
      const val = form.get(k);
      return typeof val === 'string' ? val : undefined;
    };
    const fileEntry = form.get('verificationDocument');
    let verificationDoc: ParsedDoctorBody['verificationDoc'] = null;
    if (fileEntry && typeof fileEntry === 'object' && 'arrayBuffer' in fileEntry && fileEntry.size > 0) {
      const rawName = (fileEntry.name || 'verification-document').replace(/[^a-zA-Z0-9._-]/g, '_');
      verificationDoc = {
        name: rawName.slice(0, 120),
        mime: fileEntry.type || 'application/octet-stream',
        size: fileEntry.size,
        content: Buffer.from(await fileEntry.arrayBuffer()),
      };
    }

    return {
      role: getStr('role'),
      name: getStr('name'),
      email: getStr('email'),
      password: getStr('password'),
      confirmPassword: getStr('confirmPassword'),
      phone: getStr('phone'),
      specialization: getStr('specialization'),
      qualification: getStr('qualification'),
      experience: getStr('experience'),
      licenseNumber: getStr('licenseNumber'),
      consultationFee: getStr('consultationFee'),
      clinicName: getStr('clinicName'),
      clinicAddress: getStr('clinicAddress'),
      city: getStr('city'),
      district: getStr('district'),
      facilityId: getStr('facilityId'),
      consultationType: getStr('consultationType'),
      verificationDoc,
    };
  }

  return await req.json();
}

export async function POST(req: Request) {
  try {
    const body = await parseDoctorPayload(req);

    if (typeof body.role === 'string' && body.role.trim().toUpperCase() === 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin role cannot be selected during public registration.' },
        { status: 403 }
      );
    }

    const {
      name,
      email,
      password,
      confirmPassword,
      phone,
      specialization,
      qualification,
      experience,
      licenseNumber,
      consultationFee,
      clinicName,
      clinicAddress,
      city,
      district,
      facilityId,
      consultationType,
      verificationDoc,
    } = body;

    if (
      !name ||
      !email ||
      !password ||
      !specialization ||
      !qualification ||
      !licenseNumber ||
      !clinicName ||
      !clinicAddress ||
      !city
    ) {
      return NextResponse.json(
        { error: 'All required doctor profile fields must be provided' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    if (verificationDoc) {
      if (verificationDoc.size > MAX_DOC_BYTES) {
        return NextResponse.json(
          { error: 'Supporting verification document must be 2 MB or smaller' },
          { status: 400 }
        );
      }
      if (!ALLOWED_DOC_MIMES.has(verificationDoc.mime)) {
        return NextResponse.json(
          { error: 'Unsupported document format. Please upload PDF, PNG, JPEG, or WEBP.' },
          { status: 400 }
        );
      }
    }

    const cleanDistrict = typeof district === 'string' && district.trim() ? district.trim() : null;
    if (
      cleanDistrict &&
      !JK_ALL_DISTRICTS.some((d) => d.toLowerCase() === cleanDistrict.toLowerCase())
    ) {
      return NextResponse.json(
        { error: 'Please select a valid Jammu & Kashmir district' },
        { status: 400 }
      );
    }
    const derivedDivision = cleanDistrict ? getDivisionForDistrict(cleanDistrict) : null;

    const cleanFacilityId = typeof facilityId === 'string' && facilityId.trim() ? facilityId.trim() : null;
    if (cleanFacilityId) {
      const facilityExists = await prisma.healthcareFacility.findUnique({
        where: { id: cleanFacilityId },
        select: { id: true },
      });
      if (!facilityExists) {
        return NextResponse.json(
          { error: 'Selected healthcare facility affiliation was not found' },
          { status: 400 }
        );
      }
    }

    // Check duplicate email
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      );
    }

    let normalizedPhone: string | null = null;
    if (typeof phone === 'string' && phone.trim()) {
      normalizedPhone = normalizePhoneToE164(phone.trim());
      if (!normalizedPhone) {
        return NextResponse.json(
          { error: 'Please provide a valid Indian (+91) or E.164 phone number.' },
          { status: 400 }
        );
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const parsedExp = typeof experience === 'number' ? experience : parseInt(String(experience || '0'), 10) || 0;
    const parsedFee = typeof consultationFee === 'number' ? consultationFee : parseFloat(String(consultationFee || '0')) || 0;

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        name: name.trim(),
        passwordHash,
        role: 'DOCTOR',
        approvalStatus: 'PENDING',
        verificationRequired: true,
        doctorProfile: {
          create: {
            phone: normalizedPhone,
            specialization: specialization.trim(),
            qualification: qualification.trim(),
            experience: parsedExp,
            licenseNumber: licenseNumber.trim(),
            verificationStatus: 'PENDING', // Must require Admin approval
            consultationFee: parsedFee,
            clinicName: clinicName.trim(),
            clinicAddress: clinicAddress.trim(),
            city: city.trim(),
            district: cleanDistrict,
            division: derivedDivision,
            consultationType: consultationType || 'IN_PERSON',
            availabilityStatus: 'AVAILABLE',
            verificationDocName: verificationDoc?.name || null,
            verificationDocMime: verificationDoc?.mime || null,
            verificationDocSize: verificationDoc?.size || null,
            verificationDocContent: verificationDoc ? verificationDoc.content : null,
            ...(cleanFacilityId
              ? {
                  facilityAffiliations: {
                    create: {
                      facilityId: cleanFacilityId,
                      isPrimary: true,
                      role: 'Registered Clinician',
                      consultationFee: parsedFee > 0 ? parsedFee : null,
                    },
                  },
                }
              : {}),
          },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        approvalStatus: true,
        emailVerifiedAt: true,
        phoneVerifiedAt: true,
        verificationRequired: true,
        createdAt: true,
        doctorProfile: {
          select: {
            id: true,
            phone: true,
            specialization: true,
            qualification: true,
            experience: true,
            licenseNumber: true,
            verificationStatus: true,
            consultationFee: true,
            clinicName: true,
            clinicAddress: true,
            city: true,
            district: true,
            division: true,
            consultationType: true,
            availabilityStatus: true,
            verificationDocName: true,
          },
        },
      },
    });

    await issueEmailVerificationForUser(user.id, {
      skipCooldown: true,
      originUrl: new URL(req.url).origin,
    }).catch(() => null);

    return NextResponse.json(
      {
        user,
        requiresApproval: true,
        message: 'Doctor registration submitted. Your account is pending administrator approval.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Doctor Registration Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
