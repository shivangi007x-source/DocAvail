import React, { Suspense } from 'react';
import LoginForm from './LoginForm';
import { Card } from '@/components/ui/Card';
import { Activity } from 'lucide-react';

function LoginFallback() {
  return (
    <Card className="border-2 border-brand-200/90 shadow-md p-8 text-center space-y-3">
      <div className="h-8 w-8 mx-auto rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
      <p className="text-xs text-slate-500 font-medium">Loading sign-in options...</p>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-10 bg-slate-50">
      <div className="max-w-xl w-full space-y-6">
        {/* Header Icon */}
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-2xl bg-brand-600 flex items-center justify-center text-white mx-auto shadow-lg">
            <Activity className="h-7 w-7 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Sign In to DocAvail</h1>
          <p className="text-xs text-slate-500">Real-time doctor availability and patient medical history platform</p>
        </div>

        <Suspense fallback={<LoginFallback />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
