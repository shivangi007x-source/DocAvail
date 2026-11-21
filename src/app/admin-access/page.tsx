import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ShieldAlert, ShieldCheck, Lock, ArrowLeft, ArrowRight, Terminal } from 'lucide-react';

export default function AdminAccessPage() {
  return (
    <div className="min-h-[82vh] flex items-center justify-center px-4 py-12 bg-gradient-to-b from-slate-50 via-amber-50/20 to-slate-50">
      <Card className="max-w-lg w-full border-amber-200 shadow-xl bg-white">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-200">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <div className="flex justify-center">
            <Badge variant="busy" className="text-[11px]">
              RESTRICTED ACCESS
            </Badge>
          </div>
          <CardTitle className="text-2xl font-extrabold text-slate-900">
            Administrator Access Is Restricted
          </CardTitle>
          <CardDescription className="text-xs text-slate-600 leading-relaxed">
            Public self-registration for administrator accounts is permanently disabled to protect patient health data and healthcare facility records across Jammu &amp; Kashmir.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <p className="font-bold text-slate-900 flex items-center gap-2">
              <Lock className="h-4 w-4 text-brand-600 shrink-0" />
              <span>Already an Authorised Administrator?</span>
            </p>
            <p className="text-slate-600 leading-relaxed">
              Sign in through the secure login portal using your existing provisioned administrator credentials to manage registration approvals, clinician credentials, and facility records.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-950 space-y-2">
            <p className="font-bold flex items-center gap-2">
              <Terminal className="h-4 w-4 text-amber-700 shrink-0" />
              <span>Provisioning New Administrators</span>
            </p>
            <p className="text-[11px] leading-relaxed text-amber-900">
              New administrator accounts can only be provisioned by an authorised operator via secure server-side environment provisioning (<code className="font-mono bg-amber-100 px-1 rounded">scripts/provision_admin.ts</code>) or an existing administrator&apos;s controlled workflow.
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-3">
          <Link href="/login" className="w-full">
            <Button variant="default" className="w-full gap-2">
              <ShieldCheck className="h-4 w-4" />
              Administrator Sign In
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/get-started" className="w-full">
            <Button variant="outline" className="w-full gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Role Cards
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
