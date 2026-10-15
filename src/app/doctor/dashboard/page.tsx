'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { AvailabilityStatus } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import {
  Stethoscope,
  ShieldAlert,
  ShieldCheck,
  Building2,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Clock3,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Sliders,
  DollarSign,
  UserCheck,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function DoctorDashboard() {
  const { user, refetchUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const profile = user?.doctorProfile;
  const isPending = profile?.verificationStatus === 'PENDING';

  // Availability State
  const [selectedStatus, setSelectedStatus] = useState<AvailabilityStatus>(
    (profile?.availabilityStatus as AvailabilityStatus) || 'AVAILABLE'
  );
  const [statusNote, setStatusNote] = useState<string>(profile?.statusNote || '');

  // Keep local status in sync if user profile loads
  useEffect(() => {
    if (profile?.availabilityStatus) {
      setSelectedStatus(profile.availabilityStatus as AvailabilityStatus);
    }
    if (profile?.statusNote !== undefined) {
      setStatusNote(profile.statusNote || '');
    }
  }, [profile?.availabilityStatus, profile?.statusNote]);

  // Fetch Working Hours Summary
  const { data: scheduleData } = useQuery({
    queryKey: ['doctor-schedule'],
    queryFn: async () => {
      const res = await fetch('/api/doctor/me/schedule');
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 60 * 1000,
  });

  // Mutation to update availability status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, note }: { status: AvailabilityStatus; note: string }) => {
      const res = await fetch('/api/doctor/me/availability', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          availabilityStatus: status,
          statusNote: note,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update status');
      }
      return data;
    },
    onSuccess: (data) => {
      toast('Availability Broadcasted', `Status updated to ${data.availabilityStatus}`, 'success');
      refetchUser();
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
    },
    onError: (err: any) => {
      toast('Update Failed', err.message || 'Could not update status', 'error');
    },
  });

  const handleStatusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateStatusMutation.mutate({
      status: selectedStatus,
      note: statusNote,
    });
  };

  const setPresetNote = (note: string) => {
    setStatusNote(note);
  };

  // Format relative timestamp
  const formatTimeAgo = (dateStr?: string | null) => {
    if (!dateStr) return 'Just now';
    const date = new Date(dateStr);
    const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSeconds < 60) return 'Just now';
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const activeDaysCount =
    scheduleData?.schedule?.filter((s: any) => s.isActive).length || 5;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Sub-Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Doctor Dashboard
            </h1>
            <Badge variant="brand">PORTAL</Badge>
            {isPending ? (
              <Badge variant="busy" className="gap-1">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                VERIFICATION PENDING
              </Badge>
            ) : (
              <Badge variant="verified" className="gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                VERIFIED
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Welcome, <span className="font-semibold text-slate-800">{user?.name}</span> •{' '}
            <span className="text-brand-700 font-medium">{profile?.specialization}</span> at{' '}
            <span className="text-slate-700">{profile?.clinicName}</span>
          </p>
        </div>

        {/* Action Tabs */}
        <div className="flex items-center gap-2">
          <Link href="/doctor/dashboard">
            <Button variant="default" size="sm" className="gap-1.5 text-xs">
              <Stethoscope className="h-3.5 w-3.5" />
              Overview
            </Button>
          </Link>
          <Link href="/doctor/schedule">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Clock3 className="h-3.5 w-3.5 text-brand-600" />
              Working Hours
            </Button>
          </Link>
        </div>
      </div>

      {/* Verification Warning Alert if Pending */}
      {isPending && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3 shadow-sm">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-amber-950">Credential Verification Pending</h4>
            <p className="leading-relaxed">
              Your profile is currently under review by system administrators. You can update your availability and weekly schedule now; your public badge will appear in patient searches once approved.
            </p>
          </div>
        </div>
      )}

      {/* SECTION 1: PROMINENT REAL-TIME AVAILABILITY CONTROLLER */}
      <Card className="border-2 border-brand-200/80 shadow-md bg-gradient-to-br from-white via-white to-brand-50/20 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">Live Availability Control Center</h2>
              <Badge variant="brand" className="text-[10px]">REAL-TIME BROADCAST</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Patients see your availability status instantly across the platform.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span>Last status update:</span>
            <span className="font-semibold text-slate-800">
              {formatTimeAgo(profile?.statusUpdatedAt)}
            </span>
          </div>
        </div>

        <form onSubmit={handleStatusSubmit} className="space-y-6">
          {/* Prominent 3-Way Status Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Your Current Operational Status:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* AVAILABLE BUTTON */}
              <button
                type="button"
                onClick={() => setSelectedStatus('AVAILABLE')}
                className={`flex flex-col items-start p-4 rounded-xl border-2 transition-all cursor-pointer text-left ${
                  selectedStatus === 'AVAILABLE'
                    ? 'border-emerald-500 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-200'
                    : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/20'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <span className="font-bold text-sm text-emerald-900">Available Now</span>
                  </div>
                  {selectedStatus === 'AVAILABLE' && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  )}
                </div>
                <p className="text-[11px] text-emerald-700 mt-2">
                  Ready for walk-in visits and real-time consultation requests.
                </p>
              </button>

              {/* BUSY BUTTON */}
              <button
                type="button"
                onClick={() => setSelectedStatus('BUSY')}
                className={`flex flex-col items-start p-4 rounded-xl border-2 transition-all cursor-pointer text-left ${
                  selectedStatus === 'BUSY'
                    ? 'border-amber-500 bg-amber-50/70 shadow-sm ring-2 ring-amber-200'
                    : 'border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/20'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-amber-500"></span>
                    <span className="font-bold text-sm text-amber-900">In Consultation / Busy</span>
                  </div>
                  {selectedStatus === 'BUSY' && (
                    <CheckCircle2 className="h-4 w-4 text-amber-600" />
                  )}
                </div>
                <p className="text-[11px] text-amber-700 mt-2">
                  Currently with a patient or in surgery. Next slot indicated in note.
                </p>
              </button>

              {/* UNAVAILABLE BUTTON */}
              <button
                type="button"
                onClick={() => setSelectedStatus('UNAVAILABLE')}
                className={`flex flex-col items-start p-4 rounded-xl border-2 transition-all cursor-pointer text-left ${
                  selectedStatus === 'UNAVAILABLE'
                    ? 'border-rose-500 bg-rose-50/70 shadow-sm ring-2 ring-rose-200'
                    : 'border-slate-200 bg-white hover:border-rose-300 hover:bg-rose-50/20'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-rose-500"></span>
                    <span className="font-bold text-sm text-rose-900">Unavailable / Off-Duty</span>
                  </div>
                  {selectedStatus === 'UNAVAILABLE' && (
                    <CheckCircle2 className="h-4 w-4 text-rose-600" />
                  )}
                </div>
                <p className="text-[11px] text-rose-700 mt-2">
                  Clinic closed, doctor on leave, or off-duty today.
                </p>
              </button>
            </div>
          </div>

          {/* Optional Status Context Note */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="statusNoteInput" className="block text-xs font-semibold text-slate-700">
                Optional Status Note for Patients (Max 150 characters):
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                {statusNote.length}/150
              </span>
            </div>
            <Input
              id="statusNoteInput"
              placeholder="e.g. In consultation until 2:30 PM, or Clinic open for walk-ins"
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value.slice(0, 150))}
            />

            {/* Quick Note Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-slate-400 font-medium mr-1">Quick presets:</span>
              <button
                type="button"
                onClick={() => setPresetNote('Accepting walk-ins & immediate slot requests')}
                className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md transition-colors"
              >
                Walk-ins open
              </button>
              <button
                type="button"
                onClick={() => setPresetNote('In patient consultation until 2:30 PM')}
                className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md transition-colors"
              >
                Busy until 2:30 PM
              </button>
              <button
                type="button"
                onClick={() => setPresetNote('In surgical procedure until 4:00 PM')}
                className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md transition-colors"
              >
                In surgery
              </button>
              <button
                type="button"
                onClick={() => setPresetNote('On lunch break. Resumes at 2:00 PM')}
                className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md transition-colors"
              >
                Lunch break
              </button>
              <button
                type="button"
                onClick={() => setStatusNote('')}
                className="text-[10px] text-rose-600 hover:underline px-1"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs">
              <StatusIndicator status={selectedStatus} />
              <span className="text-slate-500">will be broadcasted live.</span>
            </div>
            <Button
              type="submit"
              variant="default"
              isLoading={updateStatusMutation.isPending}
              className="gap-2 px-6 shadow-md"
            >
              <RefreshCw className={`h-4 w-4 ${updateStatusMutation.isPending ? 'animate-spin' : ''}`} />
              Broadcast Availability Update
            </Button>
          </div>
        </form>
      </Card>

      {/* SECTION 2: METRICS OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-5 space-y-2 border-slate-200">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Today&apos;s Appointments</span>
            <Calendar className="h-4 w-4 text-brand-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">0</p>
          <p className="text-xs text-slate-400">Scheduled consultations</p>
        </Card>

        <Card className="p-5 space-y-2 border-slate-200">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Pending Requests</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">0</p>
          <p className="text-xs text-slate-400">Awaiting your approval</p>
        </Card>

        <Card className="p-5 space-y-2 border-slate-200">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Consultation Fee</span>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">
            {formatCurrency(profile?.consultationFee || 0)}
          </p>
          <p className="text-xs text-slate-400">Per 30-min session</p>
        </Card>

        <Card className="p-5 space-y-2 border-slate-200">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Weekly Schedule</span>
            <Sliders className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{activeDaysCount} Days</p>
          <Link href="/doctor/schedule" className="text-xs text-brand-600 hover:underline flex items-center gap-1 font-semibold">
            Configure hours <ArrowRight className="h-3 w-3" />
          </Link>
        </Card>
      </div>

      {/* SECTION 3: WORKING HOURS SUMMARY & PROFILE COMPLETION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Working Hours Summary */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-brand-600" />
              Working Hours Summary
            </h3>
            <Link href="/doctor/schedule">
              <Button variant="outline" size="sm" className="text-xs gap-1">
                Manage Schedule
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          <Card className="p-5 border-slate-200 divide-y divide-slate-100">
            {scheduleData?.schedule ? (
              scheduleData.schedule.map((day: any) => {
                const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                return (
                  <div key={day.dayOfWeek} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 w-28">{dayNames[day.dayOfWeek]}</span>
                    {day.isActive ? (
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                          {day.startTime} – {day.endTime}
                        </span>
                        {day.breakStart && day.breakEnd && (
                          <span className="text-[11px] text-slate-400">
                            (Break: {day.breakStart} - {day.breakEnd})
                          </span>
                        )}
                        <Badge variant="available" className="text-[10px]">ACTIVE</Badge>
                      </div>
                    ) : (
                      <Badge variant="default" className="text-[10px] text-slate-400">OFF-DUTY</Badge>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">
                Loading schedule...
              </div>
            )}
          </Card>
        </div>

        {/* Profile Completion Indicator */}
        <div className="lg:col-span-5 space-y-4">
          <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-brand-600" />
            Profile Readiness Checklist
          </h3>

          <Card className="p-5 border-slate-200 space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-700">Profile Completion</span>
                <span className="text-brand-700 font-bold">100% Ready</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className="bg-brand-600 h-2 rounded-full w-full transition-all duration-500"></div>
              </div>
            </div>

            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2 text-slate-700">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Specialization & Qualifications defined</span>
              </li>
              <li className="flex items-center gap-2 text-slate-700">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Clinic location & address registered</span>
              </li>
              <li className="flex items-center gap-2 text-slate-700">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Weekly working hours configured</span>
              </li>
              <li className="flex items-center gap-2 text-slate-700">
                {isPending ? (
                  <>
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span className="text-amber-800 font-medium">License verification pending admin review</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Medical license verified by admin</span>
                  </>
                )}
              </li>
            </ul>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                <Building2 className="h-3.5 w-3.5 text-slate-500" />
                <span>{profile?.clinicName}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                <span>{profile?.clinicAddress}, {profile?.city}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* SECTION 4: UPCOMING APPOINTMENTS SECTION */}
      <div className="space-y-4">
        <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-brand-600" />
          Today&apos;s Upcoming Consultations
        </h3>

        <Card className="p-8 text-center border-slate-200 space-y-3">
          <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
            <Calendar className="h-6 w-6" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h4 className="font-bold text-slate-800 text-sm">No scheduled consultations today</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              When patients book appointments, they will appear here along with patient notes and consultation mode.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
