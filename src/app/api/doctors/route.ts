import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const specialization = searchParams.get('specialization')?.trim() || '';
    const city = searchParams.get('city')?.trim() || '';
    const availability = searchParams.get('availability')?.trim() || '';

    // Build Prisma where clause
    const whereClause: any = {
      // Show verified doctors or pending doctors (can indicate status), but let's query approved by default unless requested
      verificationStatus: 'APPROVED',
    };

    if (search) {
      whereClause.OR = [
        { user: { name: { contains: search } } },
        { specialization: { contains: search } },
        { clinicName: { contains: search } },
      ];
    }

    if (specialization) {
      whereClause.specialization = specialization;
    }

    if (city) {
      whereClause.city = city;
    }

    if (availability) {
      whereClause.availabilityStatus = availability.toUpperCase();
    }

    const doctors = await prisma.doctorProfile.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        workingHours: {
          select: {
            id: true,
            dayOfWeek: true,
            startTime: true,
            endTime: true,
            breakStart: true,
            breakEnd: true,
            slotDurationMinutes: true,
            isActive: true,
          },
          orderBy: { dayOfWeek: 'asc' },
        },
      },
      orderBy: [
        { availabilityStatus: 'asc' }, // AVAILABLE first
        { rating: 'desc' },
      ],
    });

    // Map to public DoctorSummary format
    const formattedDoctors = doctors.map((doc) => ({
      id: doc.id,
      userId: doc.user.id,
      name: doc.user.name,
      avatarUrl: doc.user.avatarUrl || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=300&auto=format&fit=crop',
      specialization: doc.specialization,
      qualification: doc.qualification,
      experience: doc.experience,
      clinicName: doc.clinicName,
      clinicAddress: doc.clinicAddress,
      city: doc.city,
      consultationFee: doc.consultationFee,
      fee: doc.consultationFee,
      consultationType: doc.consultationType,
      availabilityStatus: doc.availabilityStatus,
      statusNote: doc.statusNote,
      statusUpdatedAt: doc.statusUpdatedAt?.toISOString() || null,
      verificationStatus: doc.verificationStatus,
      isVerified: doc.verificationStatus === 'APPROVED',
      rating: doc.rating,
      reviewCount: doc.reviewCount,
      workingHours: doc.workingHours,
    }));

    return NextResponse.json({
      doctors: formattedDoctors,
      count: formattedDoctors.length,
    });
  } catch (error) {
    console.error('Error fetching doctors:', error);
    return NextResponse.json({ error: 'Failed to fetch doctor listings' }, { status: 500 });
  }
}
