'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  User,
  Clock,
  Search,
  FileText,
  Pill,
  AlertTriangle,
  ShieldCheck,
  ArrowRight,
  Activity,
  HeartPulse,
} from 'lucide-react';
import Link from 'next/link';

export default function PatientDashboard() {
  const { user } = useAuth();

  // Load medical records summary
  const { data: medicalData, isLoading } = useQuery({
    queryKey: ['patient-medical-records'],
    queryFn: async () => {
      const res = await fetch('/api/patient/me/medical-records');
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 60 * 1000,
  });

  const recordsCount = medicalData?.records?.length || 0;
  const prescriptionsCount = medicalData?.prescriptions?.length || 0;
  const consultationsCount = medicalData?.consultations?.length || 0;
  const allergiesCount =
    medicalData?.records?.filter((r: any) => r.recordType === 'ALLERGY')?.length || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Patient Portal</h1>
            <Badge variant="brand">PATIENT</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Welcome back, <span className="font-semibold text-slate-800">{user?.name}</span>. Manage your medical records, appointments, and doctor access.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/patient/medical-history">
            <Button variant="outline" className="gap-2 shadow-sm text-xs">
              <FileText className="h-4 w-4 text-brand-600" />
              My Medical History
            </Button>
          </Link>
          <Link href="/doctors">
            <Button variant="default" className="gap-2 shadow-sm text-xs">
              <Search className="h-4 w-4" />
              Find Doctors
            </Button>
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 space-y-2 border-slate-200 hover:border-brand-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Medical Records
            </span>
            <FileText className="h-5 w-5 text-purple-600" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900">
            {isLoading ? '-' : recordsCount}
          </p>
          <p className="text-xs text-slate-400">Total diagnoses & notes</p>
        </Card>

        <Card className="p-6 space-y-2 border-slate-200 hover:border-brand-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Prescriptions
            </span>
            <Pill className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900">
            {isLoading ? '-' : prescriptionsCount}
          </p>
          <p className="text-xs text-slate-400">Prescribed medications</p>
        </Card>

        <Card className="p-6 space-y-2 border-slate-200 hover:border-brand-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Known Allergies
            </span>
            <AlertTriangle className="h-5 w-5 text-rose-600" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900">
            {isLoading ? '-' : allergiesCount}
          </p>
          <p className="text-xs text-slate-400">Safety alerts flagged</p>
        </Card>

        <Card className="p-6 space-y-2 border-slate-200 hover:border-brand-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Completed Visits
            </span>
            <Clock className="h-5 w-5 text-brand-600" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900">
            {isLoading ? '-' : consultationsCount}
          </p>
          <p className="text-xs text-slate-400">Past doctor consultations</p>
        </Card>
      </div>

      {/* Prominent Feature Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Medical History Card */}
        <Card className="p-6 border-slate-200 space-y-4 bg-gradient-to-br from-white via-white to-purple-50/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">My Medical History</h3>
              <p className="text-xs text-slate-500">View timeline, conditions, and manage doctor privacy</p>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Access your comprehensive medical history, view verified doctor diagnoses, check active prescriptions, review lab reports, and manage which doctors are authorized to see your health data.
          </p>

          <Link href="/patient/medical-history" className="block pt-2">
            <Button variant="default" className="w-full gap-2 text-xs shadow-sm">
              Open Medical History
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </Card>

        {/* Find Doctor by Condition Card */}
        <Card className="p-6 border-slate-200 space-y-4 bg-gradient-to-br from-white via-white to-brand-50/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center">
              <Search className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Find a Doctor by Disease</h3>
              <p className="text-xs text-slate-500">Discover verified specialists based on your symptoms</p>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Search doctors who specialize in diabetes, hypertension, asthma, migraine, skin allergies, and more. Check real-time operating availability before heading to the clinic.
          </p>

          <Link href="/doctors" className="block pt-2">
            <Button variant="outline" className="w-full gap-2 text-xs shadow-sm border-brand-200 text-brand-700 hover:bg-brand-50">
              Search by Condition
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}
