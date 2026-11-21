import { PrismaClient } from '@prisma/client';
import {
  JK_ALL_DISTRICTS,
  JK_DIVISIONS,
  FACILITY_TYPES,
  FACILITY_OPERATIONAL_STATUSES,
} from './constants';
import {
  AffiliatedDoctorDTO,
  FacilityDetailDTO,
  FacilitySummaryDTO,
  formatFacilitySummary,
} from './facilityVerification';

const VALID_TYPE_SET = new Set<string>(FACILITY_TYPES.map((t) => t.value));
const VALID_STATUS_SET = new Set<string>(FACILITY_OPERATIONAL_STATUSES.map((s) => s.value));
const VALID_DIVISION_MAP: Record<string, 'Jammu' | 'Kashmir'> = {
  jammu: 'Jammu',
  kashmir: 'Kashmir',
};

export const DEFAULT_FACILITY_PAGE_SIZE = 12;
export const MAX_FACILITY_PAGE_SIZE = 50;

export class FacilityQueryValidationError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'FacilityQueryValidationError';
    this.status = status;
  }
}

export interface FacilityQueryParams {
  search?: string | null;
  division?: string | null;
  district?: string | null;
  facilityType?: string | null;
  operationalStatus?: string | null;
  locationVerified?: string | boolean | null;
  lat?: string | number | null;
  lng?: string | number | null;
  page?: string | number | null;
  limit?: string | number | null;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

function parseOptionalCoord(val: string | number | null | undefined, min: number, max: number, label: string): number | null {
  if (val === undefined || val === null || val === '') return null;
  const n = typeof val === 'number' ? val : Number.parseFloat(String(val));
  if (!Number.isFinite(n) || n < min || n > max) {
    throw new FacilityQueryValidationError(`Invalid ${label} coordinate.`);
  }
  return n;
}

export interface FacilityListResult {
  facilities: FacilitySummaryDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  filters: {
    divisions: readonly string[];
    districts: readonly string[];
    facilityTypes: readonly { value: string; label: string }[];
    operationalStatuses: readonly { value: string; label: string }[];
  };
}

function parsePositiveInt(val: string | number | null | undefined, fallback: number): number {
  if (val === undefined || val === null || val === '') return fallback;
  const parsed = typeof val === 'number' ? Math.trunc(val) : Number.parseInt(String(val), 10);
  if (Number.isNaN(parsed) || parsed < 1) return fallback;
  return parsed;
}

/**
 * Securely queries paginated HealthcareFacility records with search, filters,
 * null-safe mapping, non-government OSM coordinate labelling, and expiry enforcement.
 */
export async function queryFacilities(
  prisma: PrismaClient,
  params: FacilityQueryParams,
  now: Date = new Date()
): Promise<FacilityListResult> {
  const search = (params.search || '').trim().slice(0, 120);
  const rawDivision = (params.division || '').trim();
  const rawDistrict = (params.district || '').trim().slice(0, 80);
  const rawType = (params.facilityType || '').trim().toUpperCase();
  const rawOpStatus = (params.operationalStatus || '').trim().toUpperCase();
  const locationVerifiedOnly =
    params.locationVerified === true ||
    String(params.locationVerified || '').trim().toLowerCase() === 'true';

  const userLat = parseOptionalCoord(params.lat, -90, 90, 'lat');
  const userLng = parseOptionalCoord(params.lng, -180, 180, 'lng');
  if ((userLat !== null && userLng === null) || (userLat === null && userLng !== null)) {
    throw new FacilityQueryValidationError('Both lat and lng are required for nearby facility sorting.');
  }
  const hasUserLocation = userLat !== null && userLng !== null;

  let divisionFilter: 'Jammu' | 'Kashmir' | undefined;
  if (rawDivision) {
    const matched = VALID_DIVISION_MAP[rawDivision.toLowerCase()];
    if (!matched) {
      throw new FacilityQueryValidationError(
        `Invalid division '${rawDivision}'. Allowed values: ${JK_DIVISIONS.join(', ')}.`
      );
    }
    divisionFilter = matched;
  }

  let typeFilter: string | undefined;
  if (rawType) {
    if (!VALID_TYPE_SET.has(rawType)) {
      throw new FacilityQueryValidationError(
        `Invalid facilityType '${rawType}'. Allowed values: ${Array.from(VALID_TYPE_SET).join(', ')}.`
      );
    }
    typeFilter = rawType;
  }

  let opStatusFilter: 'ACTIVE' | 'CLOSED' | 'UNKNOWN' | undefined;
  if (rawOpStatus) {
    if (!VALID_STATUS_SET.has(rawOpStatus)) {
      throw new FacilityQueryValidationError(
        `Invalid operationalStatus '${rawOpStatus}'. Allowed values: ${Array.from(VALID_STATUS_SET).join(', ')}.`
      );
    }
    opStatusFilter = rawOpStatus as 'ACTIVE' | 'CLOSED' | 'UNKNOWN';
  }

  const page = parsePositiveInt(params.page, 1);
  const requestedLimit = parsePositiveInt(params.limit, DEFAULT_FACILITY_PAGE_SIZE);
  const limit = Math.min(Math.max(requestedLimit, 1), MAX_FACILITY_PAGE_SIZE);

  // Build Prisma where clause using parameterized queries only
  const whereClause: Record<string, unknown> = {};

  if (divisionFilter) {
    whereClause.division = divisionFilter;
  }
  if (rawDistrict) {
    whereClause.district = { equals: rawDistrict, mode: 'insensitive' };
  }
  if (typeFilter) {
    whereClause.facilityType = typeFilter;
  }
  if (locationVerifiedOnly) {
    whereClause.locationVerified = true;
    whereClause.latitude = { not: null };
    whereClause.longitude = { not: null };
  }
  if (search) {
    whereClause.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { district: { contains: search, mode: 'insensitive' } },
      { city: { contains: search, mode: 'insensitive' } },
      { address: { contains: search, mode: 'insensitive' } },
      { tehsil: { contains: search, mode: 'insensitive' } },
    ];
  }

