import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, phone, location } = body;

    if (typeof body.role === 'string' && body.role.trim().toUpperCase() === 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin role cannot be selected during public registration.' },
        { status: 403 }
      );
    }

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
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

    // Check duplicate
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password & create user
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        name: name.trim(),
        passwordHash,
        role: 'PATIENT',
        approvalStatus: 'PENDING',
        patientProfile: {
          create: {
            phone: phone ? phone.trim() : null,
            location: location ? location.trim() : null,
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
        patientProfile: {
          select: {
            phone: true,
            location: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        user,
        requiresApproval: true,
        message: 'Registration submitted. Your account is pending administrator approval.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Patient Registration Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
