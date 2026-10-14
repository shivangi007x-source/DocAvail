'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Calendar, User, Clock, Search } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function PatientDashboard() {
  const { user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Patient Portal</h1>
            <Badge variant="brand">PATIENT</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Welcome back, <span className="font-semibold text-slate-800">{user?.name}</span>. Manage your appointments and search live doctors.
          </p>
        </div>
        <Link href="/doctors">
          <Button variant="default" className="gap-2 shadow-sm">
            <Search className="h-4 w-4" />
            Find Doctors
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 space-y-2 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Upcoming Appointments</span>
            <Calendar className="h-5 w-5 text-brand-600" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900">0</p>
          <p className="text-xs text-slate-400">Scheduled consultations</p>
        </Card>

        <Card className="p-6 space-y-2 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed Visits</span>
            <Clock className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900">0</p>
          <p className="text-xs text-slate-400">Past medical records</p>
        </Card>

        <Card className="p-6 space-y-2 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Account Status</span>
            <User className="h-5 w-5 text-blue-600" />
          </div>
          <Badge variant="available" dot className="text-xs font-bold mt-1">
            Active Patient Profile
          </Badge>
          <p className="text-xs text-slate-400 pt-1">{user?.email}</p>
        </Card>
      </div>
    </div>
  );
}