  const orderBy = [{ division: 'asc' as const }, { district: 'asc' as const }, { name: 'asc' as const }];

  let facilities: FacilitySummaryDTO[] = [];
  let total = 0;

  if (!opStatusFilter && !hasUserLocation) {
    // Fast database-level pagination when not filtering by expiry-checked status or sorting by GPS distance
    const [countResult, rows] = await Promise.all([
      prisma.healthcareFacility.count({ where: whereClause }),
      prisma.healthcareFacility.findMany({
        where: whereClause,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    total = countResult;
    facilities = rows.map((row) => formatFacilitySummary(row, now));
  } else {
    const matchingRows = await prisma.healthcareFacility.findMany({
      where: whereClause,
      orderBy,
    });
    let evaluated = matchingRows.map((row) => formatFacilitySummary(row, now));
    if (opStatusFilter) {
      evaluated = evaluated.filter(
        (item) => item.verification.effectiveOperationalStatus === opStatusFilter
      );
    }
    if (hasUserLocation && userLat !== null && userLng !== null) {
      evaluated = evaluated
        .map((item) => ({
          ...item,
          distanceKm:
            item.latitude !== null && item.longitude !== null
              ? haversineKm(userLat, userLng, item.latitude, item.longitude)
              : null,
        }))
        .sort((a, b) => {
          if (a.distanceKm === null && b.distanceKm === null) return a.name.localeCompare(b.name);
          if (a.distanceKm === null) return 1;
          if (b.distanceKm === null) return -1;
          return a.distanceKm - b.distanceKm;
        });
    }

    total = evaluated.length;
    const startIdx = (page - 1) * limit;
    facilities = evaluated.slice(startIdx, startIdx + limit);
  }

  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    facilities,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: totalPages > 0 && page < totalPages,
      hasPrevPage: page > 1 && total > 0,
    },
    filters: {
      divisions: JK_DIVISIONS,
      districts: JK_ALL_DISTRICTS,
      facilityTypes: FACILITY_TYPES,
      operationalStatuses: FACILITY_OPERATIONAL_STATUSES,
    },
  };
}

/**
 * Retrieves detailed facility record by ID with truthful verification evaluation
 * and any verified DoctorFacilityAffiliation entries (returns [] if none exist).
 */
export async function getFacilityById(
  prisma: PrismaClient,
  id: string,
  now: Date = new Date()
): Promise<FacilityDetailDTO | null> {
  const cleanId = (id || '').trim();
  if (!cleanId || cleanId.length > 100) {
    throw new FacilityQueryValidationError('Valid facility ID is required.');
  }

  const row = await prisma.healthcareFacility.findUnique({
    where: { id: cleanId },
    include: {
      doctorAffiliations: {
        include: {
          doctor: {
            select: {
              id: true,
              specialization: true,
              qualification: true,
              verificationStatus: true,
              availabilityStatus: true,
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      },
    },
  });

  if (!row) return null;

  const summary = formatFacilitySummary(row, now);
  const affiliatedDoctors: AffiliatedDoctorDTO[] = row.doctorAffiliations
    .filter((aff) => aff.doctor.verificationStatus === 'APPROVED')
    .map((aff) => ({
      affiliationId: aff.id,
      doctorId: aff.doctor.id,
      name: aff.doctor.user.name,
      specialization: aff.doctor.specialization,
      qualification: aff.doctor.qualification,
      role: aff.role || null,
      isPrimary: aff.isPrimary,
      consultationFee: aff.consultationFee ?? null,
      visitingSchedule: aff.visitingSchedule || null,
      availabilityStatus: aff.doctor.availabilityStatus,
    }));

  return {
    ...summary,
    affiliatedDoctors,
  };
}
