'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Calendar,
  Clock,
  User,
  FolderOpen,
  ArrowRight,
  Stethoscope,
  Clock3,
  Users,
} from 'lucide-react';

export default function DoctorAppointmentsPage() {
  const [filter, setFilter] = useState<'ALL' | 'UPCOMING' | 'COMPLETED'>('ALL');

  const { data, isLoading } = useQuery({
    queryKey: ['doctor-appointments'],
    queryFn: async () => {
      const res = await fetch('/api/doctor/me/appointments');
      if (!res.ok) throw new Error('Failed to load appointments');
      return res.json();
    },
  });

  const appointments = data?.appointments || [];

  const filtered = appointments.filter((a: any) => {
    if (filter === 'ALL') return true;
    if (filter === 'COMPLETED') return a.status === 'COMPLETED';
    if (filter === 'UPCOMING') return a.status === 'CONFIRMED' || a.status === 'PENDING';
    return true;
  });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Patient Appointments & Consultations
            </h1>
            <Badge variant="brand">DOCTOR SCHEDULE</Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review booked patient slots, consultation notes, and jump directly into patient medical charts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/doctor/patients">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Users className="h-3.5 w-3.5 text-brand-600" />
              Patient Records
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

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setFilter('ALL')}
          className={`px-3.5 py-2 rounded-xl transition-all ${
            filter === 'ALL'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Appointments ({appointments.length})
        </button>

        <button
          type="button"
          onClick={() => setFilter('UPCOMING')}
          className={`px-3.5 py-2 rounded-xl transition-all ${
            filter === 'UPCOMING'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Upcoming / Pending ({appointments.filter((a: any) => a.status === 'CONFIRMED' || a.status === 'PENDING').length})
        </button>

        <button
          type="button"
          onClick={() => setFilter('COMPLETED')}
          className={`px-3.5 py-2 rounded-xl transition-all ${
            filter === 'COMPLETED'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Completed Consultations ({appointments.filter((a: any) => a.status === 'COMPLETED').length})
        </button>
      </div>

      {/* List / Loading / Empty */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-36 rounded-2xl bg-slate-100 animate-pulse border border-slate-200" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map((appt: any) => (
            <Card
              key={appt.id}
              className="p-5 border-slate-200 hover:border-brand-300 transition-all shadow-sm space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                    <User className="h-5 w-5 text-brand-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">{appt.patientName}</h3>
                    <p className="text-xs text-slate-400">{appt.patientEmail} • {appt.phone || 'No phone'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      appt.status === 'COMPLETED'
                        ? 'available'
                        : appt.status === 'CONFIRMED'
                        ? 'brand'
                        : 'busy'
                    }
                    className="text-xs font-bold"
                  >
                    {appt.status}
                  </Badge>

                  <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                    {appt.consultationType === 'VIDEO' ? 'Virtual Video' : 'In-Person Visit'}
                  </span>

                  {appt.patientProfileId && (
                    <Link href={`/doctor/patients/${appt.patientProfileId}`}>
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs text-brand-700 border-brand-200 hover:bg-brand-50">
                        <FolderOpen className="h-3.5 w-3.5" />
                        Open Chart
                      </Button>
                    </Link>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-brand-600 shrink-0" />
                  <span>{formatDate(appt.date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-brand-600 shrink-0" />
                  <span>{appt.startTime} - {appt.endTime}</span>
                </div>
              </div>

              {appt.reasonForVisit && (
                <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-slate-900 block">Patient&apos;s Chief Complaint / Reason:</span>
                  <p className="text-slate-700">{appt.reasonForVisit}</p>
                </div>
              )}

              {appt.doctorNotes && (
                <div className="bg-brand-50/60 border border-brand-100 p-3 rounded-xl text-xs space-y-1 text-brand-950 italic">
                  <span className="font-bold not-italic block text-brand-900">Your Clinical Notes:</span>
                  &ldquo;{appt.doctorNotes}&rdquo;
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300 p-8 space-y-4">
          <Calendar className="h-12 w-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">No Appointments Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            You don&apos;t have any scheduled appointments under this filter.
          </p>
        </div>
      )}
    </div>
  );
}
