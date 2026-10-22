import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signJwtToken, TOKEN_COOKIE_NAME } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
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

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        name: name.trim(),
        passwordHash,
        role: 'DOCTOR',
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

    // Create JWT & HTTP-only Cookie
    const token = await signJwtToken({
      userId: user.id,
      email: user.email,
      role: 'DOCTOR',
      name: user.name,
    });

    const response = NextResponse.json(
      { user, message: 'Doctor registration submitted. Profile is pending admin verification.' },
      { status: 201 }
    );

    response.cookies.set(TOKEN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Doctor Registration Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
