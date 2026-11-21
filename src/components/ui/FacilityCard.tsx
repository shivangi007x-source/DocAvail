import React from 'react';
import Link from 'next/link';
import { FacilitySummaryDTO } from '@/lib/types';
import { resolveUiOperationalState } from '@/lib/facilityVerification';
import { Card } from './Card';
import { Badge } from './Badge';
import { Button } from './Button';
import {
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
  ArrowRight,
  Siren,
} from 'lucide-react';

interface FacilityCardProps {
  facility: FacilitySummaryDTO;
}

const FACILITY_TYPE_LABELS: Record<string, string> = {
  HOSPITAL: 'Hospital',
  CHC: 'CHC / Sub-District Hospital',
  PHC: 'Primary Health Centre',
  SUB_CENTRE: 'Sub-Centre',
  CLINIC: 'Clinic',
  DIAGNOSTIC_CENTRE: 'Diagnostic Centre',
};

export const FacilityCard: React.FC<FacilityCardProps> = ({ facility }) => {
  const { verification } = facility;
  const opUiState = resolveUiOperationalState(verification);
  const typeLabel = FACILITY_TYPE_LABELS[facility.facilityType] || facility.facilityType;

  return (
    <Card className="overflow-hidden flex flex-col justify-between border border-slate-200/90 hover:border-brand-300 group transition-all duration-200 shadow-sm hover:shadow-md bg-white">
      <div className="p-5 space-y-4">
        {/* Top Metadata & Source Verification */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="brand" className="text-[11px]">
              {facility.facilityType}
            </Badge>
            {facility.category && (
              <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {facility.category}
              </span>
            )}
            {facility.distanceKm !== undefined && facility.distanceKm !== null && (
              <Badge variant="available" className="text-[10px]">
                {facility.distanceKm} km away
              </Badge>
            )}
          </div>
          {verification.sourceVerified ? (
            <Badge variant="verified" className="gap-1 text-[11px]">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
              Source Attested
            </Badge>
          ) : (
            <Badge variant="default" className="gap-1 text-[11px] text-slate-600">
              <ShieldAlert className="h-3.5 w-3.5 text-slate-500" />
              Source Unverified
            </Badge>
          )}
        </div>

        {/* Title & Administrative Location */}
        <div className="space-y-1">
          <Link
            href={`/facilities/${facility.id}`}
            className="font-bold text-slate-900 text-base leading-snug block hover:text-brand-700 transition-colors"
          >
            {facility.name}
          </Link>
          <p className="text-xs font-semibold text-brand-600">{typeLabel}</p>
          <p className="text-xs text-slate-500">
            District {facility.district} &middot; {facility.division} Division
          </p>
        </div>

        {/* Truthful Multi-Axis Verification Indicators */}
        <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-[11px]">
          {/* Coordinate Provenance */}
          <div className="flex items-start gap-2">
            <Globe className="h-3.5 w-3.5 shrink-0 mt-0.5 text-slate-500" />
            <div className="min-w-0">
              {verification.locationVerified && verification.governmentGisVerified ? (
                <span className="font-semibold text-emerald-700">
                  Gov GIS Verified Coordinates
                </span>
              ) : verification.locationVerified &&
                verification.coordinateSourceTier === 'COMMUNITY_SOURCED_OSM' ? (
                <span className="font-semibold text-amber-800">
                  Community-Sourced Coordinates (OSM &middot; Not Gov Verified)
                </span>
              ) : verification.locationVerified ? (
                <span className="font-semibold text-amber-800">
                  Non-Government Coordinates (Not Gov Verified)
                </span>
              ) : (
                <span className="font-medium text-slate-500">
                  Coordinates Unavailable (Unverified)
                </span>
              )}
            </div>
          </div>

          {/* Operational Evidence Status */}
          <div className="flex items-start gap-2">
            <Clock className="h-3.5 w-3.5 shrink-0 mt-0.5 text-slate-500" />
            <div className="min-w-0">
              {opUiState.isCurrentlyVerified ? (
                <div>
                  <span className="font-semibold text-emerald-700">
                    Operational Evidence Verified
                  </span>
                  {verification.operationalVerificationExpiresAt && (
                    <span className="text-slate-500 block text-[10px]">
                      Report: {verification.operationalReportingPeriod || 'Recorded'} &middot; Review due{' '}
                      {verification.operationalVerificationExpiresAt} (Not live availability)
                    </span>
                  )}
                </div>
              ) : opUiState.freshness === 'EXPIRED' ? (
                <div>
                  <span className="font-semibold text-amber-800 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    Operational Evidence Expired
                  </span>
                  <span className="text-slate-500 block text-[10px]">
                    Expired {verification.operationalVerificationExpiresAt} &middot; Re-verification required
                  </span>
                </div>
              ) : (
                <span className="font-medium text-slate-500">
                  Operational Status Unverified (Directory existence only)
                </span>
              )}
            </div>
          </div>

          {/* Emergency Capability */}
          <div className="flex items-start gap-2">
            <Siren className="h-3.5 w-3.5 shrink-0 mt-0.5 text-slate-500" />
            <div className="min-w-0">
              {verification.emergencyCapabilityStatus === 'DOCUMENTED' ? (
                <div>
                  <span className="font-semibold text-rose-700">
                    Documented 24x7 Emergency Capability
                  </span>
                  <span className="text-slate-500 block text-[10px]">
                    Capability only &middot; Real-time ER availability not monitored
                  </span>
                </div>
              ) : verification.emergencyCapabilityStatus === 'NOT_OFFERED' ? (
                <span className="font-medium text-slate-600">
                  Emergency Services Not Offered
                </span>
              ) : (
                <span className="font-medium text-slate-500">
                  Emergency Capability Unverified
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Address & Contact Summary (Safe Null Handling) */}
        <div className="space-y-1.5 text-xs text-slate-600 pt-1 border-t border-slate-100">
          <div className="flex items-start gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span className="line-clamp-2">
              {facility.address}
              {facility.pincode ? ` - ${facility.pincode}` : ''}
            </span>
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            {facility.contactNumber ? (
              <span className="font-medium text-slate-800">{facility.contactNumber}</span>
            ) : (
              <span className="text-slate-400 italic">Phone not published</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            {facility.email ? (
              <span className="truncate text-slate-700">{facility.email}</span>
            ) : (
              <span className="text-slate-400 italic">Email not published</span>
            )}
          </div>
        </div>
      </div>

      {/* Card Action Footer */}
      <div className="px-5 pb-5 pt-0 grid grid-cols-2 gap-2">
        <Link href={`/facilities/${facility.id}`} className="w-full">
          <Button
            variant="default"
            size="sm"
            className="w-full text-xs font-semibold gap-1 shadow-sm"
          >
            <Building2 className="h-3.5 w-3.5" />
            View Details
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>

        {facility.mapLinks ? (
          <a
            href={facility.mapLinks.openStreetMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full"
          >
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs font-semibold gap-1 border-amber-200 text-amber-900 hover:bg-amber-50"
              title="Open community-sourced location on OpenStreetMap"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              OSM Map
            </Button>
          </a>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled
            className="w-full text-xs text-slate-400 border-slate-200"
            title="Coordinates unavailable"
          >
            No Map Pin
          </Button>
        )}
      </div>
    </Card>
  );
};
