'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ArrowRight, CheckCircle2, Clock3, Mail, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type VerifyState = 'idle' | 'verifying' | 'success' | 'expired' | 'invalid';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const queryClient = useQueryClient();
  const { user, refetchUser } = useAuth();

  const attemptedTokenRef = useRef<string | null>(null);
  const [state, setState] = useState<VerifyState>(token ? 'verifying' : 'invalid');
  const [statusMessage, setStatusMessage] = useState(
    token
      ? 'Verifying your email link...'
      : 'No verification token was provided in this link.'
  );
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);

  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendFeedback, setResendFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  useEffect(() => {
    if (!token || attemptedTokenRef.current === token) return;
    attemptedTokenRef.current = token;

    let cancelled = false;
    (async () => {
      setState('verifying');
      try {
        const res = await fetch('/api/verification/email/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (cancelled) return;

        if (!res.ok) {
          setState(data.code === 'TOKEN_EXPIRED' ? 'expired' : 'invalid');
          setStatusMessage(data.error || 'Verification failed.');
          return;
        }

        setState('success');
        setVerifiedEmail(data.email || null);
        setStatusMessage(data.message || 'Your email address has been verified.');
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['auth-me'] }),
          queryClient.invalidateQueries({ queryKey: ['verification-status'] }),
        ]);
        refetchUser();
      } catch {
        if (!cancelled) {
          setState('invalid');
          setStatusMessage('Unable to verify your email link due to a network error.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, queryClient, refetchUser]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    setResendFeedback(null);
    setResendLoading(true);
    try {
      const targetEmail = (resendEmail || user?.email || '').trim();
      const res = await fetch('/api/verification/email/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targetEmail ? { email: targetEmail } : {}),
      });
      const data = await res.json();
      if (!res.ok) {
        setResendFeedback({ type: 'error', text: data.error || 'Failed to resend verification email.' });
      } else {
        setResendFeedback({ type: 'success', text: data.message });
      }
    } catch {
      setResendFeedback({ type: 'error', text: 'Failed to resend verification email.' });
    } finally {
      setResendLoading(false);
    }
  };

  const dashboardHref =
    user?.role === 'DOCTOR'
      ? '/doctor/dashboard'
      : user?.role === 'ADMIN'
      ? '/admin'
      : user?.role === 'PATIENT'
      ? '/patient/dashboard'
      : '/login';

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-slate-50">
      <Card className="max-w-lg w-full border-slate-200 shadow-md">
        <CardHeader className="text-center space-y-3">
          <div
            className={`mx-auto h-14 w-14 rounded-2xl flex items-center justify-center ${
              state === 'success'
                ? 'bg-emerald-100 text-emerald-700'
                : state === 'expired'
                ? 'bg-amber-100 text-amber-700'
                : state === 'verifying'
                ? 'bg-brand-100 text-brand-700'
                : 'bg-rose-100 text-rose-700'
            }`}
          >
            {state === 'success' ? (
              <CheckCircle2 className="h-7 w-7" />
            ) : state === 'expired' ? (
              <Clock3 className="h-7 w-7" />
            ) : state === 'verifying' ? (
              <RefreshCw className="h-7 w-7 animate-spin" />
            ) : (
              <AlertCircle className="h-7 w-7" />
            )}
          </div>
          <CardTitle className="text-xl text-slate-900">
            {state === 'verifying'
              ? 'Verifying Email Address'
              : state === 'success'
              ? 'Email Address Verified'
              : state === 'expired'
              ? 'Verification Link Expired'
              : 'Invalid or Used Verification Link'}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-slate-600">
            {statusMessage}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {state === 'success' && verifiedEmail && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 text-center">
              Confirmed email: <span className="font-mono font-semibold">{verifiedEmail}</span>
            </div>
          )}

          {(state === 'expired' || state === 'invalid') && (
            <form onSubmit={handleResend} className="space-y-3 pt-1">
              <p className="text-xs text-slate-600">
                Enter your registered email address below to request a fresh 30-minute verification link:
              </p>
              <Input
                label="Email Address"
                type="email"
                placeholder={user?.email || 'name@example.com'}
                value={resendEmail || user?.email || ''}
                onChange={(e) => setResendEmail(e.target.value)}
                required
                leftIcon={<Mail className="h-4 w-4" />}
              />
              <Button
                type="submit"
                variant="default"
                size="sm"
                isLoading={resendLoading}
                className="w-full gap-1.5 text-xs"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Resend Verification Email
              </Button>
              {resendFeedback && (
                <div
                  role="alert"
                  className={`p-3 rounded-lg border text-xs ${
                    resendFeedback.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-700'
                  }`}
                >
                  {resendFeedback.text}
                </div>
              )}
            </form>
          )}
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-3">
          <Link href={dashboardHref} className="w-full">
            <Button variant="default" className="w-full gap-2 text-xs">
              {user ? 'Go to Dashboard' : 'Continue to Sign In'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/" className="w-full">
            <Button variant="outline" className="w-full text-xs">
              Return Home
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center text-xs text-slate-500">
          Loading verification...
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
