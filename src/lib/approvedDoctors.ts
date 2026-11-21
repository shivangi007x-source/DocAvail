import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { DISEASE_SPECIALTY_MAPPINGS, LEGACY_FOREIGN_DEMO_CITIES } from '@/lib/constants';
import { AvailabilityStatus, DoctorSummary, VerificationStatus } from '@/lib/types';

export interface ApprovedDoctorQueryFilters {
  search?: string;
  specialization?: string;
  district?: string;
  city?: string;
  availability?: string;
}

/**
 * Queries real admin-approved healthcare professionals from PostgreSQL.
 * Strictly enforces BOTH User.role === 'DOCTOR' AND User.approvalStatus === 'APPROVED',
 * excludes rejected profiles, incomplete or legacy foreign demo records, patients, and admins,
 * and omits sensitive user fields (email, passwordHash, reviewer metadata).
 */
export async function queryApprovedDoctors(
  filters: ApprovedDoctorQueryFilters = {}
): Promise<DoctorSummary[]> {
  const search = filters.search?.trim() || '';
  const specialization = filters.specialization?.trim() || '';
  const district = filters.district?.trim() || '';
  const city = filters.city?.trim() || '';
  const availability = filters.availability?.trim() || '';

  const whereClause: Prisma.DoctorProfileWhereInput = {
    user: {
      role: 'DOCTOR',
      approvalStatus: 'APPROVED',
      name: { not: '' },
      NOT: {
        name: { contains: '(DEMO)', mode: 'insensitive' },
      },
    },
    specialization: { not: '' },
    qualification: { not: '' },
    city: {
      notIn: [...LEGACY_FOREIGN_DEMO_CITIES],
    },
    verificationStatus: { not: 'REJECTED' },
  };

  const andConditions: Prisma.DoctorProfileWhereInput[] = [];

  if (search) {
    const searchLower = search.toLowerCase();
    const mappedSpecialties: string[] = [];

    for (const [conditionKey, specs] of Object.entries(DISEASE_SPECIALTY_MAPPINGS)) {
      if (conditionKey.includes(searchLower) || searchLower.includes(conditionKey)) {
        for (const spec of specs) {
          if (!mappedSpecialties.includes(spec)) {
            mappedSpecialties.push(spec);
          }
        }
      }
    }

    const orConditions: Prisma.DoctorProfileWhereInput[] = [
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { specialization: { contains: search, mode: 'insensitive' } },
      { clinicName: { contains: search, mode: 'insensitive' } },
      { clinicAddress: { contains: search, mode: 'insensitive' } },
      { city: { contains: search, mode: 'insensitive' } },
      { district: { contains: search, mode: 'insensitive' } },
      { treatedConditions: { contains: search, mode: 'insensitive' } },
      {
        facilityAffiliations: {
          some: {
            facility: {
              name: { contains: search, mode: 'insensitive' },
            },
          },
        },
      },
    ];

    if (mappedSpecialties.length > 0) {
      orConditions.push({ specialization: { in: mappedSpecialties } });
    }

    andConditions.push({ OR: orConditions });
  }

  if (district) {
    andConditions.push({
      OR: [
        { district: { equals: district, mode: 'insensitive' } },
        { city: { contains: district, mode: 'insensitive' } },
        { clinicAddress: { contains: district, mode: 'insensitive' } },
        {
          facilityAffiliations: {
            some: {
              facility: {
                district: { equals: district, mode: 'insensitive' },
              },
            },
          },
        },
      ],
    });
  }

  if (city) {
    andConditions.push({ city: { equals: city, mode: 'insensitive' } });
  }

  if (andConditions.length > 0) {
    whereClause.AND = andConditions;
  }

  if (specialization) {
    whereClause.specialization = specialization;
  }

  if (availability) {
    whereClause.availabilityStatus = availability.toUpperCase();
  }

  const doctors = await prisma.doctorProfile.findMany({
    where: whereClause,
    select: {
      id: true,
      specialization: true,
      qualification: true,
      experience: true,
      clinicName: true,
      clinicAddress: true,
      city: true,
      district: true,
      division: true,
      consultationFee: true,
      consultationType: true,
      treatedConditions: true,
      availabilityStatus: true,
      statusNote: true,
      statusUpdatedAt: true,
      verificationStatus: true,
      rating: true,
      reviewCount: true,
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
      facilityAffiliations: {
        where: {
          facility: {
            sourceVerified: true,
          },
        },
        select: {
          isPrimary: true,
          role: true,
          facility: {
            select: {
              id: true,
              name: true,
              facilityType: true,
              district: true,
              division: true,
            },
          },
        },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        take: 3,
      },
    },
    orderBy: [{ availabilityStatus: 'asc' }, { rating: 'desc' }, { createdAt: 'desc' }],
  });

  return doctors.map((doc) => {
    const conditionsList = doc.treatedConditions
      ? doc.treatedConditions
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean)
      : [];

    return {
      id: doc.id,
      userId: doc.user.id,
      name: doc.user.name,
      avatarUrl: doc.user.avatarUrl || null,
      specialization: doc.specialization,
      qualification: doc.qualification,
      experience: doc.experience,
      clinicName: doc.clinicName,
      clinicAddress: doc.clinicAddress,
      city: doc.city,
      district: doc.district,
      division: doc.division,
      consultationFee: doc.consultationFee,
      fee: doc.consultationFee,
      consultationType: doc.consultationType,
      treatedConditions: doc.treatedConditions,
      conditions: conditionsList,
      availabilityStatus: doc.availabilityStatus as AvailabilityStatus,
      statusNote: doc.statusNote,
      statusUpdatedAt: doc.statusUpdatedAt?.toISOString() || null,
      verificationStatus: doc.verificationStatus as VerificationStatus,
      isVerified: true,
      rating: doc.rating,
      reviewCount: doc.reviewCount,
      workingHours: doc.workingHours,
      affiliatedFacilities: doc.facilityAffiliations.map((aff) => ({
        id: aff.facility.id,
        name: aff.facility.name,
        facilityType: aff.facility.facilityType,
        district: aff.facility.district,
        division: aff.facility.division,
        isPrimary: aff.isPrimary,
        role: aff.role,
      })),
    };
  });
}
