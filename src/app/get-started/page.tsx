import React from 'react';
import Link from 'next/link';
import { RoleFlashcards } from '@/components/onboarding/RoleFlashcards';
import { Activity, ArrowLeft } from 'lucide-react';

export default function GetStartedPage() {
  return (
    <div className="min-h-[85vh] bg-gradient-to-b from-brand-50/60 via-slate-50 to-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-600 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Home
          </Link>
          <Link
            href="/login"
            className="text-xs font-semibold text-brand-700 hover:underline"
          >
            Already have an account? Sign In
          </Link>
        </div>

        <div className="text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center mx-auto shadow-lg">
            <Activity className="h-7 w-7 stroke-[2.5]" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Choose Your DocAvail Role
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
            Select how you want to use DocAvail across Jammu &amp; Kashmir. Swipe through the role cards or tap a role below to continue.
          </p>
        </div>

        <RoleFlashcards />
      </div>
    </div>
  );
}
