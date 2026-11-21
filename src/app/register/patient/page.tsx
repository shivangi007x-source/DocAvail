import React, { Suspense } from 'react';
import RegisterForm from '../RegisterForm';
import { Card } from '@/components/ui/Card';
import { Activity } from 'lucide-react';

export default function PatientRegisterPage() {
  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-10 bg-slate-50">
      <div className="max-w-xl w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-2xl bg-brand-600 flex items-center justify-center text-white mx-auto shadow-lg">
            <Activity className="h-7 w-7 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Patient Onboarding — Jammu &amp; Kashmir
          </h1>
          <p className="text-xs text-slate-500">
            Create your private patient account and discover approved doctors &amp; facilities near you
          </p>
        </div>

        <Suspense
          fallback={
            <Card className="p-8 text-center text-xs text-slate-500">
              Loading patient registration...
            </Card>
          }
        >
          <RegisterForm forcedRole="PATIENT" />
        </Suspense>
      </div>
    </div>
  );
}
