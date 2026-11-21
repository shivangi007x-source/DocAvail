import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { JK_ALL_DISTRICTS } from '@/lib/constants';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      email,
      password,
      confirmPassword,
      phone,
      dateOfBirth,
      district,
      cityTown,
      pincode,
      location,
    } = body;

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

    if (typeof password !== 'string' || password.length < 6) {
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
    if (!emailRegex.test(String(email))) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const cleanDistrict = typeof district === 'string' ? district.trim() : '';
    if (
      cleanDistrict &&
      !JK_ALL_DISTRICTS.some((d) => d.toLowerCase() === cleanDistrict.toLowerCase())
    ) {
      return NextResponse.json(
        { error: 'Please select a valid Jammu & Kashmir district' },
        { status: 400 }
      );
    }

    let parsedDob: Date | null = null;
    if (typeof dateOfBirth === 'string' && dateOfBirth.trim()) {
      const candidate = new Date(dateOfBirth.trim());
      if (Number.isNaN(candidate.getTime())) {
        return NextResponse.json({ error: 'Invalid date of birth' }, { status: 400 });
      }
      parsedDob = candidate;
    }

    const cleanPin = typeof pincode === 'string' ? pincode.trim() : '';
    if (cleanPin && !/^\d{6}$/.test(cleanPin)) {
      return NextResponse.json(
        { error: 'PIN code must be a valid 6-digit Indian postal code' },
        { status: 400 }
      );
    }

    // Format J&K location cleanly while remaining backward compatible with plain location string
    const locationParts = [
      typeof cityTown === 'string' ? cityTown.trim() : '',
      cleanPin ? `PIN ${cleanPin}` : '',
      cleanDistrict ? `District ${cleanDistrict}` : '',
      cleanDistrict ? 'Jammu and Kashmir, India' : '',
    ].filter(Boolean);

    const formattedLocation =
      locationParts.length > 0
        ? locationParts.join(', ')
        : typeof location === 'string' && location.trim()
        ? location.trim()
        : null;

    // Check duplicate
    const existingUser = await prisma.user.findUnique({
      where: { email: String(email).toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password & create user with PENDING approval
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: String(email).toLowerCase().trim(),
        name: String(name).trim(),
        passwordHash,
        role: 'PATIENT',
        approvalStatus: 'PENDING',
        patientProfile: {
          create: {
            phone: typeof phone === 'string' && phone.trim() ? phone.trim() : null,
            location: formattedLocation,
            dateOfBirth: parsedDob,
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
            dateOfBirth: true,
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
