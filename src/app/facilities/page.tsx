'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FacilitySummaryDTO } from '@/lib/types';
import { FacilityCard } from '@/components/ui/FacilityCard';
import { Input } from '@/components/ui/Input';
import { Dropdown } from '@/components/ui/Dropdown';
import { Button } from '@/components/ui/Button';
import {
  JK_DIVISIONS,
  JK_ALL_DISTRICTS,
  JK_DISTRICTS_BY_DIVISION,
  FACILITY_TYPES,
  FACILITY_OPERATIONAL_STATUSES,
} from '@/lib/constants';
import {
  Search,
  Building2,
  Filter,
  RotateCcw,
  ShieldCheck,
  Info,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Navigation,
  MapPin,
} from 'lucide-react';
import { JKFacilityMap } from '@/components/maps/JKFacilityMap';

interface FacilitiesApiResponse {
  facilities: FacilitySummaryDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export default function FacilitiesDirectoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedOpStatus, setSelectedOpStatus] = useState('');
  const [locationVerifiedOnly, setLocationVerifiedOnly] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);

  const availableDistricts = useMemo(() => {
    if (selectedDivision === 'Jammu' || selectedDivision === 'Kashmir') {
      return JK_DISTRICTS_BY_DIVISION[selectedDivision];
    }
    return JK_ALL_DISTRICTS;
  }, [selectedDivision]);

  const handleDivisionChange = (val: string) => {
    setSelectedDivision(val);
    if (
      val &&
      (val === 'Jammu' || val === 'Kashmir') &&
      selectedDistrict &&
      !JK_DISTRICTS_BY_DIVISION[val].includes(selectedDistrict)
    ) {
      setSelectedDistrict('');
    }
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedDivision('');
    setSelectedDistrict('');
    setSelectedType('');
    setSelectedOpStatus('');
    setLocationVerifiedOnly(false);
    setUserLocation(null);
    setGeoError(null);
    setPage(1);
  };

  const handleUseMyLocation = () => {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError('Browser location services are unavailable.');
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setPage(1);
        setGeoLoading(false);
      },
      () => {
        setGeoError('Location permission denied. Showing default J&K directory order.');
        setGeoLoading(false);
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  };

  const { data, isLoading, isError, error } = useQuery<FacilitiesApiResponse>({
    queryKey: [
      'facilities',
      searchQuery,
      selectedDivision,
      selectedDistrict,
      selectedType,
      selectedOpStatus,
      locationVerifiedOnly,
      userLocation?.lat ?? null,
      userLocation?.lng ?? null,
      page,
      limit,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (selectedDivision) params.set('division', selectedDivision);
      if (selectedDistrict) params.set('district', selectedDistrict);
      if (selectedType) params.set('facilityType', selectedType);
      if (selectedOpStatus) params.set('operationalStatus', selectedOpStatus);
      if (locationVerifiedOnly) params.set('locationVerified', 'true');
      if (userLocation) {
        params.set('lat', String(userLocation.lat));
        params.set('lng', String(userLocation.lng));
      }
      params.set('page', String(page));
      params.set('limit', String(limit));

      const res = await fetch(`/api/facilities?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to load healthcare facilities');
      }
      return res.json();
    },
    staleTime: 0,
  });

  const facilities = data?.facilities || [];
  const pagination = data?.pagination;
  const hasActiveFilters = Boolean(
    searchQuery ||
      selectedDivision ||
      selectedDistrict ||
      selectedType ||
      selectedOpStatus ||
      locationVerifiedOnly ||
      userLocation
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-brand-900 via-brand-800 to-slate-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/20 text-xs font-semibold text-brand-200">
            <Building2 className="h-3.5 w-3.5 text-emerald-300" />
            <span>Jammu &amp; Kashmir Public Healthcare Registry</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Healthcare Facility Directory
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Browse verified hospitals and Community Health Centres across Jammu &amp; Kashmir with transparent source attribution, non-government OSM coordinate labels, and time-bounded operational evidence.
          </p>
        </div>
      </div>

      {/* Verification Transparency Banner */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-slate-700">
        <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-900">
            How DocAvail Verification Labels Work
          </p>
          <p className="leading-relaxed">
            <strong>Source Attested</strong> confirms institutional existence in official government portals (NIC / DHS / GMC).{' '}
            <strong>Location coordinates</strong> shown here are community-sourced via OpenStreetMap (ODbL) and are <em>not</em> government GIS verified.{' '}
            <strong>Operational evidence</strong> reflects dated institutional reports subject to a 180-day review expiry and <em>never</em> guarantees real-time emergency or OPD availability.
          </p>
        </div>
      </div>

      {/* Search & Multi-Axis Filters */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-4">
            <Input
              placeholder="Search facility name, city, or address..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              leftIcon={<Search className="h-4 w-4 text-brand-600" />}
              className="w-full"
            />
          </div>

          <div className="md:col-span-2">
            <Dropdown
              options={[
                { value: '', label: 'All Divisions' },
                ...JK_DIVISIONS.map((d) => ({ value: d, label: `${d} Division` })),
              ]}
              value={selectedDivision}
              onChange={(e) => handleDivisionChange(e.target.value)}
              placeholder="Division"
            />
          </div>

          <div className="md:col-span-2">
            <Dropdown
              options={[
                { value: '', label: 'All Districts' },
                ...availableDistricts.map((d) => ({ value: d, label: d })),
              ]}
              value={selectedDistrict}
              onChange={(e) => {
                setSelectedDistrict(e.target.value);
                setPage(1);
              }}
              placeholder="District"
            />
          </div>

          <div className="md:col-span-2">
            <Dropdown
              options={[
                { value: '', label: 'All Facility Types' },
                ...FACILITY_TYPES.map((t) => ({ value: t.value, label: t.value })),
              ]}
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setPage(1);
              }}
              placeholder="Type"
            />
          </div>

          <div className="md:col-span-2">
            <Dropdown
              options={[
                { value: '', label: 'All Op. Statuses' },
                ...FACILITY_OPERATIONAL_STATUSES.map((s) => ({
                  value: s.value,
                  label: s.label,
                })),
              ]}
              value={selectedOpStatus}
              onChange={(e) => {
                setSelectedOpStatus(e.target.value);
                setPage(1);
              }}
              placeholder="Op. Status"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2.5 text-slate-600">
            <Filter className="h-3.5 w-3.5 text-brand-600" />
            {isLoading ? (
              <span>Loading facilities...</span>
            ) : (
              <span>
                Showing <strong className="text-slate-900">{facilities.length}</strong> of{' '}
                <strong className="text-slate-900">{pagination?.total ?? 0}</strong> matching facilities
              </span>
            )}

            <Button
              type="button"
              variant={userLocation ? 'default' : 'outline'}
              size="sm"
              isLoading={geoLoading}
              onClick={() => {
                if (userLocation) {
                  setUserLocation(null);
                  setPage(1);
                } else {
                  handleUseMyLocation();
                }
              }}
              className="h-7 px-2.5 text-[11px] gap-1"
            >
              <Navigation className="h-3 w-3" />
              {userLocation ? 'Nearby Active (Clear)' : 'Find Nearby (Use My Location)'}
            </Button>

            <Button
              type="button"
              variant={locationVerifiedOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setLocationVerifiedOnly((v) => !v);
                setPage(1);
              }}
              className="h-7 px-2.5 text-[11px] gap-1"
            >
              <MapPin className="h-3 w-3" />
              Mapped Coordinates Only
            </Button>
          </div>

          <div className="flex items-center gap-3">
            {geoError && <span className="text-[11px] text-amber-700">{geoError}</span>}
            <div className="flex items-center gap-1.5">
              <label htmlFor="page-limit" className="text-slate-500">
                Per page:
              </label>
              <select
                id="page-limit"
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white text-slate-700"
              >
                <option value={6}>6</option>
                <option value={12}>12</option>
                <option value={24}>24</option>
              </select>
            </div>

            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="text-xs text-slate-600 hover:text-rose-600 gap-1"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Filters
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Synchronized Jammu & Kashmir Interactive Map */}
      {!isError && (
        <JKFacilityMap
          facilities={facilities}
          userLocation={userLocation}
        />
      )}

      {/* Results Area */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="h-80 rounded-2xl bg-slate-100 border border-slate-200 animate-pulse"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-rose-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">Unable to Load Facilities</h3>
          <p className="text-xs text-slate-600">
            {(error as Error)?.message || 'An unexpected error occurred.'}
          </p>
        </div>
      ) : facilities.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Building2 className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">No Matching Healthcare Facilities</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              No facilities match your current search or filter selection. Note that filtering for &ldquo;Verified &amp; Unexpired Evidence&rdquo; excludes facilities with missing or expired operational reports.
            </p>
          </div>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={handleResetFilters} className="gap-1.5 text-xs">
              <RotateCcw className="h-3.5 w-3.5" />
              Clear All Filters
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {facilities.map((facility) => (
              <FacilityCard key={facility.id} facility={facility} />
            ))}
          </div>

          {/* Pagination Controls */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
              <p className="text-xs text-slate-500">
                Page <strong className="text-slate-900">{pagination.page}</strong> of{' '}
                <strong className="text-slate-900">{pagination.totalPages}</strong> &middot;{' '}
                {pagination.total} total facilities
              </p>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasPrevPage}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="text-xs gap-1"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </Button>

                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pNum) => (
                  <Button
                    key={pNum}
                    variant={pNum === pagination.page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPage(pNum)}
                    className="text-xs w-8 px-0"
                  >
                    {pNum}
                  </Button>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasNextPage}
                  onClick={() => setPage((p) => p + 1)}
                  className="text-xs gap-1"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Trust Footer Note */}
      <div className="flex items-center justify-center gap-2 text-xs text-slate-500 pt-4">
        <ShieldCheck className="h-4 w-4 text-brand-600" />
        <span>
          Only documented, source-attributed facility fields are displayed; unverified fields remain clearly marked unavailable.
        </span>
      </div>
    </div>
  );
}
