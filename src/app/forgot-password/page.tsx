import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { KeyRound, ShieldCheck, ArrowLeft, Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-slate-50">
      <Card className="max-w-md w-full border-slate-200 shadow-lg">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-100">
            <KeyRound className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-extrabold text-slate-900">
            Password Recovery
          </CardTitle>
          <CardDescription className="text-xs text-slate-600">
            Account security and credential recovery on DocAvail Jammu &amp; Kashmir
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-xs text-slate-600 leading-relaxed">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-brand-600 shrink-0" />
              <span>Verified Account Reset</span>
            </div>
            <p>
              To protect patient records and verified clinician credentials, automated unverified password resets are disabled. Please contact your DocAvail administrator with your registered email address to verify ownership and issue a reset.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span>
              Pending registration accounts must first be approved by an administrator before signing in.
            </span>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Link href="/login" className="w-full">
            <Button variant="default" className="w-full gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Sign In
            </Button>
          </Link>
          <Link href="/get-started" className="w-full">
            <Button variant="outline" className="w-full">
              New to DocAvail? Get Started
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
