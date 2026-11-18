export type CoordinateSourceTier =
  | 'GOVERNMENT_GIS'
  | 'COMMUNITY_SOURCED_OSM'
  | 'NON_GOVERNMENT_UNCONFIRMED'
  | 'UNVERIFIED';

export type OperationalFreshnessStatus =
  | 'VERIFIED_WITHIN_WINDOW'
  | 'EXPIRED'
  | 'UNVERIFIED';

export type EmergencyCapabilityStatus =
  | 'DOCUMENTED'
  | 'NOT_OFFERED'
  | 'UNVERIFIED';

export interface FacilityVerificationDetails {
  sourceVerified: boolean;
  sourceLabel: string;
  locationVerified: boolean;
  governmentGisVerified: boolean;
  coordinateSourceTier: CoordinateSourceTier;
  locationLabel: string;
  osmObjectRef: string | null;
  operationalVerified: boolean;
  effectiveOperationalStatus: 'ACTIVE' | 'CLOSED' | 'UNKNOWN';
  operationalFreshness: OperationalFreshnessStatus;
  operationalLabel: string;
  operationalReportingPeriod: string | null;
  operationalVerificationExpiresAt: string | null;
  operationalReviewPeriodDays: number | null;
  operationalDisclaimer: string;
  emergencyCapabilityStatus: EmergencyCapabilityStatus;
  emergencyCapabilityLabel: string;
  emergencyAvailabilityDisclaimer: string;
}

export interface FacilityMetadataView {
  verifiedSourceUrls: string[];
  operationalEvidenceUrl: string | null;
  historicalOperationalEvidenceUrl: string | null;
  alternatePhone: string | null;
  alternatePhoneSource: string | null;
  alternateEmail: string | null;
  alternateEmailSource: string | null;
  facilityLevel: string | null;
  medicalBlock: string | null;
  blockOfficerContactNote: string | null;
  lastEvidenceAuditDate: string | null;
}

export interface FacilitySummaryDTO {
  id: string;
  name: string;
  facilityType: string;
  category: string | null;
  district: string;
  division: string;
  tehsil: string | null;
  address: string;
  city: string | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  contactNumber: string | null;
  email: string | null;
  emergencyServices: boolean | null;
  operationalStatus: 'ACTIVE' | 'CLOSED' | 'UNKNOWN';
  sourceReference: string;
  sourceAttribution: string;
  mapLinks: {
    openStreetMapUrl: string;
    googleMapsUrl: string;
  } | null;
  verification: FacilityVerificationDetails;
  metadataSummary: FacilityMetadataView;
  createdAt: string;
  updatedAt: string;
}

export interface AffiliatedDoctorDTO {
  affiliationId: string;
  doctorId: string;
  name: string;
  specialization: string;
  qualification: string;
  role: string | null;
  isPrimary: boolean;
  consultationFee: number | null;
  visitingSchedule: string | null;
  availabilityStatus: string;
}

export interface FacilityDetailDTO extends FacilitySummaryDTO {
  affiliatedDoctors: AffiliatedDoctorDTO[];
}

export interface RawFacilityRecordLike {
  id: string;
  name: string;
  facilityType: string;
  category: string | null;
  district: string;
  division: string;
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
  metadata: unknown;
  createdAt: Date | string;
  updatedAt: Date | string;
}

function asRecord(val: unknown): Record<string, unknown> {
  if (val && typeof val === 'object' && !Array.isArray(val)) {
    return val as Record<string, unknown>;
  }
  return {};
}

function asStringOrNull(val: unknown): string | null {
  if (typeof val !== 'string') return null;
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
}

