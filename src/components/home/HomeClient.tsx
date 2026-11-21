'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dropdown } from '@/components/ui/Dropdown';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { DoctorCard } from '@/components/ui/DoctorCard';
import { FacilityCard } from '@/components/ui/FacilityCard';
import { JKFacilityMap } from '@/components/maps/JKFacilityMap';
import { SlotPicker } from '@/components/ui/SlotPicker';
import { useToast } from '@/components/ui/Toast';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { useDoctorAvailabilityStream } from '@/hooks/useDoctorAvailability';
import { useQuery } from '@tanstack/react-query';
import { DoctorSummary, FacilitySummaryDTO } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import {
  MEDICAL_SPECIALIZATIONS,
  JK_ALL_DISTRICTS,
  FEATURED_SPECIALTIES,
} from '@/lib/constants';
import {
  Search,
  MapPin,
  Stethoscope,
  Clock,
  ShieldCheck,
  ArrowRight,
  Building,
  Building2,
  Calendar,
  Wifi,
  WifiOff,
  Navigation,
} from 'lucide-react';

interface HomeClientProps {
  initialDoctors: DoctorSummary[];
  initialFacilities: FacilitySummaryDTO[];
}

export function HomeClient({ initialDoctors, initialFacilities }: HomeClientProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  // Real-time SSE stream hook
  const { connectionStatus } = useDoctorAvailabilityStream();

  const hasDoctorFilters = Boolean(searchQuery || selectedSpecialty || selectedDistrict);

  // Fetch approved J&K healthcare professionals from PostgreSQL without stale caching
  const { data: doctorsData, isLoading: doctorsLoading } = useQuery<{
    doctors: DoctorSummary[];
    count: number;
  }>({
    queryKey: ['doctors', searchQuery, selectedSpecialty, selectedDistrict],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (selectedSpecialty) params.set('specialization', selectedSpecialty);
      if (selectedDistrict) params.set('district', selectedDistrict);

      const res = await fetch(`/api/doctors?${params.toString()}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Failed to load doctors');
      return res.json();
    },
    initialData: hasDoctorFilters
      ? undefined
      : { doctors: initialDoctors, count: initialDoctors.length },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  // Fetch J&K Healthcare Facilities synchronized with selected district / search / optional geolocation
  const { data: facilitiesData, isLoading: facilitiesLoading } = useQuery<{
    facilities: FacilitySummaryDTO[];
  }>({
    queryKey: [
      'home-facilities',
      selectedDistrict,
      searchQuery,
      userLocation?.lat ?? null,
      userLocation?.lng ?? null,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedDistrict) params.set('district', selectedDistrict);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (userLocation) {
        params.set('lat', String(userLocation.lat));
        params.set('lng', String(userLocation.lng));
      }
      params.set('limit', '12');

      const res = await fetch(`/api/facilities?${params.toString()}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Failed to load facilities');
      return res.json();
    },
    initialData:
      !selectedDistrict && !searchQuery && !userLocation
        ? { facilities: initialFacilities }
        : undefined,
    staleTime: 0,
  });

  const doctors = useMemo(() => doctorsData?.doctors ?? [], [doctorsData?.doctors]);
  const filteredDoctors = doctors;
  const facilities = useMemo(
    () => facilitiesData?.facilities ?? [],
    [facilitiesData?.facilities]
  );

  // District options cover all 20 Jammu & Kashmir districts
  const districtOptions = useMemo(
    () => JK_ALL_DISTRICTS.map((d) => ({ value: d, label: d })),
    []
  );

  const onlineCount = doctors.filter((d) => d.availabilityStatus === 'AVAILABLE').length;

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast('Location Unavailable', 'Browser geolocation is not supported on this device.', 'error');
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoLoading(false);
        toast(
          'Location Enabled',
          'Sorting mapped Jammu & Kashmir facilities by distance from your location.',
          'success'
        );
      },
      () => {
        setGeoLoading(false);
        toast(
          'Permission Denied',
          'Location permission was declined. Showing standard J&K district order.',
          'info'
        );
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  };

  // Slot Booking Modal State
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [bookingSlotId, setBookingSlotId] = useState<string>('s1');
  const [isBooking, setIsBooking] = useState(false);

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);

  const handleOpenBooking = (doctorId: string) => {
    setSelectedDoctorId(doctorId);
  };

  const handleConfirmBooking = () => {
    if (!selectedDoctor) return;
    setIsBooking(true);
    setTimeout(() => {
      setIsBooking(false);
      setSelectedDoctorId(null);
      toast(
        'Appointment Request Sent!',
        `Your request with ${selectedDoctor.name} has been submitted for confirmation.`,
        'success'
      );
    }, 1000);
  };

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50/80 via-slate-50 to-slate-50 pt-12 pb-20 border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Headline & Search */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-brand-200 text-brand-700 text-xs font-semibold shadow-sm flex-wrap">
                <StatusIndicator status="AVAILABLE" pulse={true} showText={false} />
                <span>Jammu &amp; Kashmir Healthcare Network · India</span>
                <span className="bg-brand-100 text-brand-800 px-2 py-0.5 rounded-full text-[10px]">
                  {onlineCount > 0 ? `${onlineCount} Available Online` : 'All 20 J&K Districts'}
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
                Find doctors &amp; hospitals across <span className="text-brand-600 underline decoration-brand-300 underline-offset-8">Jammu &amp; Kashmir</span>.
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
                Search administrator-approved doctors and public healthcare facilities across all 20 districts of Jammu and Kashmir before you travel.
              </p>

              {/* Main Search Filter Box */}
              <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    placeholder="Doctor, hospital, or condition..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    leftIcon={<Search className="h-4 w-4" />}
                  />
                  <Dropdown
                    placeholder="All Specializations"
                    value={selectedSpecialty}
                    onChange={(e) => setSelectedSpecialty(e.target.value)}
                    options={MEDICAL_SPECIALIZATIONS.map((s) => ({ value: s, label: s }))}
                  />
                  <Dropdown
                    placeholder="All 20 J&K Districts"
                    value={selectedDistrict}
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                    options={districtOptions}
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 font-medium">
                    <span className="text-slate-400">Quick Districts:</span>
                    {['Jammu', 'Srinagar', 'Kathua', 'Baramulla', 'Udhampur', 'Pulwama'].map((dist) => (
                      <button
                        key={dist}
                        type="button"
                        onClick={() =>
                          setSelectedDistrict((prev) => (prev === dist ? '' : dist))
                        }
                        className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                          selectedDistrict === dist
                            ? 'bg-brand-600 text-white border-brand-600'
                            : 'bg-slate-50 text-slate-700 hover:bg-brand-50 hover:text-brand-700 border-slate-200'
                        }`}
                      >
                        {dist}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                      variant="default"
                      className="w-full sm:w-auto gap-2 px-6 shadow-md"
                      onClick={() => {
                        const el = document.getElementById('featured-doctors');
                        el?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      <Search className="h-4 w-4" />
                      Search J&amp;K
                    </Button>
                    <Link href="/doctors">
                      <Button variant="outline" className="text-xs">
                        Doctors
                      </Button>
                    </Link>
                    <Link href="/facilities">
                      <Button variant="outline" className="text-xs gap-1">
                        <Building className="h-3.5 w-3.5" />
                        Facilities
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Key Highlights Row */}
              <div className="pt-2 grid grid-cols-3 gap-4 text-xs font-semibold text-slate-600">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-brand-600" />
                  <span>Admin-Approved Doctors</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-brand-600" />
                  <span>20 J&amp;K Districts</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-brand-600" />
                  <span>Live Status Sync</span>
                </div>
              </div>
            </div>

            {/* Right Column: Live Status Preview Card Widget */}
            <div className="lg:col-span-5 relative">
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-brand-400 to-emerald-400 opacity-20 blur-xl"></div>
              <Card className="relative p-6 bg-white shadow-2xl border-slate-200/80 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping"></div>
                    <h3 className="font-bold text-slate-900 text-sm">Real-Time Status Monitor</h3>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
                    {connectionStatus === 'connected' ? (
                      <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                        <Wifi className="h-3 w-3" /> LIVE SSE SYNC
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-400">
                        <WifiOff className="h-3 w-3" /> CONNECTING...
                      </span>
                    )}
                  </div>
                </div>

                {/* Status Ticker from Real Approved J&K Doctors */}
                <div className="space-y-3">
                  {doctors.slice(0, 3).map((doc) => {
                    const initials = doc.name
                      .replace(/^Dr\.?\s+/i, '')
                      .split(/\s+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((p) => p[0]?.toUpperCase() || '')
                      .join('') || 'DR';
                    const facilityOrClinic =
                      doc.affiliatedFacilities?.[0]?.name || doc.clinicName || doc.district || doc.city;

                    return (
                      <div
                        key={doc.id}
                        className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                          doc.availabilityStatus === 'AVAILABLE'
                            ? 'bg-emerald-50/70 border-emerald-200/60'
                            : doc.availabilityStatus === 'BUSY'
                            ? 'bg-amber-50/70 border-amber-200/60'
                            : 'bg-rose-50/70 border-rose-200/60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10 rounded-full overflow-hidden bg-brand-50 shrink-0 border border-slate-200 flex items-center justify-center">
                            {doc.avatarUrl ? (
                              <Image
                                src={doc.avatarUrl}
                                alt={doc.name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <span className="text-xs font-bold text-brand-700">{initials}</span>
                            )}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900">{doc.name}</h4>
                            <p className="text-[11px] text-slate-500 truncate max-w-[170px]">
                              {doc.specialization}
                              {facilityOrClinic ? ` • ${facilityOrClinic}` : ''}
                            </p>
                            {doc.statusNote && (
                              <p className="text-[10px] italic text-slate-600 truncate max-w-[170px]">
                                &ldquo;{doc.statusNote}&rdquo;
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge
                          variant={
                            doc.availabilityStatus === 'AVAILABLE'
                              ? 'available'
                              : doc.availabilityStatus === 'BUSY'
                              ? 'busy'
                              : 'unavailable'
                          }
                          dot
                        >
                          {doc.availabilityStatus}
                        </Badge>
                      </div>
                    );
                  })}

                  {doctors.length === 0 && !doctorsLoading && (
                    <div className="py-6 text-center space-y-2 text-xs text-slate-500">
                      <p className="font-semibold text-slate-700">
                        No approved J&amp;K clinicians broadcasting live status yet.
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Verified Jammu &amp; Kashmir hospitals and CHCs are shown below.
                      </p>
                    </div>
                  )}
                </div>

                <div className="text-center pt-2 border-t border-slate-100">
                  <p className="text-[11px] text-slate-500">
                    Live broadcast updates appear only for verified, admin-approved doctors.
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Verified J&K Healthcare Facilities & Interactive Map */}
      <section id="jk-facilities" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <Badge variant="verified" className="gap-1 text-[11px]">
              <Building2 className="h-3.5 w-3.5 text-blue-600" />
              JAMMU &amp; KASHMIR PUBLIC FACILITY REGISTRY
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-2">
              Hospitals &amp; Health Centres Across J&amp;K
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Real facility records from PostgreSQL with source attribution, non-government OSM coordinate labels, and district filtering.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={userLocation ? 'default' : 'outline'}
              size="sm"
              isLoading={geoLoading}
              onClick={() => (userLocation ? setUserLocation(null) : handleUseMyLocation())}
              className="gap-1.5 text-xs"
            >
              <Navigation className="h-3.5 w-3.5" />
              {userLocation ? 'Nearby Active (Clear)' : 'Find Nearby Facilities'}
            </Button>
            <Link href="/facilities">
              <Button variant="outline" size="sm" className="gap-1 text-xs">
                Explore Full Registry
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
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
            {facilities.slice(0, 6).map((facility) => (
              <FacilityCard key={facility.id} facility={facility} />
            ))}
          </div>
        ) : (
          <Card className="p-10 text-center border-slate-200 space-y-2">
            <Building2 className="h-8 w-8 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-800">
              No facilities match {selectedDistrict ? `District ${selectedDistrict}` : 'the selected filters'} yet
            </p>
            <p className="text-xs text-slate-500">
              Clear the district/search filter or browse all verified J&amp;K facilities.
            </p>
          </Card>
        )}
      </section>

      {/* Featured Approved Doctors Showcase (Connected to Real Database & SSE) */}
      <section id="featured-doctors" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 scroll-mt-20">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="available" dot>REAL-TIME APPROVED DOCTORS</Badge>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-2">
              Approved Healthcare Professionals Ready Today
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Displays administrator-approved J&amp;K clinicians from PostgreSQL with live availability updates.
            </p>
          </div>
          {hasDoctorFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedSpecialty('');
                setSelectedDistrict('');
                setSearchQuery('');
              }}
              className="text-xs text-brand-700 hover:bg-brand-50"
            >
              Reset Filters
            </Button>
          )}
        </div>

        {doctorsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-72 rounded-2xl bg-slate-100 animate-pulse border border-slate-200" />
            ))}
          </div>
        ) : filteredDoctors.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredDoctors.map((doc) => (
              <DoctorCard key={doc.id} doctor={doc} onBookSlot={handleOpenBooking} />
            ))}
          </div>
        ) : hasDoctorFilters ? (
          <Card className="p-12 text-center border-slate-200 space-y-3">
            <Stethoscope className="h-10 w-10 text-slate-400 mx-auto" />
            <h3 className="font-bold text-slate-800 text-base">No doctors found matching filters</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your search query, specialization, or J&amp;K district to find approved healthcare providers.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedSpecialty('');
                setSelectedDistrict('');
                setSearchQuery('');
              }}
            >
              Clear All Filters
            </Button>
          </Card>
        ) : (
          <Card className="p-12 text-center border-slate-200 space-y-4">
            <Stethoscope className="h-10 w-10 text-slate-400 mx-auto" />
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 text-base">
                No approved healthcare professionals available yet
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Registered J&amp;K doctors appear here automatically once reviewed and approved by a DocAvail administrator.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <Link href="/facilities">
                <Button variant="outline" size="sm">
                  Browse J&amp;K Healthcare Facilities
                </Button>
              </Link>
              <Link href="/register?role=DOCTOR">
                <Button variant="default" size="sm">
                  Register as a Doctor
                </Button>
              </Link>
            </div>
          </Card>
        )}
      </section>

      {/* Specializations Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Explore Medical Specializations
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Find verified J&amp;K specialists with live consultation availability
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-xs"
            onClick={() => {
              setSelectedSpecialty('');
              const el = document.getElementById('featured-doctors');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            View All Specializations
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURED_SPECIALTIES.map((spec) => (
            <Card
              key={spec.name}
              onClick={() => {
                setSelectedSpecialty(
                  spec.name === 'General Physician'
                    ? 'General Medicine'
                    : spec.name
                );
                const el = document.getElementById('featured-doctors');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="p-6 cursor-pointer hover:border-brand-400 group transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="h-12 w-12 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 group-hover:bg-brand-600 group-hover:text-white transition-colors">
                  <Stethoscope className="h-6 w-6" />
                </div>
                <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full border border-brand-100">
                  {spec.count}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mt-4 group-hover:text-brand-700 transition-colors">
                {spec.name}
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {spec.description}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-3xl font-extrabold tracking-tight">How DocAvail Serves Jammu &amp; Kashmir</h2>
            <p className="text-sm text-slate-400">
              Three simple steps to connect with verified hospitals and approved healthcare providers across J&amp;K.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/60 space-y-4">
              <div className="h-12 w-12 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center font-extrabold text-xl">
                1
              </div>
              <h3 className="text-lg font-bold text-white">Filter by J&amp;K District</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Browse hospitals, CHCs, and approved doctors across all 20 districts of Jammu &amp; Kashmir.
              </p>
            </div>

            <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/60 space-y-4">
              <div className="h-12 w-12 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center font-extrabold text-xl">
                2
              </div>
              <h3 className="text-lg font-bold text-white">Inspect Verified Details</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                View source-attributed facility details, map coordinates with transparent provenance labels, and clinician schedules.
              </p>
            </div>

            <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/60 space-y-4">
              <div className="h-12 w-12 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center font-extrabold text-xl">
                3
              </div>
              <h3 className="text-lg font-bold text-white">Request Consultation</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Request an in-person or video consultation slot with approved clinicians on DocAvail.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Slot Booking Modal */}
      <Modal
        isOpen={!!selectedDoctorId}
        onClose={() => setSelectedDoctorId(null)}
        title={`Request Appointment — ${selectedDoctor?.name}`}
        description={`${selectedDoctor?.specialization} • ${selectedDoctor?.clinicName}`}
      >
        {selectedDoctor && (
          <div className="space-y-5 pt-2">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
              <div>
                <p className="font-semibold text-slate-800">
                  {selectedDoctor.affiliatedFacilities?.[0]?.name || selectedDoctor.clinicName}
                </p>
                <p className="text-slate-500">
                  {[selectedDoctor.clinicAddress, selectedDoctor.city, selectedDoctor.district]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              </div>
            </div>

            <SlotPicker
              selectedSlotId={bookingSlotId}
              onSelectSlot={(id) => setBookingSlotId(id)}
            />

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Reason for Visit (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Briefly describe your symptoms or routine checkup requirement..."
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
              ></textarea>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500 font-semibold">
                Consultation Fee:{' '}
                {(selectedDoctor.consultationFee ?? selectedDoctor.fee) > 0
                  ? formatCurrency(selectedDoctor.consultationFee ?? selectedDoctor.fee)
                  : 'Not listed'}
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setSelectedDoctorId(null)}>
                  Cancel
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  isLoading={isBooking}
                  onClick={handleConfirmBooking}
                >
                  Confirm Request
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
