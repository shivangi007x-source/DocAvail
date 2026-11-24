import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signJwtToken, TOKEN_COOKIE_NAME, isSecureCookieRequest } from '@/lib/auth';

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

    // Enforce account approval workflow before issuing a session.
    // Patient accounts do not require admin approval and remain accessible unless explicitly rejected.
    if (user.approvalStatus === 'REJECTED') {
      return NextResponse.json(
        {
          error: user.rejectionReason
            ? `Your account registration was rejected: ${user.rejectionReason}`
            : 'Your account registration was rejected by an administrator.',
          code: 'ACCOUNT_REJECTED',
          approvalStatus: 'REJECTED',
          rejectionReason: user.rejectionReason,
          reviewedAt: user.reviewedAt,
        },
        { status: 403 }
      );
    }

    if (user.role !== 'PATIENT' && user.approvalStatus === 'PENDING') {
      return NextResponse.json(
        {
          error: 'Your healthcare provider account is pending administrator approval. Please check back once an administrator approves your registration.',
          code: 'ACCOUNT_PENDING',
          approvalStatus: 'PENDING',
        },
        { status: 403 }
      );
    }

    const effectiveApprovalStatus =
      user.role === 'PATIENT' ? 'APPROVED' : (user.approvalStatus as 'PENDING' | 'APPROVED' | 'REJECTED');

    // Issue JWT token & set cookie
    const token = await signJwtToken({
      userId: user.id,
      email: user.email,
      role: user.role as 'PATIENT' | 'DOCTOR' | 'ADMIN',
      name: user.name,
      approvalStatus: effectiveApprovalStatus,
    });

    const userPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      approvalStatus: effectiveApprovalStatus,
      approvedAt: user.approvedAt,
      rejectedAt: user.rejectedAt,
      reviewedAt: user.reviewedAt,
      rejectionReason: user.rejectionReason,
      emailVerifiedAt: user.emailVerifiedAt,
      phoneVerifiedAt: user.phoneVerifiedAt,
      verificationRequired: user.verificationRequired,
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
      secure: isSecureCookieRequest(req),
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
