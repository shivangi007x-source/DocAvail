import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getDivisionForDistrict } from '@/lib/constants';

export async function POST(req: Request) {
  try {
    const body = await req.json();

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
      specialization,
      qualification,
      experience,
      licenseNumber,
      consultationFee,
      clinicName,
      clinicAddress,
      city,
      district,
      consultationType,
    } = body;

    // Validation
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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
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

    // Hash password & create Doctor with PENDING verification status
    const passwordHash = await bcrypt.hash(password, 10);

    const cleanDistrict = typeof district === 'string' && district.trim() ? district.trim() : null;
    const derivedDivision = cleanDistrict ? getDivisionForDistrict(cleanDistrict) : null;

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        name: name.trim(),
        passwordHash,
        role: 'DOCTOR',
        approvalStatus: 'PENDING',
        doctorProfile: {
          create: {
            specialization: specialization.trim(),
            qualification: qualification.trim(),
            experience: parseInt(experience) || 0,
            licenseNumber: licenseNumber.trim(),
            verificationStatus: 'PENDING', // MUST BE PENDING as explicitly requested
            consultationFee: parseFloat(consultationFee) || 0.0,
            clinicName: clinicName.trim(),
            clinicAddress: clinicAddress.trim(),
            city: city.trim(),
            district: cleanDistrict,
            division: derivedDivision,
            consultationType: consultationType || 'IN_PERSON',
            availabilityStatus: 'AVAILABLE',
          },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        approvalStatus: true,
        createdAt: true,
        doctorProfile: {
          select: {
            id: true,
            specialization: true,
            qualification: true,
            experience: true,
            licenseNumber: true,
            verificationStatus: true,
            consultationFee: true,
            clinicName: true,
            clinicAddress: true,
            city: true,
            consultationType: true,
            availabilityStatus: true,
          },
        },
      },
    });

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
