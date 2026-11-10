import React, { Suspense } from 'react';
import RegisterForm from './RegisterForm';
import { Card } from '@/components/ui/Card';
import { Activity } from 'lucide-react';

function RegisterFallback() {
  return (
    <Card className="border-slate-200 shadow-sm p-8 text-center space-y-3">
      <div className="h-8 w-8 mx-auto rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
      <p className="text-xs text-slate-500 font-medium">Loading registration form...</p>
    </Card>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-10 bg-slate-50">
      <div className="max-w-xl w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-2xl bg-brand-600 flex items-center justify-center text-white mx-auto shadow-lg">
            <Activity className="h-7 w-7 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Create your DocAvail Account</h1>
          <p className="text-xs text-slate-500">Join the real-time doctor availability and healthcare coordination platform</p>
        </div>

        <Suspense fallback={<RegisterFallback />}>
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  );
}
