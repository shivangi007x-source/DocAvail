'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { DoctorSummary } from '@/lib/types';
import { DoctorCard } from '@/components/ui/DoctorCard';
import { BookAppointmentModal } from '@/components/appointments/BookAppointmentModal';
import { Input } from '@/components/ui/Input';
import { Dropdown } from '@/components/ui/Dropdown';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useDoctorAvailabilityStream } from '@/hooks/useDoctorAvailability';
import {
  MEDICAL_SPECIALIZATIONS,
  JK_ALL_DISTRICTS,
  POPULAR_SEARCH_CONDITIONS,
} from '@/lib/constants';
import {
  Search,
  MapPin,
  Stethoscope,
  Filter,
  RotateCcw,
  Sparkles,
  Activity,
  HeartPulse,
} from 'lucide-react';

export default function FindDoctorPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState<'ALL' | 'AVAILABLE'>('ALL');

  // SSE real-time sync hook
  const { connectionStatus } = useDoctorAvailabilityStream();

  // Booking modal state
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);

  // Fetch doctors with search query parameters passed to the backend
  const { data: doctorsData, isLoading } = useQuery<{
    doctors: DoctorSummary[];
    count: number;
  }>({
    queryKey: ['doctors', searchQuery, selectedSpecialty, selectedDistrict, availabilityFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (selectedSpecialty) params.set('specialization', selectedSpecialty);
      if (selectedDistrict) params.set('district', selectedDistrict);
      if (availabilityFilter === 'AVAILABLE') params.set('availability', 'AVAILABLE');

      const res = await fetch(`/api/doctors?${params.toString()}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Failed to load doctors');
      return res.json();
    },
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const doctors = doctorsData?.doctors || [];
  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId) ?? null;

  const handleQuickConditionClick = (condition: string) => {
    if (searchQuery === condition) {
      setSearchQuery('');
    } else {
      setSearchQuery(condition);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedSpecialty('');
    setSelectedDistrict('');
    setAvailabilityFilter('ALL');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-brand-900 via-brand-800 to-slate-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/20 text-xs font-semibold text-brand-200">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>Disease & Specialty Discovery Engine</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Find the Right Doctor for Your Condition
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Search verified specialists by disease (e.g. diabetes, asthma, migraine), medical specialty, or clinic location. View real-time operating availability before booking.
          </p>
        </div>
      </div>

      {/* Main Filter & Search Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Input: Disease, Doctor, Clinic */}
          <div className="md:col-span-5">
            <Input
              placeholder="Search by disease (e.g. diabetes), specialty, or doctor name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="h-4 w-4 text-brand-600" />}
              className="w-full"
            />
          </div>

          {/* Specialty Dropdown */}
          <div className="md:col-span-3">
            <Dropdown
              options={[
                { value: '', label: 'All Specialties' },
                ...MEDICAL_SPECIALIZATIONS.map((s) => ({ value: s, label: s })),
              ]}
              value={selectedSpecialty}
              onChange={(e) => setSelectedSpecialty(e.target.value)}
              placeholder="Filter Specialty"
            />
          </div>

          {/* J&K District Dropdown */}
          <div className="md:col-span-2">
            <Dropdown
              options={[
                { value: '', label: 'All J&K Districts' },
                ...JK_ALL_DISTRICTS.map((d) => ({ value: d, label: d })),
              ]}
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              placeholder="District"
            />
          </div>

          {/* Availability Toggle */}
          <div className="md:col-span-2 flex items-center justify-end">
            <Button
              type="button"
              variant={availabilityFilter === 'AVAILABLE' ? 'default' : 'outline'}
              size="sm"
              onClick={() =>
                setAvailabilityFilter(availabilityFilter === 'AVAILABLE' ? 'ALL' : 'AVAILABLE')
              }
              className="w-full text-xs font-semibold gap-1.5"
            >
              <span className="relative flex h-2 w-2">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    availabilityFilter === 'AVAILABLE' ? 'bg-emerald-300' : 'bg-slate-400'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    availabilityFilter === 'AVAILABLE' ? 'bg-emerald-400' : 'bg-slate-500'
                  }`}
                />
              </span>
              {availabilityFilter === 'AVAILABLE' ? 'Online Only' : 'All Availability'}
            </Button>
          </div>
        </div>

        {/* Quick Popular Condition Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-1">
            <Activity className="h-3.5 w-3.5 text-brand-600" />
            Quick Disease Match:
          </span>
          {POPULAR_SEARCH_CONDITIONS.map((cond) => {
            const isSelected = searchQuery.toLowerCase() === cond.toLowerCase();
            return (
              <button
                key={cond}
                type="button"
                onClick={() => handleQuickConditionClick(cond)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                  isSelected
                    ? 'bg-brand-600 text-white shadow-sm ring-2 ring-brand-300'
                    : 'bg-slate-100 text-slate-700 hover:bg-brand-50 hover:text-brand-700'
                }`}
              >
                {cond}
              </button>
            );
          })}
          {(searchQuery || selectedSpecialty || selectedDistrict || availabilityFilter !== 'ALL') && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 ml-auto font-medium"
            >
              <RotateCcw className="h-3 w-3" />
              Reset All
            </button>
          )}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-slate-900">
            {isLoading ? 'Searching Doctors...' : `Found ${doctors.length} Qualified Doctor${doctors.length === 1 ? '' : 's'}`}
          </h2>
          {searchQuery && (
            <Badge variant="brand" className="text-xs">
              Search: &ldquo;{searchQuery}&rdquo;
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {connectionStatus === 'connected' ? 'Live availability sync active' : 'Connecting to live updates...'}
          </span>
        </div>
      </div>

      {/* Doctors Grid / Loading / Empty State */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-96 rounded-2xl bg-slate-100 animate-pulse border border-slate-200"
            />
          ))}
        </div>
      ) : doctors.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map((doctor) => (
            <DoctorCard
              key={doctor.id}
              doctor={doctor}
              onBookSlot={setSelectedDoctorId}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto shadow-inner">
            <Stethoscope className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No Doctors Match Your Search</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            We couldn&apos;t find verified doctors matching &ldquo;{searchQuery || selectedSpecialty || selectedDistrict}&rdquo;. Try searching for general terms like &ldquo;Diabetes&rdquo;, &ldquo;Cardiology&rdquo;, or &ldquo;Skin Allergy&rdquo;.
          </p>
          <Button variant="outline" size="sm" onClick={handleResetFilters} className="gap-1.5 text-xs">
            <RotateCcw className="h-3.5 w-3.5" />
            Clear Search & Filters
          </Button>
        </div>
      )}

      {/* Appointment Slot Booking Modal */}
      <BookAppointmentModal
        doctor={selectedDoctor}
        onClose={() => setSelectedDoctorId(null)}
        redirectBasePath="/doctors"
      />
    </div>
  );
}
