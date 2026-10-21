'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { SlotPicker } from '@/components/ui/SlotPicker';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/utils';
import {
  ArrowLeft,
  Star,
  MapPin,
  Building2,
  CalendarCheck,
  ShieldCheck,
  Clock,
  Activity,
  CheckCircle,
  Video,
  UserCheck,
  Calendar,
  AlertCircle,
  Stethoscope,
  Info,
} from 'lucide-react';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function DoctorPublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const doctorId = params.id as string;
  const { user } = useAuth();
  const { toast } = useToast();

  // Booking form state
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date(Date.now() + 24 * 3600 * 1000).toISOString().split('T')[0]
  );
  const [selectedSlotId, setSelectedSlotId] = useState<string>('s2');
  const [consultationType, setConsultationType] = useState<'IN_PERSON' | 'VIDEO'>('IN_PERSON');
  const [reasonForVisit, setReasonForVisit] = useState('');
  const [patientNotes, setPatientNotes] = useState('');

  // Available sample slots
  const slots = [
    { id: 's1', time: '09:30 AM', available: true },
    { id: 's2', time: '10:30 AM', available: true },
    { id: 's3', time: '11:30 AM', available: false },
    { id: 's4', time: '02:00 PM', available: true },
    { id: 's5', time: '03:30 PM', available: true },
    { id: 's6', time: '04:30 PM', available: true },
  ];

  // Fetch Doctor Profile
  const { data, isLoading, error } = useQuery({
    queryKey: ['doctor-profile', doctorId],
    queryFn: async () => {
      const res = await fetch(`/api/doctors/${doctorId}`);
      if (!res.ok) throw new Error('Doctor not found');
      return res.json();
    },
  });

  // Book Appointment Mutation
  const bookMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      const res = await fetch('/api/patient/me/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData),
      });
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Failed to book appointment');
      }
      return resData;
    },
    onSuccess: (resData) => {
      toast('Appointment Confirmed!', resData.message || 'Your appointment has been successfully scheduled.', 'success');
      router.push('/patient/appointments');
    },
    onError: (err: any) => {
      toast('Booking Failed', err.message, 'error');
    },
  });

  const handleBookAppointment = (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast('Sign In Required', 'Please sign in with a patient account to book an appointment.', 'error');
      router.push(`/login?redirect=/doctors/${doctorId}`);
      return;
    }

    if (user.role === 'DOCTOR') {
      toast('Account Restriction', 'Doctor accounts cannot book patient appointments. Please use a patient demo account.', 'info');
      return;
    }

    const slotObj = slots.find((s) => s.id === selectedSlotId);
    const chosenTime = slotObj ? slotObj.time : '10:30 AM';

    bookMutation.mutate({
      doctorId,
      date: selectedDate,
      startTime: chosenTime,
      endTime: chosenTime.replace('30', '00'), // approximate 30 min
      consultationType,
      reasonForVisit: reasonForVisit || 'Specialist Consultation',
      patientNotes: patientNotes || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-slate-200 rounded" />
        <div className="h-64 bg-slate-100 rounded-3xl border border-slate-200" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-96 bg-slate-100 rounded-3xl" />
          <div className="h-96 bg-slate-100 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (error || !data?.doctor) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="h-16 w-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Doctor Profile Not Found</h2>
        <p className="text-xs text-slate-500">
          The requested clinician profile could not be located or may have been unlisted.
        </p>
        <Link href="/doctors">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Doctor Directory
          </Button>
        </Link>
      </div>
    );
  }

  const doctor = data.doctor;
  const isAvailable = doctor.availabilityStatus === 'AVAILABLE';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Breadcrumb & Demo Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          href="/doctors"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-brand-600 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Find Doctors
        </Link>

        <Badge variant="busy" className="border-amber-300 bg-amber-50 text-amber-800 text-[11px] self-start sm:self-auto font-medium">
          Demonstration Clinician Profile
        </Badge>
      </div>

      {/* Main Profile Header Hero Card */}
      <Card className="p-6 sm:p-8 border-slate-200 shadow-sm bg-gradient-to-br from-white via-white to-slate-50/50">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="relative h-28 w-28 sm:h-32 sm:w-32 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border-2 border-brand-100 shadow-sm">
            <Image
              src={doctor.avatarUrl}
              alt={doctor.name}
              fill
              className="object-cover"
              priority
            />
          </div>

          <div className="space-y-3 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {doctor.name}
              </h1>
              {doctor.isVerified && (
                <Badge variant="verified" className="gap-1 text-xs">
                  <ShieldCheck className="h-4 w-4 text-blue-600" />
                  Verified Clinician
                </Badge>
              )}
            </div>

            <p className="text-base font-bold text-brand-600">
              {doctor.specialization} Specialist
            </p>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {doctor.qualification}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
              <div className="flex items-center gap-1 font-semibold text-slate-800 bg-amber-50/80 px-2.5 py-1 rounded-lg border border-amber-200/60">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span>{doctor.rating}</span>
                <span className="text-slate-400 font-normal">({doctor.reviewCount} verified reviews)</span>
              </div>

              {doctor.experience ? (
                <span className="text-slate-500 font-medium bg-slate-100 px-2.5 py-1 rounded-lg">
                  {doctor.experience} years clinical practice
                </span>
              ) : null}

              <span className="text-slate-500 font-medium bg-slate-100 px-2.5 py-1 rounded-lg">
                License: {doctor.licenseNumber}
              </span>
            </div>

            {/* Live Status Callout */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                <StatusIndicator status={doctor.availabilityStatus} />
                {doctor.statusNote && (
                  <span className="text-xs text-slate-600 italic">
                    &ldquo;{doctor.statusNote}&rdquo;
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Fee Card */}
          <div className="w-full md:w-auto bg-brand-50/60 border border-brand-100 p-4 rounded-2xl flex md:flex-col justify-between items-center md:items-end shrink-0 gap-2">
            <div>
              <p className="text-[11px] font-semibold text-brand-700 uppercase tracking-wider">Consultation Fee</p>
              <p className="text-2xl font-black text-brand-900">{formatCurrency(doctor.consultationFee)}</p>
            </div>
            <p className="text-[10px] text-brand-600">Per 30-min consultation</p>
          </div>
        </div>
      </Card>

      {/* Grid: Left (Details, Conditions, Hours) | Right (Interactive Booking Form) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Clinical Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Conditions Treated / Clinical Focus */}
          <Card className="p-6 border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Activity className="h-5 w-5 text-brand-600" />
              <h2 className="text-base font-bold text-slate-900">
                Specialized Conditions & Clinical Focus
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Dr. {doctor.name.replace('Dr. ', '')} accepts consultations for the following medical conditions and symptoms:
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {doctor.conditions && doctor.conditions.length > 0 ? (
                doctor.conditions.map((cond: string, idx: number) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-brand-50 text-brand-700 border border-brand-200"
                  >
                    {cond}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400">General consultation</span>
              )}
            </div>
          </Card>

          {/* Clinic & Location Details */}
          <Card className="p-6 border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Building2 className="h-5 w-5 text-brand-600" />
              <h2 className="text-base font-bold text-slate-900">Practice Location & Clinic</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Clinic Name</span>
                <p className="font-bold text-slate-800 text-sm">{doctor.clinicName}</p>
              </div>

              <div className="space-y-1 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Location</span>
                <p className="font-medium text-slate-700">{doctor.clinicAddress}, {doctor.city}</p>
              </div>

              <div className="space-y-1 bg-slate-50 p-3.5 rounded-xl border border-slate-100 sm:col-span-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Available Formats</span>
                <div className="flex items-center gap-4 pt-1">
                  <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                    <UserCheck className="h-4 w-4 text-emerald-600" />
                    In-Person Consultations
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                    <Video className="h-4 w-4 text-blue-600" />
                    Telehealth / Video Consultations
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Working Hours */}
          <Card className="p-6 border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Clock className="h-5 w-5 text-brand-600" />
              <h2 className="text-base font-bold text-slate-900">Weekly Operating Hours</h2>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {doctor.workingHours && doctor.workingHours.length > 0 ? (
                doctor.workingHours.map((wh: any) => (
                  <div key={wh.id} className="py-2.5 flex items-center justify-between">
                    <span className="font-bold text-slate-700">{DAYS_OF_WEEK[wh.dayOfWeek]}</span>
                    <span className="text-slate-600">
                      {wh.startTime} – {wh.endTime}{' '}
                      {wh.breakStart && (
                        <span className="text-slate-400 ml-1">
                          (Break: {wh.breakStart} - {wh.breakEnd})
                        </span>
                      )}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-2 text-slate-500">
                  Monday to Friday: 09:00 AM – 05:00 PM (Regular Clinical Hours)
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Appointment Booking Panel */}
        <div className="space-y-6">
          <Card className="p-6 border-brand-200 shadow-md bg-white space-y-5 sticky top-24">
            <div className="border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-brand-600" />
                <h2 className="text-lg font-bold text-slate-900">Schedule Consultation</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Reserve an appointment with {doctor.name}
              </p>
            </div>

            <form onSubmit={handleBookAppointment} className="space-y-4 text-xs">
              {/* Consultation Type Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Consultation Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setConsultationType('IN_PERSON')}
                    className={`p-2.5 rounded-xl border text-center font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      consultationType === 'IN_PERSON'
                        ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-sm'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <UserCheck className="h-4 w-4" />
                    In-Person
                  </button>
                  <button
                    type="button"
                    onClick={() => setConsultationType('VIDEO')}
                    className={`p-2.5 rounded-xl border text-center font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      consultationType === 'VIDEO'
                        ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-sm'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Video className="h-4 w-4" />
                    Video Call
                  </button>
                </div>
              </div>

              {/* Consultation Date */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Select Date
                </label>
                <Input
                  type="date"
                  value={selectedDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  required
                />
              </div>

              {/* Available Time Slots */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Select Slot
                </label>
                <SlotPicker
                  slots={slots}
                  selectedSlotId={selectedSlotId}
                  onSelectSlot={setSelectedSlotId}
                />
              </div>

              {/* Reason for Visit */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Reason for Visit / Condition
                </label>
                <Input
                  placeholder="e.g. Blood sugar management, Asthma review..."
                  value={reasonForVisit}
                  onChange={(e) => setReasonForVisit(e.target.value)}
                  required
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Symptoms or Notes (Optional)
                </label>
                <textarea
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  rows={2}
                  placeholder="Provide context or recent symptoms..."
                  value={patientNotes}
                  onChange={(e) => setPatientNotes(e.target.value)}
                />
              </div>

              {/* Booking Button */}
              <Button
                type="submit"
                variant="default"
                isLoading={bookMutation.isPending}
                disabled={!isAvailable && doctor.availabilityStatus === 'UNAVAILABLE'}
                className="w-full gap-2 text-xs font-bold py-2.5 shadow-md"
              >
                <CheckCircle className="h-4 w-4" />
                Confirm & Schedule Appointment
              </Button>

              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 justify-center text-center">
                <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>Automatically links your medical chart with Dr. {doctor.name}</span>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
