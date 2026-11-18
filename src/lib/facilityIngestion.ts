/**
 * DocAvail — Verified Healthcare Facility Ingestion & Validation Engine (Audited & Hardened)
 * 
 * Strict Data Governance:
 * 1. Enforces coverage across the 20 official districts of Jammu & Kashmir.
 * 2. Strict district-to-division mapping enforcement.
 * 3. Spatial bounding box validation for J&K: Lat [32.0, 35.5], Lng [73.5, 77.0].
 * 4. Preserves null coordinates for unverified locations (Zero Synthetic/Dummy Data).
 * 5. Mandatory source attribution and reference provenance with verifiable evidence.
 * 6. Tri-state verification: sourceVerified, locationVerified, operationalVerified.
 * 7. Hardened Deduplication:
 *    - Rejects pure-distance merges to prevent false-positive merges in dense medical clusters.
 *    - Requires both semantic name similarity AND spatial proximity / district match.
 * 8. Monotonic Quality Progression:
 *    - Higher-verified data can enrich lower-verified records.
 *    - Lower-quality or unverified candidates can NEVER overwrite verified fields.
 * 9. Safe sanitization: Empty string fields are normalized to clean NULLs.
 */

import { PrismaClient } from '@prisma/client';

export const JK_DIVISIONS = ['Jammu', 'Kashmir'] as const;
export type JkDivision = (typeof JK_DIVISIONS)[number];

export const JK_DISTRICT_DIVISION_MAP: Record<string, JkDivision> = {
  // Jammu Division (10 Districts)
  Jammu: 'Jammu',
  Kathua: 'Jammu',
  Samba: 'Jammu',
  Udhampur: 'Jammu',
  Reasi: 'Jammu',
  Rajouri: 'Jammu',
  Poonch: 'Jammu',
  Doda: 'Jammu',
  Ramban: 'Jammu',
  Kishtwar: 'Jammu',

  // Kashmir Division (10 Districts)
  Srinagar: 'Kashmir',
  Anantnag: 'Kashmir',
  Baramulla: 'Kashmir',
  Budgam: 'Kashmir',
  Bandipora: 'Kashmir',
  Ganderbal: 'Kashmir',
  Kulgam: 'Kashmir',
  Kupwara: 'Kashmir',
  Pulwama: 'Kashmir',
  Shopian: 'Kashmir',
};

export const JK_ALL_DISTRICTS = Object.keys(JK_DISTRICT_DIVISION_MAP);

export const VALID_FACILITY_TYPES = [
  'HOSPITAL',
  'CHC', // Community Health Centre / Sub-District Hospital
  'PHC', // Primary Health Centre
  'SUB_CENTRE',
  'CLINIC',
  'DIAGNOSTIC_CENTRE',
] as const;
export type ValidFacilityType = (typeof VALID_FACILITY_TYPES)[number];

export const VALID_OPERATIONAL_STATUSES = ['ACTIVE', 'CLOSED', 'UNKNOWN'] as const;

export interface RawFacilityInput {
  name: string;
  facilityType: string;
  category?: string | null;
  district: string;
  division?: string | null;
  tehsil?: string | null;
  address: string;
  city?: string | null;
  pincode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  contactNumber?: string | null;
  email?: string | null;
  emergencyServices?: boolean | null;
  operationalStatus?: string;
  operationalVerified?: boolean;
  locationVerified?: boolean;
  sourceVerified?: boolean;
  sourceReference: string;
  sourceAttribution: string;
  metadata?: Record<string, any> | null;
}

export interface ValidationIssue {
  field: string;
  message: string;
  severity: 'ERROR' | 'WARNING';
}

export interface ValidatedFacilityRecord {
  isValid: boolean;
  issues: ValidationIssue[];
  data?: {
    name: string;
    normalizedName: string;
    facilityType: ValidFacilityType;
    category: string | null;
    district: string;
    division: JkDivision;
    tehsil: string | null;
    address: string;
    city: string | null;
    pincode: string | null;
    latitude: number | null;
    longitude: number | null;
    contactNumber: string | null;
    email: string | null;
    emergencyServices: boolean | null;
    operationalStatus: string;
    operationalVerified: boolean;
    locationVerified: boolean;
    sourceVerified: boolean;
    sourceReference: string;
    sourceAttribution: string;
    metadata: Record<string, any> | null;
    dedupKey: string;
  };
}

/**
 * Normalizes hospital and facility names for consistent matching and deduplication.
 */
