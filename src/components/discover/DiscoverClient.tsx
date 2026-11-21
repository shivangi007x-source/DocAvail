'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { DoctorSummary, FacilitySummaryDTO } from '@/lib/types';
import { DoctorCard } from '@/components/ui/DoctorCard';
import { FacilityCard } from '@/components/ui/FacilityCard';
import { JKFacilityMap } from '@/components/maps/JKFacilityMap';
import { Dropdown } from '@/components/ui/Dropdown';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  JK_ALL_DISTRICTS,
  MEDICAL_SPECIALIZATIONS,
  FACILITY_TYPES,
} from '@/lib/constants';
import {
  Clock3,
  CheckCircle2,
  Navigation,
  Stethoscope,
  Building2,
  RotateCcw,
  ShieldCheck,
  MapPin,
  ArrowRight,
} from 'lucide-react';

export function DiscoverClient() {
  const searchParams = useSearchParams();
  const isRegistered = searchParams.get('registered') === '1';
  const initialDistrict = searchParams.get('district')?.trim() || '';
  const paramLat = searchParams.get('lat');
  const paramLng = searchParams.get('lng');

  const parsedInitialGeo = useMemo(() => {
    if (!paramLat || !paramLng) return null;
    const lat = Number.parseFloat(paramLat);
    const lng = Number.parseFloat(paramLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }, [paramLat, paramLng]);

  const [selectedDistrict, setSelectedDistrict] = useState(initialDistrict);
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedFacilityType, setSelectedFacilityType] = useState('');
  const [maxDistanceKm, setMaxDistanceKm] = useState<string>('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(
    parsedInitialGeo
  );
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoMessage, setGeoMessage] = useState<string | null>(null);

  const { data: doctorsData, isLoading: doctorsLoading } = useQuery<{
    doctors: DoctorSummary[];
    count: number;
  }>({
    queryKey: ['discover-doctors', selectedDistrict, selectedSpecialty],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedDistrict) params.set('district', selectedDistrict);
      if (selectedSpecialty) params.set('specialization', selectedSpecialty);
      const res = await fetch(`/api/doctors?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load doctors');
      return res.json();
    },
    staleTime: 0,
  });

  const { data: facilitiesData, isLoading: facilitiesLoading } = useQuery<{
    facilities: FacilitySummaryDTO[];
  }>({
    queryKey: [
      'discover-facilities',
      selectedDistrict,
      selectedFacilityType,
      userLocation?.lat ?? null,
      userLocation?.lng ?? null,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedDistrict) params.set('district', selectedDistrict);
      if (selectedFacilityType) params.set('facilityType', selectedFacilityType);
      if (userLocation) {
        params.set('lat', String(userLocation.lat));
        params.set('lng', String(userLocation.lng));
      }
      params.set('limit', '24');
      const res = await fetch(`/api/facilities?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load facilities');
      return res.json();
    },
    staleTime: 0,
  });

  const doctors = doctorsData?.doctors || [];
  const rawFacilities = useMemo(
    () => facilitiesData?.facilities ?? [],
    [facilitiesData?.facilities]
  );

  const facilities = useMemo(() => {
    const limitKm = maxDistanceKm ? Number.parseFloat(maxDistanceKm) : null;
    if (!limitKm || !userLocation) return rawFacilities;
    return rawFacilities.filter(
      (f) => f.distanceKm !== undefined && f.distanceKm !== null && f.distanceKm <= limitKm
    );
  }, [rawFacilities, maxDistanceKm, userLocation]);

  const handleUseLocation = () => {
    setGeoMessage(null);
    if (!navigator.geolocation) {
      setGeoMessage('Browser geolocation is unavailable on this device.');
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoLoading(false);
        setGeoMessage('Nearby distances calculated from your granted browser location.');
      },
      () => {
        setGeoLoading(false);
        setGeoMessage('Location permission denied. Showing results by selected J&K district.');
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  };

  const handleReset = () => {
    setSelectedDistrict('');
    setSelectedSpecialty('');
    setSelectedFacilityType('');
    setMaxDistanceKm('');
    setUserLocation(null);
    setGeoMessage(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Post-Registration Pending Approval Confirmation */}
      {isRegistered && (
        <Card className="p-6 border-amber-200 bg-gradient-to-r from-amber-50 via-white to-emerald-50/40 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="busy" dot>
                  PENDING ADMIN APPROVAL
                </Badge>
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  Step 4 of 4 · Account Saved &amp; Ready for Review
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                Patient Registration Submitted{selectedDistrict ? ` — District ${selectedDistrict}` : ''}
              </h1>
              <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                Your patient account has been saved in DocAvail with <strong className="text-slate-900">PENDING</strong> status. Protected patient medical history and appointment booking unlock once an administrator approves your account. Meanwhile, explore approved doctors and verified healthcare facilities near you below.
              </p>
            </div>
            <Link href="/login" className="shrink-0">
              <Button variant="default" size="sm" className="gap-1.5">
                Go to Sign In
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {!isRegistered && (
        <div className="space-y-2 border-b border-slate-200 pb-5">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700">
            <MapPin className="h-3.5 w-3.5" />
            <span>Jammu &amp; Kashmir, India</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Location-Aware Healthcare Discovery
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Browse administrator-approved doctors and verified Jammu &amp; Kashmir hospitals by district, specialization, facility type, and distance.
          </p>
        </div>
      )}

      {/* Privacy Guarantee Notice */}
      <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-950 flex items-start gap-2.5">
        <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
        <p>
          <strong>Privacy Notice:</strong> Discovery displays only publicly listed verified facilities and admin-approved clinicians. Patient accounts, identities, and medical records are never visible here.
        </p>
      </div>

      {/* Filters Card */}
      <Card className="p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Dropdown
            label="J&K District"
            options={[
              { value: '', label: 'All 20 J&K Districts' },
              ...JK_ALL_DISTRICTS.map((d) => ({ value: d, label: d })),
            ]}
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
          />
          <Dropdown
            label="Doctor Specialization"
            options={[
              { value: '', label: 'All Specializations' },
              ...MEDICAL_SPECIALIZATIONS.map((s) => ({ value: s, label: s })),
            ]}
            value={selectedSpecialty}
            onChange={(e) => setSelectedSpecialty(e.target.value)}
          />
          <Dropdown
            label="Facility Type"
            options={[
              { value: '', label: 'All Facility Types' },
              ...FACILITY_TYPES.map((f) => ({ value: f.value, label: f.label })),
            ]}
            value={selectedFacilityType}
            onChange={(e) => setSelectedFacilityType(e.target.value)}
          />
          <Dropdown
            label="Max Distance (with GPS)"
            options={[
              { value: '', label: userLocation ? 'Any Distance' : 'Enable GPS for Distance' },
              { value: '10', label: 'Within 10 km' },
              { value: '25', label: 'Within 25 km' },
              { value: '50', label: 'Within 50 km' },
            ]}
            value={maxDistanceKm}
            onChange={(e) => setMaxDistanceKm(e.target.value)}
            disabled={!userLocation}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={userLocation ? 'default' : 'outline'}
              size="sm"
              isLoading={geoLoading}
              onClick={() => (userLocation ? setUserLocation(null) : handleUseLocation())}
              className="gap-1.5 text-xs"
            >
              <Navigation className="h-3.5 w-3.5" />
              {userLocation ? 'Clear Location Filter' : 'Use My Location (Optional)'}
            </Button>
            {geoMessage && <span className="text-[11px] text-slate-600">{geoMessage}</span>}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-xs text-slate-600 hover:text-rose-600 gap-1"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Filters
          </Button>
        </div>
      </Card>

      {/* Approved Doctors Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-brand-600" />
            Approved Healthcare Professionals
            {selectedDistrict && <Badge variant="brand">{selectedDistrict}</Badge>}
          </h2>
          <span className="text-xs text-slate-500">
            {doctors.length} approved clinician{doctors.length === 1 ? '' : 's'}
          </span>
        </div>

        {doctorsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 rounded-2xl bg-slate-100 animate-pulse border border-slate-200" />
            ))}
          </div>
        ) : doctors.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors.map((doc) => (
              <DoctorCard key={doc.id} doctor={doc} />
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center border-slate-200 space-y-2">
            <Clock3 className="h-8 w-8 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-800">
              No approved doctors found{selectedDistrict ? ` in District ${selectedDistrict}` : ''} matching your filters
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Only verified, administrator-approved doctors appear here. Try clearing filters or browse verified J&amp;K healthcare facilities below.
            </p>
          </Card>
        )}
      </section>

      {/* Genuine J&K Healthcare Facilities + Map */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-brand-600" />
            Verified Healthcare Facilities in Jammu &amp; Kashmir
          </h2>
          <span className="text-xs text-slate-500">
            {facilities.length} matching facilit{facilities.length === 1 ? 'y' : 'ies'}
          </span>
        </div>

        <JKFacilityMap facilities={facilities} userLocation={userLocation} />

        {facilitiesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-72 rounded-2xl bg-slate-100 animate-pulse border border-slate-200" />
            ))}
          </div>
        ) : facilities.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {facilities.map((facility) => (
              <FacilityCard key={facility.id} facility={facility} />
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center border-slate-200 space-y-2">
            <Building2 className="h-8 w-8 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-800">
              No facilities match {selectedDistrict ? `District ${selectedDistrict}` : 'your current filters'}
            </p>
            <p className="text-xs text-slate-500">
              Try selecting All 20 J&amp;K Districts or expanding your distance filter to discover nearby centres.
            </p>
          </Card>
        )}
      </section>
    </div>
  );
}
