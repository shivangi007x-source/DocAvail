import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Doctor ID is required' }, { status: 400 });
    }

    // Try finding by DoctorProfile.id first, then by User.id
    let doctor = await prisma.doctorProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        workingHours: {
          orderBy: { dayOfWeek: 'asc' },
        },
        reviews: {
          include: {
            patient: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!doctor) {
      doctor = await prisma.doctorProfile.findUnique({
        where: { userId: id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          workingHours: {
            orderBy: { dayOfWeek: 'asc' },
          },
          reviews: {
            include: {
              patient: {
                select: {
                  id: true,
                  name: true,
                  avatarUrl: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });
    }

    if (!doctor) {
      return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 });
    }

    const conditionsList = doctor.treatedConditions
      ? doctor.treatedConditions
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean)
      : [];

    const formattedDoctor = {
      id: doctor.id,
      userId: doctor.user.id,
      name: doctor.user.name,
      email: doctor.user.email,
      avatarUrl:
        doctor.user.avatarUrl ||
        'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=300&auto=format&fit=crop',
      specialization: doctor.specialization,
      qualification: doctor.qualification,
      experience: doctor.experience,
      licenseNumber: doctor.licenseNumber,
      clinicName: doctor.clinicName,
      clinicAddress: doctor.clinicAddress,
      city: doctor.city,
      consultationFee: doctor.consultationFee,
      fee: doctor.consultationFee,
      consultationType: doctor.consultationType,
      treatedConditions: doctor.treatedConditions,
      conditions: conditionsList,
      availabilityStatus: doctor.availabilityStatus,
      statusNote: doctor.statusNote,
      statusUpdatedAt: doctor.statusUpdatedAt?.toISOString() || null,
      verificationStatus: doctor.verificationStatus,
      isVerified: doctor.verificationStatus === 'APPROVED',
      rating: doctor.rating,
      reviewCount: doctor.reviewCount,
      workingHours: doctor.workingHours,
      reviews: doctor.reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
        patientName: r.patient.name,
        patientAvatar: r.patient.avatarUrl,
      })),
    };

    return NextResponse.json({ doctor: formattedDoctor });
  } catch (error) {
    console.error('Error fetching doctor details:', error);
    return NextResponse.json({ error: 'Failed to retrieve doctor profile' }, { status: 500 });
  }
}
