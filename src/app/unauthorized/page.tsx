import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full text-center space-y-6 bg-white p-8 rounded-2xl border border-slate-200 shadow-xl">
        <div className="h-16 w-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-slate-900">Access Restricted</h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            You do not have permission to access this portal with your current role. Please sign in with the appropriate account privileges.
          </p>
        </div>
        <div className="pt-2 flex flex-col gap-2">
          <Link href="/">
            <Button variant="default" className="w-full gap-2">
              <ArrowLeft className="h-4 w-4" />
              Return to Home
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" className="w-full">
              Switch Account / Sign In
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
