'use client';

import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  KeyRound,
  Mail,
  Phone,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface VerificationStatusDto {
  email: string;
  emailMasked: string | null;
  emailVerifiedAt: string | null;
  isEmailVerified: boolean;
  phone: string | null;
  phoneMasked: string | null;
  phoneVerifiedAt: string | null;
  isPhoneVerified: boolean;
  isFullyVerified: boolean;
  verificationRequired: boolean;
  approvalStatus: string;
  emailCooldownSeconds: number;
  phoneCooldownSeconds: number;
  hasActiveOtp: boolean;
  activeOtpExpiresAt: string | null;
}

function formatVerifiedDate(iso?: string | null): string {
  if (!iso) return '';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(dt);
}

export const VerificationCard: React.FC = () => {
  const { user, refetchUser } = useAuth();
  const queryClient = useQueryClient();

  const [phoneInput, setPhoneInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [emailCooldown, setEmailCooldown] = useState(0);
  const [phoneCooldown, setPhoneCooldown] = useState(0);
  const [emailFeedback, setEmailFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [phoneFeedback, setPhoneFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data: status, isLoading } = useQuery<VerificationStatusDto>({
    queryKey: ['verification-status', user?.id || ''],
    queryFn: async () => {
      const res = await fetch('/api/verification/status', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load verification status');
      return res.json();
    },
    enabled: Boolean(user?.id),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  useEffect(() => {
    if (!status) return;
    setEmailCooldown(status.emailCooldownSeconds || 0);
    setPhoneCooldown(status.phoneCooldownSeconds || 0);
    if (status.phone && !phoneInput) {
      setPhoneInput(status.phone);
    }
  }, [status, phoneInput]);

  useEffect(() => {
    if (emailCooldown <= 0 && phoneCooldown <= 0) return;
    const timer = setInterval(() => {
      setEmailCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      setPhoneCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [emailCooldown, phoneCooldown]);

  const refreshVerificationState = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['verification-status'] }),
      queryClient.invalidateQueries({ queryKey: ['auth-me'] }),
      queryClient.invalidateQueries({ queryKey: ['patient-profile-data'] }),
      queryClient.invalidateQueries({ queryKey: ['doctor-profile-data'] }),
    ]);
    refetchUser();
  };

  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/verification/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) {
        if (typeof json.retryAfterSeconds === 'number') {
          setEmailCooldown(json.retryAfterSeconds);
        }
        throw new Error(json.error || 'Could not send verification email');
      }
      return json;
    },
    onSuccess: async (data) => {
      setEmailFeedback({ type: 'success', text: data.message });
      if (typeof data.cooldownSeconds === 'number') {
        setEmailCooldown(data.cooldownSeconds);
      }
      await refreshVerificationState();
    },
    onError: (err: Error) => {
      setEmailFeedback({ type: 'error', text: err.message });
    },
  });

  const sendOtpMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/verification/phone/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneInput.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (typeof json.retryAfterSeconds === 'number') {
          setPhoneCooldown(json.retryAfterSeconds);
        }
        throw new Error(json.error || 'Could not send OTP');
      }
      return json;
    },
    onSuccess: async (data) => {
      setPhoneFeedback({ type: 'success', text: data.message });
      if (data.phoneE164) {
        setPhoneInput(data.phoneE164);
      }
      if (typeof data.cooldownSeconds === 'number') {
        setPhoneCooldown(data.cooldownSeconds);
      }
      await refreshVerificationState();
    },
    onError: (err: Error) => {
      setPhoneFeedback({ type: 'error', text: err.message });
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async (e: React.FormEvent) => {
      e.preventDefault();
      const res = await fetch('/api/verification/phone/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          otp: otpInput.trim(),
          phone: phoneInput.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Invalid verification OTP');
      }
      return json;
    },
    onSuccess: async (data) => {
      setOtpInput('');
      setPhoneFeedback({ type: 'success', text: data.message });
      await refreshVerificationState();
    },
    onError: (err: Error) => {
      setPhoneFeedback({ type: 'error', text: err.message });
    },
  });

  if (!user) return null;

  return (
    <Card
      id="verification"
      data-testid="account-verification-card"
      className={`p-5 sm:p-6 shadow-sm space-y-5 ${
        status && !status.isFullyVerified && status.verificationRequired
          ? 'border-amber-300 bg-amber-50/20'
          : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-start gap-3">
          <div
            className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
              status?.isFullyVerified
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-bold text-base text-slate-900">
                Email &amp; Phone Verification
              </h2>
              {status?.isFullyVerified ? (
                <Badge variant="available" className="text-[11px]">
                  Fully Verified
                </Badge>
              ) : (
                <Badge variant="busy" className="text-[11px]">
                  {status?.verificationRequired ? 'Verification Required' : 'Optional (Legacy Account)'}
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {status?.isFullyVerified
                ? 'Both your email address and mobile phone number are verified.'
                : status?.verificationRequired
                ? 'Verify both your email address and mobile number to unlock appointment scheduling and clinical controls.'
                : 'Verify your contact details to strengthen account security and receive reliable reminders.'}
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-40 rounded-xl bg-slate-100 animate-pulse" />
          <div className="h-40 rounded-xl bg-slate-100 animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Email Verification Panel */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3.5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-brand-600" />
                  <h3 className="text-sm font-bold text-slate-900">Email Verification</h3>
                </div>
                <Badge
                  variant={status?.isEmailVerified ? 'available' : 'busy'}
                  className="text-[10px]"
                  data-testid="email-verification-status"
                >
                  {status?.isEmailVerified ? 'Verified' : 'Unverified'}
                </Badge>
              </div>

              <div className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
                <span className="font-mono text-slate-800 truncate">{status?.email || user.email}</span>
                {status?.isEmailVerified && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                )}
              </div>

              {status?.isEmailVerified ? (
                <p className="text-[11px] text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  Verified on {formatVerifiedDate(status.emailVerifiedAt)} (IST)
                </p>
              ) : (
                <p className="text-xs text-slate-500 leading-relaxed">
                  Click the button below to dispatch a single-use verification link (valid for 30 minutes) to your registered email.
                </p>
              )}

              {emailFeedback && (
                <div
                  role="alert"
                  className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                    emailFeedback.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-700'
                  }`}
                >
                  {emailFeedback.type === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  )}
                  <span>{emailFeedback.text}</span>
                </div>
              )}
            </div>

            {!status?.isEmailVerified && (
              <div className="pt-1 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  onClick={() => {
                    setEmailFeedback(null);
                    sendEmailMutation.mutate();
                  }}
                  isLoading={sendEmailMutation.isPending}
                  disabled={sendEmailMutation.isPending || emailCooldown > 0}
                  className="gap-1.5 text-xs"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {emailCooldown > 0
                    ? `Resend Email (${emailCooldown}s)`
                    : emailFeedback
                    ? 'Resend Verification Email'
                    : 'Verify Email'}
                </Button>
              </div>
            )}
          </div>

          {/* Phone OTP Verification Panel */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3.5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-brand-600" />
                  <h3 className="text-sm font-bold text-slate-900">Phone OTP Verification</h3>
                </div>
                <Badge
                  variant={status?.isPhoneVerified ? 'available' : 'busy'}
                  className="text-[10px]"
                  data-testid="phone-verification-status"
                >
                  {status?.isPhoneVerified ? 'Verified' : 'Unverified'}
                </Badge>
              </div>

              {status?.isPhoneVerified ? (
                <div className="space-y-2">
                  <div className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
                    <span className="font-mono text-slate-800">
                      {status.phoneMasked || status.phone}
                    </span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  </div>
                  <p className="text-[11px] text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    Verified on {formatVerifiedDate(status.phoneVerifiedAt)} (IST)
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
                    <div className="flex-1">
                      <Input
                        label="Mobile Number (+91 / E.164)"
                        type="tel"
                        placeholder="+91 9876543210"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setPhoneFeedback(null);
                        sendOtpMutation.mutate();
                      }}
                      isLoading={sendOtpMutation.isPending}
                      disabled={sendOtpMutation.isPending || phoneCooldown > 0 || !phoneInput.trim()}
                      className="h-10 shrink-0 gap-1.5 text-xs border-brand-200 text-brand-700 hover:bg-brand-50"
                    >
                      <Clock className="h-3.5 w-3.5" />
                      {phoneCooldown > 0
                        ? `Resend OTP (${phoneCooldown}s)`
                        : status?.hasActiveOtp
                        ? 'Resend OTP'
                        : 'Send OTP'}
                    </Button>
                  </div>

                  <form onSubmit={(e) => verifyOtpMutation.mutate(e)} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
                    <div className="flex-1">
                      <Input
                        label="6-Digit Verification Code (OTP)"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="Enter 6-digit OTP"
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        leftIcon={<KeyRound className="h-4 w-4" />}
                      />
                    </div>
                    <Button
                      type="submit"
                      size="sm"
                      variant="default"
                      isLoading={verifyOtpMutation.isPending}
                      disabled={verifyOtpMutation.isPending || otpInput.trim().length !== 6}
                      className="h-10 shrink-0 text-xs"
                    >
                      Verify OTP
                    </Button>
                  </form>
                </div>
              )}

              {phoneFeedback && (
                <div
                  role="alert"
                  className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                    phoneFeedback.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-700'
                  }`}
                >
                  {phoneFeedback.type === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  )}
                  <span>{phoneFeedback.text}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
