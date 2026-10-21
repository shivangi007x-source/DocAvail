'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Users,
  Search,
  FileText,
  Pill,
  AlertTriangle,
  Calendar,
  Clock,
  ArrowRight,
  ShieldCheck,
  Stethoscope,
  Clock3,
  UserCheck,
  FolderOpen,
} from 'lucide-react';

export default function DoctorPatientListPage() {
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch authorized patients list
  const { data, isLoading } = useQuery({
    queryKey: ['doctor-patients', searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      const res = await fetch(`/api/doctor/me/patients?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load patient records');
      return res.json();
    },
    staleTime: 30 * 1000,
  });

  const patients = data?.patients || [];

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'No visits yet';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const calculateAge = (dobStr?: string | null) => {
    if (!dobStr) return null;
    const diff = Date.now() - new Date(dobStr).getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Sub-Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Patient Records & Charts
            </h1>
            <Badge variant="brand">AUTHORIZED ACCESS</Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Access medical histories, record clinical consultation notes, and prescribe medications for authorized patients.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/doctor/dashboard">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Stethoscope className="h-3.5 w-3.5 text-brand-600" />
              Live Dashboard
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

      {/* Privacy Notice Alert */}
      <div className="p-4 rounded-2xl bg-brand-50/70 border border-brand-200 text-brand-900 text-xs flex items-start gap-3 shadow-sm">
        <ShieldCheck className="h-5 w-5 text-brand-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <h4 className="font-bold text-sm text-brand-950">Patient Privacy & Role Authorization Active</h4>
          <p className="leading-relaxed text-brand-800">
            You only see patients who have granted your account clinical access or have an established consultation relationship. All chart access is logged and audit-compliant.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
        <div className="relative flex-1">
          <Input
            placeholder="Search authorized patients by name, email, or phone number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4 text-slate-400" />}
            className="w-full"
          />
        </div>
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchQuery('')}
            className="text-xs text-slate-500"
          >
            Clear Search
          </Button>
        )}
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900">
          {isLoading
            ? 'Loading Patient Records...'
            : `${patients.length} Authorized Patient${patients.length === 1 ? '' : 's'}`}
        </h2>
        <span className="text-xs text-slate-400">
          Filtered by Doctor Consent Access
        </span>
      </div>

      {/* Patients Grid / Loading / Empty State */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-64 rounded-2xl bg-slate-100 animate-pulse border border-slate-200" />
          ))}
        </div>
      ) : patients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {patients.map((patient: any) => {
            const age = calculateAge(patient.dateOfBirth);

            return (
              <Card
                key={patient.id}
                className="overflow-hidden border border-slate-200 hover:border-brand-400 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="p-5 space-y-4">
                  {/* Card Header: Patient Name & Consent Badge */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="space-y-0.5">
                      <h3 className="font-bold text-base text-slate-900">{patient.name}</h3>
                      <p className="text-xs text-slate-400">{patient.email}</p>
                    </div>
                    <Badge variant="verified" className="text-[10px] gap-1 shrink-0">
                      <ShieldCheck className="h-3 w-3 text-blue-600" />
                      CONSENT
                    </Badge>
                  </div>

                  {/* Demographics Pill Bar */}
                  <div className="flex flex-wrap gap-2 text-[11px] text-slate-600">
                    {patient.bloodGroup && (
                      <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-bold border border-rose-100">
                        {patient.bloodGroup}
                      </span>
                    )}
                    {patient.gender && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                        {patient.gender}
                      </span>
                    )}
                    {age !== null && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                        {age} yrs old
                      </span>
                    )}
                    {patient.location && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium truncate max-w-[120px]">
                        {patient.location}
                      </span>
                    )}
                  </div>

                  {/* Clinical Stats Box */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl text-center">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Records
                      </span>
                      <span className="text-sm font-extrabold text-slate-900">
                        {patient.recordCount}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Active Rx
                      </span>
                      <span className="text-sm font-extrabold text-emerald-600">
                        {patient.prescriptionCount}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Allergies
                      </span>
                      <span className={`text-sm font-extrabold ${patient.allergyCount > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                        {patient.allergyCount}
                      </span>
                    </div>
                  </div>

                  {/* Last Visit Footer */}
                  <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-300" />
                      Last visit:
                    </span>
                    <span className="font-medium text-slate-700">
                      {formatDate(patient.lastVisit)}
                    </span>
                  </div>
                </div>

                {/* Open Chart CTA */}
                <div className="px-5 pb-5 pt-0">
                  <Link href={`/doctor/patients/${patient.id}`}>
                    <Button variant="default" size="sm" className="w-full gap-2 text-xs font-semibold shadow-sm">
                      <FolderOpen className="h-3.5 w-3.5" />
                      Open Clinical Chart
                      <ArrowRight className="h-3.5 w-3.5 ml-auto" />
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300 p-8 space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto shadow-inner">
            <Users className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Authorized Patients Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchQuery
              ? `No authorized patients matched "${searchQuery}". Check the spelling or clear the filter.`
              : 'You do not have any patient access grants yet. Once patients consult with you or grant access in their portal, their clinical charts will appear here.'}
          </p>
          {searchQuery && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchQuery('')}
              className="text-xs"
            >
              Clear Search Query
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
