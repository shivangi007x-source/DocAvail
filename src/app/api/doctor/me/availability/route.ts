import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { availabilityBroadcaster } from '@/lib/realtime';

export const dynamic = 'force-dynamic';

// In-memory rate limiting map: doctorId -> lastUpdateTime
const lastUpdateMap = new Map<string, number>();

export async function GET() {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    if (user.role !== 'DOCTOR' || !user.doctorProfile) {
      return NextResponse.json({ error: 'Forbidden: Doctor role required' }, { status: 403 });
    }

    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { id: user.doctorProfile.id },
      select: {
        id: true,
        availabilityStatus: true,
        statusNote: true,
        statusUpdatedAt: true,
        verificationStatus: true,
        clinicName: true,
      },
    });

    if (!doctorProfile) {
      return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 });
    }

    return NextResponse.json({
      doctorId: doctorProfile.id,
      availabilityStatus: doctorProfile.availabilityStatus,
      statusNote: doctorProfile.statusNote,
      statusUpdatedAt: doctorProfile.statusUpdatedAt?.toISOString() || null,
      verificationStatus: doctorProfile.verificationStatus,
    });
  } catch (error) {
    console.error('Error fetching doctor availability:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    if (user.role !== 'DOCTOR' || !user.doctorProfile) {
      return NextResponse.json({ error: 'Forbidden: Doctor role required' }, { status: 403 });
    }

    const doctorId = user.doctorProfile.id;

    // Rate Limiting Safeguard: 1 update per 2 seconds
    const now = Date.now();
    const lastUpdate = lastUpdateMap.get(doctorId) || 0;
    if (now - lastUpdate < 2000) {
      return NextResponse.json(
        { error: 'Too many status updates. Please wait a moment before changing status again.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { availabilityStatus, statusNote } = body;

    // Validation: Allowed statuses
    const ALLOWED_STATUSES = ['AVAILABLE', 'BUSY', 'UNAVAILABLE'];
    if (!availabilityStatus || !ALLOWED_STATUSES.includes(availabilityStatus.toUpperCase())) {
      return NextResponse.json(
        { error: 'Invalid availability status. Must be AVAILABLE, BUSY, or UNAVAILABLE.' },
        { status: 400 }
      );
    }

    // Validation: Status note length (max 150 chars)
    let sanitizedNote: string | null = null;
    if (typeof statusNote === 'string') {
      const trimmed = statusNote.trim();
      if (trimmed.length > 150) {
        return NextResponse.json(
          { error: 'Status note must be 150 characters or fewer.' },
          { status: 400 }
        );
      }
      sanitizedNote = trimmed.length > 0 ? trimmed : null;
    }

    const updateTimestamp = new Date();

    // Persist in database
    const updatedProfile = await prisma.doctorProfile.update({
      where: { id: doctorId },
      data: {
        availabilityStatus: availabilityStatus.toUpperCase(),
        statusNote: sanitizedNote,
        statusUpdatedAt: updateTimestamp,
      },
      select: {
        id: true,
        specialization: true,
        availabilityStatus: true,
        statusNote: true,
        statusUpdatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Record rate limit timestamp
    lastUpdateMap.set(doctorId, now);

    // Broadcast only public safe fields via SSE
    availabilityBroadcaster.broadcastAvailabilityUpdate({
      doctorId: updatedProfile.id,
      doctorUserId: updatedProfile.user.id,
      name: updatedProfile.user.name,
      specialization: updatedProfile.specialization,
      availabilityStatus: updatedProfile.availabilityStatus as any,
      statusNote: updatedProfile.statusNote,
      statusUpdatedAt: updatedProfile.statusUpdatedAt?.toISOString() || null,
    });

    return NextResponse.json({
      success: true,
      doctorId: updatedProfile.id,
      availabilityStatus: updatedProfile.availabilityStatus,
      statusNote: updatedProfile.statusNote,
      statusUpdatedAt: updatedProfile.statusUpdatedAt?.toISOString() || null,
      message: 'Availability status updated and broadcasted successfully.',
    });
  } catch (error) {
    console.error('Error updating doctor availability:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