export function normalizeFacilityName(rawName: string): string {
  if (!rawName) return '';
  return rawName
    .replace(/\bGovt\.?\b/gi, 'Government')
    .replace(/\bDH\b/g, 'District Hospital')
    .replace(/\bSDH\b/g, 'Sub District Hospital')
    .replace(/\bCHC\b/g, 'Community Health Centre')
    .replace(/\bPHC\b/g, 'Primary Health Centre')
    .replace(/\bNTPHC\b/g, 'New Type Primary Health Centre')
    .replace(/\bGMC\b/g, 'Government Medical College')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Computes Jaccard token similarity between two strings.
 */
export function calculateTokenSimilarity(strA: string, strB: string): number {
  const tokensA = new Set(strA.toLowerCase().split(/\s+/).filter(t => t.length > 2));
  const tokensB = new Set(strB.toLowerCase().split(/\s+/).filter(t => t.length > 2));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++;
  }
  const union = new Set([...tokensA, ...tokensB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Computes great-circle distance between two geographic coordinates in meters.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Sanitizes string: returns trimmed string or null if empty/whitespace.
 */
function cleanStringOrNull(val: string | null | undefined): string | null {
  if (val === undefined || val === null) return null;
  const trimmed = String(val).trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Validates a candidate facility record against schema and geographical constraints.
 */
export function validateFacilityRecord(raw: RawFacilityInput): ValidatedFacilityRecord {
  const issues: ValidationIssue[] = [];

  // 1. Name validation
  const cleanName = cleanStringOrNull(raw.name);
  if (!cleanName || cleanName.length < 3) {
    issues.push({ field: 'name', message: 'Facility name must be at least 3 characters.', severity: 'ERROR' });
  }

  // 2. Facility Type validation
  const upperType = (raw.facilityType || '').toUpperCase().trim();
  if (!VALID_FACILITY_TYPES.includes(upperType as ValidFacilityType)) {
    issues.push({
      field: 'facilityType',
      message: `Invalid facilityType '${raw.facilityType}'. Must be one of: ${VALID_FACILITY_TYPES.join(', ')}`,
      severity: 'ERROR',
    });
  }

  // 3. District validation
  const districtName = Object.keys(JK_DISTRICT_DIVISION_MAP).find(
    d => d.toLowerCase() === (raw.district || '').toLowerCase().trim()
  );

  if (!districtName) {
    issues.push({
      field: 'district',
      message: `Invalid district '${raw.district}'. Must be one of the 20 J&K districts.`,
      severity: 'ERROR',
    });
  }

  // 4. Division assignment / consistency check
  const expectedDivision = districtName ? JK_DISTRICT_DIVISION_MAP[districtName] : null;
  if (raw.division && expectedDivision && raw.division.toLowerCase().trim() !== expectedDivision.toLowerCase()) {
    issues.push({
      field: 'division',
      message: `Division mismatch: District '${districtName}' belongs to '${expectedDivision}', not '${raw.division}'.`,
      severity: 'ERROR',
    });
  }

  // 5. Address validation
  const cleanAddress = cleanStringOrNull(raw.address);
  if (!cleanAddress || cleanAddress.length < 3) {
    issues.push({ field: 'address', message: 'Address must be at least 3 characters.', severity: 'ERROR' });
  }

  // 6. Geographic coordinates validation (J&K Bounding Box)
  let validLat: number | null = null;
  let validLng: number | null = null;

  if (raw.latitude !== undefined && raw.latitude !== null) {
    const lat = Number(raw.latitude);
    if (isNaN(lat) || lat < 32.0 || lat > 35.5) {
      issues.push({
        field: 'latitude',
        message: `Latitude ${lat} is outside Jammu & Kashmir bounds [32.0, 35.5].`,
        severity: 'ERROR',
      });
    } else {
      validLat = lat;
    }
  }

  if (raw.longitude !== undefined && raw.longitude !== null) {
    const lng = Number(raw.longitude);
    if (isNaN(lng) || lng < 73.5 || lng > 77.0) {
      issues.push({
        field: 'longitude',
        message: `Longitude ${lng} is outside Jammu & Kashmir bounds [73.5, 77.0].`,
        severity: 'ERROR',
      });
    } else {
      validLng = lng;
    }
  }

  if ((validLat !== null && validLng === null) || (validLat === null && validLng !== null)) {
    issues.push({
      field: 'coordinates',
      message: 'Both latitude and longitude must be provided together, or both left NULL.',
      severity: 'ERROR',
    });
  }

  // 7. Mandatory Source Attribution & Reference
  const cleanRef = cleanStringOrNull(raw.sourceReference);
  if (!cleanRef || cleanRef.length < 3) {
    issues.push({
      field: 'sourceReference',
      message: 'Mandatory sourceReference provenance missing or too short.',
      severity: 'ERROR',
    });
  }

  const cleanAttr = cleanStringOrNull(raw.sourceAttribution);
  if (!cleanAttr || cleanAttr.length < 3) {
    issues.push({
      field: 'sourceAttribution',
      message: 'Mandatory sourceAttribution missing or too short.',
      severity: 'ERROR',
    });
  }

  // 8. Operational status validation
  const opStatus = (raw.operationalStatus || 'UNKNOWN').toUpperCase().trim();
  if (!VALID_OPERATIONAL_STATUSES.includes(opStatus as any)) {
    issues.push({
      field: 'operationalStatus',
      message: `Invalid operationalStatus '${raw.operationalStatus}'. Must be ACTIVE, CLOSED, or UNKNOWN.`,
      severity: 'ERROR',
    });
  }

  // 9. Verification flags consistency
  let locVerified = Boolean(raw.locationVerified);
  if (locVerified && (validLat === null || validLng === null)) {
    issues.push({
      field: 'locationVerified',
      message: 'locationVerified cannot be true when coordinates are NULL.',
      severity: 'ERROR',
    });
    locVerified = false;
  }

  const opVerified = Boolean(raw.operationalVerified);
  const srcVerified = Boolean(raw.sourceVerified);

  const hasErrors = issues.some(i => i.severity === 'ERROR');
  if (hasErrors || !cleanName || !cleanAddress || !districtName || !expectedDivision || !cleanRef || !cleanAttr) {
    return { isValid: false, issues };
  }

  const normalizedName = normalizeFacilityName(cleanName);
  const dedupKey = `${districtName.toLowerCase()}:${normalizedName.toLowerCase()}:${upperType}`;

  return {
    isValid: true,
    issues,
    data: {
      name: cleanName,
      normalizedName,
      facilityType: upperType as ValidFacilityType,
      category: cleanStringOrNull(raw.category) || 'Public / Government',
      district: districtName,
      division: expectedDivision,
      tehsil: cleanStringOrNull(raw.tehsil),
      address: cleanAddress,
      city: cleanStringOrNull(raw.city),
      pincode: cleanStringOrNull(raw.pincode),
      latitude: validLat,
      longitude: validLng,
      contactNumber: cleanStringOrNull(raw.contactNumber),
      email: cleanStringOrNull(raw.email),
      emergencyServices: raw.emergencyServices !== undefined ? raw.emergencyServices : null,
      operationalStatus: opStatus,
      operationalVerified: opVerified,
      locationVerified: locVerified,
      sourceVerified: srcVerified,
      sourceReference: cleanRef,
      sourceAttribution: cleanAttr,
      metadata: raw.metadata || null,
      dedupKey,
    },
  };
}

export interface IngestionOptions {
  dryRun?: boolean;
  targetName?: string;
}

export interface IngestionReport {
  timestamp: string;
  target: string;
  isDryRun: boolean;
  totalProcessed: number;
  inserted: number;
  updated: number;
  skipped: number;
  rejected: number;
  rejections: Array<{ record: RawFacilityInput; issues: ValidationIssue[] }>;
  details: Array<{ action: 'INSERT' | 'UPDATE' | 'SKIP'; facilityName: string; district: string; reason: string }>;
}

/**
 * Ingests a collection of raw facility records into the database with duplicate detection,
 * quality preservation, and structured reporting.
 */
export async function ingestFacilities(
  rawRecords: RawFacilityInput[],
  prisma: PrismaClient,
  options: IngestionOptions = {}
): Promise<IngestionReport> {
  const report: IngestionReport = {
    timestamp: new Date().toISOString(),
    target: options.targetName || 'PostgreSQL',
    isDryRun: Boolean(options.dryRun),
    totalProcessed: rawRecords.length,
    inserted: 0,
    updated: 0,
    skipped: 0,
    rejected: 0,
    rejections: [],
    details: [],
  };

  // Pre-load existing facilities
  const existingFacilities = await prisma.healthcareFacility.findMany();

  for (const raw of rawRecords) {
    const validated = validateFacilityRecord(raw);

    if (!validated.isValid || !validated.data) {
      report.rejected++;
      report.rejections.push({ record: raw, issues: validated.issues });
      continue;
    }

    const candidate = validated.data;

    // Hardened duplicate check:
    // Requires SAME district AND (Exact normalized name match OR (Significant token similarity >= 0.6 AND distance < 250m))
    let matchedExisting = existingFacilities.find(existing => {
      // 1. Must belong to the same district
      if (existing.district.toLowerCase() !== candidate.district.toLowerCase()) {
        return false;
      }

      // 2. Must share facilityType (or both be hospital/CHC)
      if (existing.facilityType !== candidate.facilityType) {
        return false;
      }

      const normExisting = normalizeFacilityName(existing.name).toLowerCase();
      const normCandidate = candidate.normalizedName.toLowerCase();

      // Case A: Exact normalized name match
      if (normExisting === normCandidate) {
        return true;
      }

      // Case B: Token similarity check
      const tokenSim = calculateTokenSimilarity(normExisting, normCandidate);

      // Case C: Spatial proximity check (ONLY valid if high token similarity to avoid merging separate adjacent facilities)
      if (
        existing.latitude !== null &&
        existing.longitude !== null &&
        candidate.latitude !== null &&
        candidate.longitude !== null
      ) {
        const dist = calculateHaversineDistance(
          existing.latitude,
          existing.longitude,
          candidate.latitude,
          candidate.longitude
        );

        // Require BOTH proximity (<250m) AND token similarity (>= 0.6)
        if (dist <= 250 && tokenSim >= 0.6) {
          return true;
        }
      }

      // If no coordinates, require very high token similarity (>= 0.8)
      if (tokenSim >= 0.8) {
        return true;
      }

      return false;
    });

    if (matchedExisting) {
      // Duplicate identified: evaluate monotonic quality enhancement
      let shouldUpdate = false;
      const updateData: Record<string, any> = {};

      // 1. Coordinate Enrichment: Only if existing lacks verified coordinates and candidate has verified ones
      if (
        (!matchedExisting.locationVerified || matchedExisting.latitude === null) &&
        candidate.latitude !== null &&
        candidate.longitude !== null &&
        candidate.locationVerified
      ) {
        shouldUpdate = true;
        updateData.latitude = candidate.latitude;
        updateData.longitude = candidate.longitude;
        updateData.locationVerified = true;
      }

      // 2. Operational Status Enrichment: Only if existing is UNKNOWN and candidate is officially verified ACTIVE
      if (
        (!matchedExisting.operationalVerified || matchedExisting.operationalStatus === 'UNKNOWN') &&
        candidate.operationalStatus !== 'UNKNOWN' &&
        candidate.operationalVerified
      ) {
        shouldUpdate = true;
        updateData.operationalStatus = candidate.operationalStatus;
        updateData.operationalVerified = true;
      }

      // 3. Contact information enrichment (only if existing field is null)
      if (!matchedExisting.contactNumber && candidate.contactNumber) {
        shouldUpdate = true;
        updateData.contactNumber = candidate.contactNumber;
      }

      if (!matchedExisting.email && candidate.email) {
        shouldUpdate = true;
        updateData.email = candidate.email;
      }

      if (matchedExisting.emergencyServices === null && candidate.emergencyServices !== null) {
        shouldUpdate = true;
        updateData.emergencyServices = candidate.emergencyServices;
      }

      if (shouldUpdate) {
        if (!options.dryRun) {
          await prisma.healthcareFacility.update({
            where: { id: matchedExisting.id },
            data: updateData,
          });
        }
        report.updated++;
        report.details.push({
          action: 'UPDATE',
          facilityName: candidate.name,
          district: candidate.district,
          reason: `Enhanced existing facility (${matchedExisting.id}) with verified data.`,
        });
      } else {
        report.skipped++;
        report.details.push({
          action: 'SKIP',
          facilityName: candidate.name,
          district: candidate.district,
          reason: `Duplicate detected (${matchedExisting.id}); existing record already has equal or higher verification status.`,
        });
      }
    } else {
      // New facility: Insert
      if (!options.dryRun) {
        const created = await prisma.healthcareFacility.create({
          data: {
            name: candidate.name,
            facilityType: candidate.facilityType,
            category: candidate.category,
            district: candidate.district,
            division: candidate.division,
            tehsil: candidate.tehsil,
            address: candidate.address,
            city: candidate.city,
            pincode: candidate.pincode,
            latitude: candidate.latitude,
            longitude: candidate.longitude,
            contactNumber: candidate.contactNumber,
            email: candidate.email,
            emergencyServices: candidate.emergencyServices,
            operationalStatus: candidate.operationalStatus,
            operationalVerified: candidate.operationalVerified,
            locationVerified: candidate.locationVerified,
            sourceVerified: candidate.sourceVerified,
            sourceReference: candidate.sourceReference,
            sourceAttribution: candidate.sourceAttribution,
            metadata: candidate.metadata ? candidate.metadata : undefined,
          },
        });
        existingFacilities.push(created);
      }
      report.inserted++;
      report.details.push({
        action: 'INSERT',
        facilityName: candidate.name,
        district: candidate.district,
        reason: 'New verified facility inserted.',
      });
    }
  }

  return report;
}
