import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signJwtToken, TOKEN_COOKIE_NAME } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        patientProfile: {
          select: { phone: true, location: true },
        },
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
            statusNote: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Issue JWT token & set cookie
    const token = await signJwtToken({
      userId: user.id,
      email: user.email,
      role: user.role as 'PATIENT' | 'DOCTOR' | 'ADMIN',
      name: user.name,
    });

    const userPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl,
      patientProfile: user.patientProfile,
      doctorProfile: user.doctorProfile,
    };

    const response = NextResponse.json(
      { user: userPayload, message: 'Logged in successfully' },
      { status: 200 }
    );

    response.cookies.set(TOKEN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