function parseExpiryDateEndUtc(val: string | null): Date | null {
  if (!val) return null;
  const trimmed = val.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parsed = new Date(`${trimmed}T23:59:59.999Z`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Evaluates all verification dimensions of a HealthcareFacility record truthfully:
 * - Separates source provenance from coordinate verification.
 * - Never presents OSM/community coordinates as government-verified.
 * - Dynamically enforces operational evidence expiry using operationalVerificationExpiresAt.
 * - Distinguishes documented emergency capability from live emergency availability.
 */
export function evaluateFacilityVerification(
  facility: RawFacilityRecordLike,
  now: Date = new Date()
): FacilityVerificationDetails {
  const meta = asRecord(facility.metadata);

  // 1. Source Verification
  const sourceVerified = Boolean(facility.sourceVerified);
  const sourceLabel = sourceVerified
    ? 'Source Attested (Official Registry / Directory)'
    : 'Source Unverified';

  // 2. Location & Coordinate Verification (Non-Gov OSM vs Gov GIS vs Missing)
  const hasCoords =
    typeof facility.latitude === 'number' &&
    typeof facility.longitude === 'number' &&
    Number.isFinite(facility.latitude) &&
    Number.isFinite(facility.longitude);

  const osmObjectRef = asStringOrNull(meta.osmObjectRef);
  const coordSourceStr = asStringOrNull(meta.coordinateSource) || '';
  const isGovGisFlag = meta.governmentGisVerified === true;
  const mentionsOsm =
    Boolean(osmObjectRef) ||
    /openstreetmap|\bosm\b|community-sourced/i.test(coordSourceStr) ||
    /openstreetmap|\bosm\b|community-sourced/i.test(facility.sourceAttribution || '');

  let locationVerified = false;
  let governmentGisVerified = false;
  let coordinateSourceTier: CoordinateSourceTier = 'UNVERIFIED';
  let locationLabel = 'Coordinates Unavailable (Pending Verification)';

  if (hasCoords) {
    if (facility.locationVerified && isGovGisFlag && !mentionsOsm) {
      locationVerified = true;
      governmentGisVerified = true;
      coordinateSourceTier = 'GOVERNMENT_GIS';
      locationLabel = 'Government GIS Verified Coordinates';
    } else if (facility.locationVerified && mentionsOsm) {
      locationVerified = true;
      governmentGisVerified = false;
      coordinateSourceTier = 'COMMUNITY_SOURCED_OSM';
      locationLabel = 'Community-Sourced Coordinates (OpenStreetMap — Not Government Verified)';
    } else if (facility.locationVerified) {
      locationVerified = true;
      governmentGisVerified = false;
      coordinateSourceTier = 'NON_GOVERNMENT_UNCONFIRMED';
      locationLabel = 'Non-Government Coordinates (Not Government GIS Verified)';
    } else {
      locationVerified = false;
      governmentGisVerified = false;
      coordinateSourceTier = mentionsOsm ? 'COMMUNITY_SOURCED_OSM' : 'UNVERIFIED';
      locationLabel = 'Coordinates Unverified';
    }
  }

  // 3. Operational Evidence & Dynamic Expiry Enforcement
  const rawOperationalVerified = Boolean(facility.operationalVerified);
  const rawStatusUpper = (facility.operationalStatus || 'UNKNOWN').toUpperCase();
  const reportingPeriod = asStringOrNull(meta.operationalReportingPeriod);
  const expiresAtStr = asStringOrNull(meta.operationalVerificationExpiresAt);
  const reviewPeriodDays =
    typeof meta.operationalReviewPeriodDays === 'number' && Number.isFinite(meta.operationalReviewPeriodDays)
      ? meta.operationalReviewPeriodDays
      : null;

  const expiresAtDate = parseExpiryDateEndUtc(expiresAtStr);
  const isExpired = expiresAtDate !== null && expiresAtDate.getTime() < now.getTime();
  const isWithinWindow =
    rawOperationalVerified && expiresAtDate !== null && expiresAtDate.getTime() >= now.getTime();

  let operationalVerified = false;
  let operationalFreshness: OperationalFreshnessStatus = 'UNVERIFIED';
  let effectiveOperationalStatus: 'ACTIVE' | 'CLOSED' | 'UNKNOWN' = 'UNKNOWN';
  let operationalLabel = 'Operational Status Unverified';
  let operationalDisclaimer =
    'Directory listing confirms institutional existence only; no current operational report verified. Does NOT guarantee current or real-time service availability.';

  if (rawStatusUpper === 'CLOSED') {
    effectiveOperationalStatus = 'CLOSED';
    operationalVerified = isWithinWindow;
    operationalFreshness = isWithinWindow ? 'VERIFIED_WITHIN_WINDOW' : isExpired ? 'EXPIRED' : 'UNVERIFIED';
    operationalLabel = operationalVerified
      ? `Closed (Verified through ${expiresAtStr})`
      : 'Closed Status Reported (Unverified / Expired)';
    operationalDisclaimer =
      'Reported closure status is based on available documentation and does not reflect real-time facility updates.';
  } else if (isWithinWindow && rawStatusUpper === 'ACTIVE') {
    operationalVerified = true;
    operationalFreshness = 'VERIFIED_WITHIN_WINDOW';
    effectiveOperationalStatus = 'ACTIVE';
    operationalLabel = reportingPeriod
      ? `Operational Evidence Verified (${reportingPeriod}; Review due ${expiresAtStr})`
      : `Operational Evidence Verified (Valid through ${expiresAtStr})`;
    operationalDisclaimer = reportingPeriod
      ? `Operational evidence reflects historical institutional reporting (${reportingPeriod}) valid for review through ${expiresAtStr} only, and does NOT guarantee current or real-time service availability.`
      : `Operational evidence valid for review through ${expiresAtStr} only; does NOT guarantee current or real-time service availability.`;
  } else if (isExpired) {
    operationalVerified = false;
    operationalFreshness = 'EXPIRED';
    effectiveOperationalStatus = 'UNKNOWN';
    operationalLabel = `Operational Evidence Expired (${expiresAtStr} — Re-verification Required)`;
    operationalDisclaimer = reportingPeriod
      ? `Historical institutional reporting (${reportingPeriod}) expired on ${expiresAtStr}; cannot be presented as currently verified and does NOT guarantee current service availability.`
      : `Operational evidence expired on ${expiresAtStr}; requires re-verification and does NOT guarantee current service availability.`;
  } else if (rawOperationalVerified && !expiresAtDate) {
    operationalVerified = false;
    operationalFreshness = 'UNVERIFIED';
    effectiveOperationalStatus = 'UNKNOWN';
    operationalLabel = 'Operational Evidence Unverified (Missing Expiry / Review Date)';
    operationalDisclaimer =
      'Operational verification lacks a valid review expiry date and is treated as unverified. Does NOT guarantee current or real-time service availability.';
  }

  // 4. Emergency Capability vs Real-Time Emergency Availability
  let emergencyCapabilityStatus: EmergencyCapabilityStatus = 'UNVERIFIED';
  let emergencyCapabilityLabel = 'Emergency Capability Unverified';
  let emergencyAvailabilityDisclaimer =
    'Emergency service capability has not been verified in primary facility documentation.';

  if (facility.emergencyServices === true) {
    emergencyCapabilityStatus = 'DOCUMENTED';
    emergencyCapabilityLabel = 'Documented 24x7 Emergency / Casualty Capability';
    emergencyAvailabilityDisclaimer =
      'Documented facility capability only — real-time emergency bed, doctor, or trauma unit availability is NOT monitored live. Call 112 / 108 or contact the hospital in an emergency.';
  } else if (facility.emergencyServices === false) {
    emergencyCapabilityStatus = 'NOT_OFFERED';
    emergencyCapabilityLabel = 'Emergency Services Not Offered (Documented)';
    emergencyAvailabilityDisclaimer =
      'Facility documentation indicates emergency services are not offered at this site.';
  }

  return {
    sourceVerified,
    sourceLabel,
    locationVerified,
    governmentGisVerified,
    coordinateSourceTier,
    locationLabel,
    osmObjectRef,
    operationalVerified,
    effectiveOperationalStatus,
    operationalFreshness,
    operationalLabel,
    operationalReportingPeriod: reportingPeriod,
    operationalVerificationExpiresAt: expiresAtStr,
    operationalReviewPeriodDays: reviewPeriodDays,
    operationalDisclaimer,
    emergencyCapabilityStatus,
    emergencyCapabilityLabel,
    emergencyAvailabilityDisclaimer,
  };
}

/**
 * Shared client + server operational expiry guard so both API responses
 * and browser UI rendering consistently enforce operationalVerificationExpiresAt.
 */
export function resolveUiOperationalState(
  verification: FacilityVerificationDetails,
  now: Date = new Date()
): {
  isCurrentlyVerified: boolean;
  freshness: OperationalFreshnessStatus;
  label: string;
} {
  const expiresDate = parseExpiryDateEndUtc(verification.operationalVerificationExpiresAt);
  if (
    verification.operationalVerified &&
    expiresDate !== null &&
    expiresDate.getTime() >= now.getTime()
  ) {
    return {
      isCurrentlyVerified: true,
      freshness: 'VERIFIED_WITHIN_WINDOW',
      label: verification.operationalLabel,
    };
  }
  if (expiresDate !== null && expiresDate.getTime() < now.getTime()) {
    return {
      isCurrentlyVerified: false,
      freshness: 'EXPIRED',
      label: `Operational Evidence Expired (${verification.operationalVerificationExpiresAt} — Re-verification Required)`,
    };
  }
  return {
    isCurrentlyVerified: false,
    freshness: 'UNVERIFIED',
    label: verification.operationalVerified
      ? 'Operational Evidence Unverified (Missing Expiry Date)'
      : verification.operationalLabel,
  };
}

export function formatFacilitySummary(
  facility: RawFacilityRecordLike,
  now: Date = new Date()
): FacilitySummaryDTO {
  const meta = asRecord(facility.metadata);
  const verification = evaluateFacilityVerification(facility, now);

  const hasCoords =
    typeof facility.latitude === 'number' &&
    typeof facility.longitude === 'number' &&
    Number.isFinite(facility.latitude) &&
    Number.isFinite(facility.longitude);

  const mapLinks = hasCoords
    ? {
        openStreetMapUrl:
          verification.osmObjectRef ||
          `https://www.openstreetmap.org/?mlat=${facility.latitude}&mlon=${facility.longitude}#map=16/${facility.latitude}/${facility.longitude}`,
        googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${facility.latitude},${facility.longitude}`,
      }
    : null;

  const metadataSummary: FacilityMetadataView = {
    verifiedSourceUrls: asStringArray(meta.verifiedSourceUrls),
    operationalEvidenceUrl: asStringOrNull(meta.operationalEvidenceUrl),
    historicalOperationalEvidenceUrl: asStringOrNull(meta.historicalOperationalEvidenceUrl),
    alternatePhone: asStringOrNull(meta.alternatePhone),
    alternatePhoneSource: asStringOrNull(meta.alternatePhoneSource),
    alternateEmail: asStringOrNull(meta.alternateEmail),
    alternateEmailSource: asStringOrNull(meta.alternateEmailSource),
    facilityLevel: asStringOrNull(meta.facilityLevel),
    medicalBlock: asStringOrNull(meta.medicalBlock),
    blockOfficerContactNote: asStringOrNull(meta.blockOfficerContactNote),
    lastEvidenceAuditDate: asStringOrNull(meta.lastEvidenceAuditDate),
  };

  return {
    id: facility.id,
    name: facility.name,
    facilityType: facility.facilityType,
    category: facility.category || null,
    district: facility.district,
    division: facility.division,
    tehsil: facility.tehsil || null,
    address: facility.address,
    city: facility.city || null,
    pincode: facility.pincode || null,
    latitude: hasCoords ? facility.latitude : null,
    longitude: hasCoords ? facility.longitude : null,
    contactNumber: facility.contactNumber || null,
    email: facility.email || null,
    emergencyServices:
      facility.emergencyServices === undefined ? null : facility.emergencyServices,
    operationalStatus: verification.effectiveOperationalStatus,
    sourceReference: facility.sourceReference,
    sourceAttribution: facility.sourceAttribution,
    mapLinks,
    verification,
    metadataSummary,
    createdAt:
      facility.createdAt instanceof Date
        ? facility.createdAt.toISOString()
        : String(facility.createdAt),
    updatedAt:
      facility.updatedAt instanceof Date
        ? facility.updatedAt.toISOString()
        : String(facility.updatedAt),
  };
}
