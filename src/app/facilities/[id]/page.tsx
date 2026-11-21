'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { FacilityDetailDTO } from '@/lib/types';
import { resolveUiOperationalState } from '@/lib/facilityVerification';
import { JKFacilityMap } from '@/components/maps/JKFacilityMap';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  ShieldAlert,
  Globe,
  Clock,
  AlertTriangle,
  ExternalLink,
  Siren,
  FileCheck2,
  Stethoscope,
  AlertCircle,
  Info,
} from 'lucide-react';

export default function FacilityDetailPage() {
  const params = useParams();
  const facilityId = params.id as string;

  const { data, isLoading, isError } = useQuery<{ facility: FacilityDetailDTO }>({
    queryKey: ['facility-detail', facilityId],
    queryFn: async () => {
      const res = await fetch(`/api/facilities/${facilityId}`);
      if (!res.ok) {
        throw new Error('Facility not found');
      }
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6 animate-pulse">
        <div className="h-5 w-40 bg-slate-200 rounded" />
        <div className="h-56 bg-slate-100 rounded-3xl border border-slate-200" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-slate-100 rounded-2xl" />
          <div className="h-64 bg-slate-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !data?.facility) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="h-16 w-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Healthcare Facility Not Found</h2>
        <p className="text-xs text-slate-500">
          The requested healthcare facility record could not be located.
        </p>
        <Link href="/facilities">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Facility Directory
          </Button>
        </Link>
      </div>
    );
  }

  const facility = data.facility;
  const { verification, metadataSummary } = facility;
  const opUiState = resolveUiOperationalState(verification);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/facilities"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-brand-600 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Healthcare Facilities
        </Link>

        {metadataSummary.lastEvidenceAuditDate && (
          <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            Last Evidence Audit: {metadataSummary.lastEvidenceAuditDate}
          </span>
        )}
      </div>

      {/* Hero Header Card */}
      <Card className="p-6 sm:p-8 border-slate-200 shadow-sm bg-gradient-to-br from-white via-white to-slate-50/60 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="brand">{facility.facilityType}</Badge>
              {facility.category && (
                <Badge variant="default">{facility.category}</Badge>
              )}
              {verification.sourceVerified ? (
                <Badge variant="verified" className="gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                  Source Attested
                </Badge>
              ) : (
                <Badge variant="default" className="gap-1">
                  <ShieldAlert className="h-3.5 w-3.5 text-slate-500" />
                  Source Unverified
                </Badge>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {facility.name}
            </h1>

            <p className="text-sm font-semibold text-brand-700">
              District {facility.district} &middot; {facility.division} Division
              {metadataSummary.facilityLevel ? ` · ${metadataSummary.facilityLevel}` : ''}
            </p>
          </div>
        </div>

        {/* Emergency Notice Banner */}
        <div
          className={`p-4 rounded-2xl border text-xs flex items-start gap-3 ${
            verification.emergencyCapabilityStatus === 'DOCUMENTED'
              ? 'bg-rose-50/70 border-rose-200 text-rose-950'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}
        >
          <Siren
            className={`h-4 w-4 shrink-0 mt-0.5 ${
              verification.emergencyCapabilityStatus === 'DOCUMENTED'
                ? 'text-rose-600'
                : 'text-slate-500'
            }`}
          />
          <div className="space-y-1">
            <p className="font-bold">{verification.emergencyCapabilityLabel}</p>
            <p className="leading-relaxed opacity-90">
              {verification.emergencyAvailabilityDisclaimer}
            </p>
          </div>
        </div>
      </Card>

      {/* Contact, Location & Map Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Address & Contact Card */}
        <Card className="p-6 border-slate-200 space-y-5">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building2 className="h-4 w-4 text-brand-600" />
            Address &amp; Contact Information
          </h2>

          <dl className="space-y-3 text-xs">
            <div className="flex items-start gap-2.5">
              <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <dt className="font-semibold text-slate-500 uppercase text-[10px]">Address</dt>
                <dd className="text-slate-800 font-medium mt-0.5">{facility.address}</dd>
                <dd className="text-slate-500 mt-0.5">
                  City/Town: {facility.city || 'Unavailable'} &middot; Tehsil:{' '}
                  {facility.tehsil || 'Not specified'} &middot; Pincode:{' '}
                  {facility.pincode || 'Unavailable'}
                </dd>
                {metadataSummary.medicalBlock && (
                  <dd className="text-slate-500 mt-0.5">
                    Medical Block: {metadataSummary.medicalBlock}
                  </dd>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2.5 pt-2 border-t border-slate-100">
              <Phone className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <dt className="font-semibold text-slate-500 uppercase text-[10px]">
                  Published Phone
                </dt>
                <dd className="mt-0.5">
                  {facility.contactNumber ? (
                    <a
                      href={`tel:${facility.contactNumber.replace(/[^+\d]/g, '')}`}
                      className="font-semibold text-brand-700 hover:underline"
                    >
                      {facility.contactNumber}
                    </a>
                  ) : (
                    <span className="text-slate-400 italic">
                      Unavailable / Not published in primary registry
                    </span>
                  )}
                </dd>
                {metadataSummary.alternatePhone && (
                  <dd className="text-slate-600 mt-1">
                    Alternate Office: {metadataSummary.alternatePhone}
                    {metadataSummary.alternatePhoneSource && (
                      <span className="block text-[10px] text-slate-400">
                        Source: {metadataSummary.alternatePhoneSource}
                      </span>
                    )}
                  </dd>
                )}
                {metadataSummary.blockOfficerContactNote && (
                  <dd className="text-slate-500 text-[11px] mt-1">
                    Note: {metadataSummary.blockOfficerContactNote}
                  </dd>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2.5 pt-2 border-t border-slate-100">
              <Mail className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <dt className="font-semibold text-slate-500 uppercase text-[10px]">
                  Official Email
                </dt>
                <dd className="mt-0.5">
                  {facility.email ? (
                    <a
                      href={`mailto:${facility.email}`}
                      className="font-semibold text-brand-700 hover:underline break-all"
                    >
                      {facility.email}
                    </a>
                  ) : (
                    <span className="text-slate-400 italic">
                      Unavailable / Not published in primary registry
                    </span>
                  )}
                </dd>
                {metadataSummary.alternateEmail && (
                  <dd className="text-slate-600 mt-1 break-all">
                    Alternate: {metadataSummary.alternateEmail}
                    {metadataSummary.alternateEmailSource && (
                      <span className="block text-[10px] text-slate-400">
                        Source: {metadataSummary.alternateEmailSource}
                      </span>
                    )}
                  </dd>
                )}
              </div>
            </div>
          </dl>
        </Card>

        {/* Coordinates & Map Card */}
        <Card className="p-6 border-slate-200 space-y-5">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Globe className="h-4 w-4 text-brand-600" />
            Coordinates &amp; Location Verification
          </h2>

          <div className="space-y-4 text-xs">
            <div
              className={`p-3 rounded-xl border ${
                verification.governmentGisVerified
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : verification.locationVerified
                  ? 'bg-amber-50 border-amber-200 text-amber-950'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <p className="font-bold">{verification.locationLabel}</p>
              <p className="text-[11px] mt-1 opacity-90">
                {verification.governmentGisVerified
                  ? 'Coordinates corroborated against an official Government GIS layer.'
                  : verification.coordinateSourceTier === 'COMMUNITY_SOURCED_OSM'
                  ? 'Derived from OpenStreetMap (ODbL) community mapping. This is NOT an official government or Survey of India GIS verification.'
                  : 'Verified geographic coordinates are not yet available for this facility.'}
              </p>
            </div>

            {facility.latitude !== null && facility.longitude !== null && facility.mapLinks ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                      Latitude (WGS-84)
                    </span>
                    <span className="font-mono font-bold text-slate-800">
                      {facility.latitude.toFixed(6)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                      Longitude (WGS-84)
                    </span>
                    <span className="font-mono font-bold text-slate-800">
                      {facility.longitude.toFixed(6)}
                    </span>
                  </div>
                </div>

                {verification.osmObjectRef && (
                  <p className="text-[11px] text-slate-500 break-all">
                    OSM Object Reference:{' '}
                    <a
                      href={verification.osmObjectRef}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-700 hover:underline font-mono"
                    >
                      {verification.osmObjectRef}
                    </a>
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <a
                    href={facility.mapLinks.openStreetMapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm" className="w-full text-xs gap-1.5">
                      <ExternalLink className="h-3.5 w-3.5" />
                      OpenStreetMap
                    </Button>
                  </a>
                  <a
                    href={facility.mapLinks.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm" className="w-full text-xs gap-1.5">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Google Maps
                    </Button>
                  </a>
                </div>

                <div className="pt-2">
                  <JKFacilityMap
                    facilities={[facility]}
                    defaultCenter={{ lat: facility.latitude, lng: facility.longitude }}
                    defaultZoom={13}
                    heightClassName="h-[240px]"
                  />
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-slate-500 space-y-1">
                <MapPin className="h-5 w-5 mx-auto text-slate-300" />
                <p className="font-medium text-slate-700">No Verified Map Pin Available</p>
                <p className="text-[11px]">
                  Coordinates have been deliberately omitted until an unambiguous GIS or spatial survey source is verified.
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Operational Verification & Source Provenance Card */}
      <Card className="p-6 border-slate-200 space-y-5">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <FileCheck2 className="h-4 w-4 text-brand-600" />
          Verification Status &amp; Source Provenance
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Operational Evidence Box */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-brand-600" />
              Operational Evidence &amp; Expiry Policy
            </h3>

            <div
              className={`p-3.5 rounded-xl border space-y-1.5 ${
                opUiState.isCurrentlyVerified
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : opUiState.freshness === 'EXPIRED'
                  ? 'bg-amber-50 border-amber-200 text-amber-950'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold">
                {opUiState.freshness === 'EXPIRED' && (
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                )}
                <span>{opUiState.label}</span>
              </div>
              <p className="text-[11px] leading-relaxed">{verification.operationalDisclaimer}</p>
            </div>

            <ul className="space-y-1 text-[11px] text-slate-600">
              <li>
                <strong>Reported Period:</strong>{' '}
                {verification.operationalReportingPeriod || 'Not available'}
              </li>
              <li>
                <strong>Verification Expiry Date:</strong>{' '}
                {verification.operationalVerificationExpiresAt || 'N/A'}
                {verification.operationalReviewPeriodDays
                  ? ` (${verification.operationalReviewPeriodDays}-day review policy)`
                  : ''}
              </li>
              {(metadataSummary.operationalEvidenceUrl ||
                metadataSummary.historicalOperationalEvidenceUrl) && (
                <li>
                  <strong>Operational Report Link:</strong>{' '}
                  <a
                    href={
                      metadataSummary.operationalEvidenceUrl ||
                      metadataSummary.historicalOperationalEvidenceUrl ||
                      '#'
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-700 hover:underline inline-flex items-center gap-1 break-all"
                  >
                    Official Report Page
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* Source Attribution Box */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
              <Info className="h-4 w-4 text-brand-600" />
              Primary Source Attribution
            </h3>

            <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
              {facility.sourceAttribution}
            </p>

            {metadataSummary.verifiedSourceUrls.length > 0 ? (
              <div className="space-y-1">
                <p className="font-semibold text-slate-500 uppercase text-[10px]">
                  Verified Government / Registry Links
                </p>
                <ul className="space-y-1">
                  {metadataSummary.verifiedSourceUrls.map((url) => (
                    <li key={url}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-700 hover:underline inline-flex items-center gap-1 break-all text-[11px]"
                      >
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        {url}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 break-all">
                Source Reference: {facility.sourceReference}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Affiliated Doctors Section (Zero Synthetic Affiliations) */}
      <Card className="p-6 border-slate-200 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-brand-600" />
            Affiliated Clinicians ({facility.affiliatedDoctors.length})
          </h2>
          <Link href="/doctors" className="text-xs font-semibold text-brand-600 hover:underline">
            Browse All Clinicians
          </Link>
        </div>

        {facility.affiliatedDoctors.length === 0 ? (
          <div className="p-6 rounded-xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-500 space-y-1">
            <p className="font-semibold text-slate-700">
              No verified doctor-facility affiliations are linked to this facility yet.
            </p>
            <p>
              DocAvail only displays clinician-hospital affiliations verified against official duty rosters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {facility.affiliatedDoctors.map((doc) => (
              <Link
                key={doc.affiliationId}
                href={`/doctors/${doc.doctorId}`}
                className="p-4 rounded-xl border border-slate-200 hover:border-brand-300 transition-colors flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 text-sm truncate">{doc.name}</p>
                  <p className="text-xs text-brand-600 font-semibold">{doc.specialization}</p>
                  {doc.role && <p className="text-[11px] text-slate-500">{doc.role}</p>}
                  {doc.visitingSchedule && (
                    <p className="text-[11px] text-slate-500">{doc.visitingSchedule}</p>
                  )}
                </div>
                <Badge variant={doc.availabilityStatus === 'AVAILABLE' ? 'available' : 'default'}>
                  {doc.availabilityStatus}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
