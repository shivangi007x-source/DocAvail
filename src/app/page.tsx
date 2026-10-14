'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dropdown } from '@/components/ui/Dropdown';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { DoctorCard } from '@/components/ui/DoctorCard';
import { SlotPicker } from '@/components/ui/SlotPicker';
import { useToast } from '@/components/ui/Toast';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import {
  MEDICAL_SPECIALIZATIONS,
  CITIES,
  FEATURED_SPECIALTIES,
  DEMO_DOCTORS,
} from '@/lib/constants';
import {
  Search,
  MapPin,
  Stethoscope,
  Clock,
  ShieldCheck,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Users,
  Building,
  Calendar,
} from 'lucide-react';

export default function HomePage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  // Slot Booking Modal State
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [bookingSlotId, setBookingSlotId] = useState<string>('s1');
  const [isBooking, setIsBooking] = useState(false);

  const selectedDoctor = DEMO_DOCTORS.find((d) => d.id === selectedDoctorId);

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
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-brand-200 text-brand-700 text-xs font-semibold shadow-sm">
                <StatusIndicator status="AVAILABLE" pulse={true} showText={false} />
                <span>Live Doctor Availability Network</span>
                <span className="bg-brand-100 text-brand-800 px-2 py-0.5 rounded-full text-[10px]">
                  342 Online Now
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
                Know doctor availability <span className="text-brand-600 underline decoration-brand-300 underline-offset-8">before</span> you travel.
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
                DocAvail provides real-time clinic status tracking so patients never waste trips to busy or offline doctors. Filter by specialization, city, and live status to book verified consultations.
              </p>

              {/* Main Search Filter Box */}
              <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    placeholder="Doctor name or condition..."
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
                    placeholder="All Locations"
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    options={CITIES.map((c) => ({ value: c, label: c }))}
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <span className="text-slate-400">Quick Filters:</span>
                    <Badge variant="available" className="cursor-pointer" dot>
                      Available Now
                    </Badge>
                    <Badge variant="brand" className="cursor-pointer">
                      In-Person Clinic
                    </Badge>
                  </div>
                  <Link href="/doctors" className="w-full sm:w-auto">
                    <Button variant="default" className="w-full sm:w-auto gap-2 px-6 shadow-md">
                      <Search className="h-4 w-4" />
                      Search Available Doctors
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Key Highlights Row */}
              <div className="pt-2 grid grid-cols-3 gap-4 text-xs font-semibold text-slate-600">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-brand-600" />
                  <span>100% Verified Licenses</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-brand-600" />
                  <span>Sub-second Status Sync</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-brand-600" />
                  <span>Instant Request Queue</span>
                </div>
              </div>
            </div>

            {/* Right Column: Live Status Preview Card Widget */}
            <div className="lg:col-span-5 relative">
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-brand-400 to-emerald-400 opacity-20 blur-xl"></div>
              <Card className="relative p-6 bg-white shadow-2xl border-slate-200/80 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-emerald-500 animate-ping"></div>
                    <h3 className="font-bold text-slate-900 text-sm">Real-Time Status Monitor</h3>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">LIVE FEED</span>
                </div>

                {/* Status Ticker Examples */}
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-emerald-800 text-sm">
                        SJ
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Dr. Sarah Jenkins</h4>
                        <p className="text-[11px] text-emerald-700">Cardiology • Apex Heart Clinic</p>
                      </div>
                    </div>
                    <Badge variant="available" dot>AVAILABLE</Badge>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center font-bold text-amber-800 text-sm">
                        MV
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Dr. Marcus Vance</h4>
                        <p className="text-[11px] text-amber-700">General Med • Metro Family</p>
                      </div>
                    </div>
                    <Badge variant="busy" dot>BUSY (30m)</Badge>
                  </div>

                  <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200/60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center font-bold text-rose-800 text-sm">
                        RC
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Dr. Robert Chen</h4>
                        <p className="text-[11px] text-rose-700">Pediatrics • Sunshine Clinic</p>
                      </div>
                    </div>
                    <Badge variant="unavailable" dot>OFFLINE</Badge>
                  </div>
                </div>

                <div className="text-center pt-2">
                  <p className="text-[11px] text-slate-400">
                    Doctors update availability directly from their live status toggle bar.
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Specializations Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Explore Medical Specializations
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Find verified specialists with live consultation availability
            </p>
          </div>
          <Link href="/doctors">
            <Button variant="outline" size="sm" className="gap-1 text-xs">
              View All Specializations
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURED_SPECIALTIES.map((spec) => (
            <Card
              key={spec.name}
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

      {/* Featured Doctors Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="available" dot>REAL-TIME AVAILABLE DOCTORS</Badge>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-2">
              Top Verified Specialists Ready Today
            </h2>
          </div>
          <Link href="/doctors">
            <Button variant="default" size="sm" className="gap-1.5 text-xs">
              See All Doctors
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {DEMO_DOCTORS.map((doc) => (
            <DoctorCard key={doc.id} doctor={doc} onBookSlot={handleOpenBooking} />
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-3xl font-extrabold tracking-tight">How DocAvail Eliminates Uncertainty</h2>
            <p className="text-sm text-slate-400">
              Three simple steps to connect with available healthcare providers in real time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/60 space-y-4">
              <div className="h-12 w-12 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center font-extrabold text-xl">
                1
              </div>
              <h3 className="text-lg font-bold text-white">Check Live Doctor Status</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Filter doctors by specialization and view immediate status badges (Available Now, Busy, Unavailable).
              </p>
            </div>

            <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/60 space-y-4">
              <div className="h-12 w-12 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center font-extrabold text-xl">
                2
              </div>
              <h3 className="text-lg font-bold text-white">Select Consultation Slot</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Choose an open 30-minute time slot for clinic visit or video consultation based on defined working hours.
              </p>
            </div>

            <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/60 space-y-4">
              <div className="h-12 w-12 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center font-extrabold text-xl">
                3
              </div>
              <h3 className="text-lg font-bold text-white">Instant Doctor Request Queue</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Receive quick acceptance or confirmation directly from the doctor dashboard with location details.
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
                <p className="font-semibold text-slate-800">{selectedDoctor.clinicName}</p>
                <p className="text-slate-500">{selectedDoctor.clinicAddress}, {selectedDoctor.city}</p>
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
              <span className="text-xs text-slate-500 font-semibold">Consultation Fee: ${selectedDoctor.fee}</span>
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
