'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Stethoscope, ShieldAlert, ShieldCheck, Building2, MapPin, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const profile = user?.doctorProfile;

  const isPending = profile?.verificationStatus === 'PENDING';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Doctor Portal</h1>
            <Badge variant="brand">DOCTOR</Badge>
            {isPending ? (
              <Badge variant="busy" className="gap-1">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                VERIFICATION PENDING
              </Badge>
            ) : (
              <Badge variant="verified" className="gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                VERIFIED DOCTOR
              </Badge>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Welcome, <span className="font-semibold text-slate-800">{user?.name}</span>. Manage your clinic availability and patient consultations.
          </p>
        </div>
      </div>

      {/* Verification Warning Alert if Pending */}
      {isPending && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3 shadow-sm">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-amber-950">Profile Pending Verification</h4>
            <p className="leading-relaxed">
              Your profile is currently under review by system administrators. Once verified, your clinic details and live availability badge will appear in public patient searches.
            </p>
          </div>
        </div>
      )}

      {/* Doctor Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 space-y-2 border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase">
            <span>Specialization</span>
            <Stethoscope className="h-4 w-4 text-brand-600" />
          </div>
          <p className="text-lg font-bold text-slate-900">{profile?.specialization || 'General Practice'}</p>
          <p className="text-xs text-slate-400">{profile?.qualification || 'Medical Graduate'}</p>
        </Card>

        <Card className="p-6 space-y-2 border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase">
            <span>Clinic & Location</span>
            <Building2 className="h-4 w-4 text-brand-600" />
          </div>
          <p className="text-lg font-bold text-slate-900 truncate">{profile?.clinicName || 'Clinic'}</p>
          <div className="flex items-center gap-1 text-xs text-slate-500 truncate">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{profile?.clinicAddress}, {profile?.city}</span>
          </div>
        </Card>

        <Card className="p-6 space-y-2 border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase">
            <span>Consultation Fee</span>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">
            {formatCurrency(profile?.consultationFee || 0)}
          </p>
          <p className="text-xs text-slate-400">License: {profile?.licenseNumber}</p>
        </Card>
      </div>
    </div>
  );
}
