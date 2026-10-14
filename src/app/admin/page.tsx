'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ShieldCheck, Users, Stethoscope, AlertTriangle } from 'lucide-react';

export default function AdminPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Admin Portal</h1>
            <Badge variant="brand" className="bg-amber-100 text-amber-900 border-amber-300">
              SYSTEM ADMIN
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Logged in as <span className="font-semibold text-slate-800">{user?.name}</span> ({user?.email})
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 space-y-2 border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase">
            <span>Total Patients</span>
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900">2</p>
        </Card>

        <Card className="p-6 space-y-2 border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase">
            <span>Verified Doctors</span>
            <Stethoscope className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900">3</p>
        </Card>

        <Card className="p-6 space-y-2 border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase">
            <span>Pending Verifications</span>
            <ShieldCheck className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-3xl font-extrabold text-amber-600">1</p>
        </Card>

        <Card className="p-6 space-y-2 border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase">
            <span>Reported Accounts</span>
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900">0</p>
        </Card>
      </div>
    </div>
  );
}
