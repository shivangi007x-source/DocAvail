import React from 'react';
import Link from 'next/link';
import { RoleFlashcards } from '@/components/onboarding/RoleFlashcards';
import { Activity, ArrowLeft } from 'lucide-react';

export default function GetStartedPage() {
  return (
    <div className="min-h-[85vh] bg-gradient-to-b from-brand-50/70 via-slate-50 to-slate-50 py-8 sm:py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            aria-label="Back to welcome screen"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm font-semibold text-slate-700 hover:text-brand-700 hover:border-brand-300 shadow-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <Link
            href="/login"
            className="text-xs sm:text-sm font-semibold text-brand-700 hover:underline"
          >
            Already have an account? Sign In
          </Link>
        </div>

        <div className="text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-brand-600/20">
            <Activity className="h-7 w-7 stroke-[2.5]" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Choose Your Role
          </h1>
          <p className="text-sm text-slate-600 max-w-lg mx-auto">
            Select how you want to use DocAvail across Jammu &amp; Kashmir.
          </p>
        </div>

        <RoleFlashcards />
      </div>
    </div>
  );
}
