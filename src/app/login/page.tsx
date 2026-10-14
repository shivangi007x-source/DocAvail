'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { Activity, Lock, Mail, ArrowRight, ShieldCheck, UserCheck, Stethoscope } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect');
  const { refetchUser } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed. Please check your credentials.');
        setIsLoading(false);
        return;
      }

      toast('Welcome back!', `Logged in as ${data.user.name}`, 'success');
      refetchUser();

      if (redirectPath) {
        router.push(redirectPath);
      } else if (data.user.role === 'DOCTOR') {
        router.push('/doctor/dashboard');
      } else if (data.user.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/patient/dashboard');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
    setError(null);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-slate-50">
      <div className="max-w-md w-full space-y-6">
        
        {/* Header Icon */}
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-2xl bg-brand-600 flex items-center justify-center text-white mx-auto shadow-lg">
            <Activity className="h-7 w-7 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Sign In to DocAvail</h1>
          <p className="text-xs text-slate-500">Access real-time doctor availability and appointments</p>
        </div>

        <Card className="shadow-xl border-slate-200">
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle className="text-lg">Account Login</CardTitle>
              <CardDescription>Enter your registered email and password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                  {error}
                </div>
              )}

              <Input
                label="Email Address"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="h-4 w-4" />}
                required
              />

              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="h-4 w-4" />}
                required
              />
            </CardContent>

            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" variant="default" className="w-full gap-2 shadow-md" isLoading={isLoading}>
                Sign In
                <ArrowRight className="h-4 w-4" />
              </Button>

              <div className="text-center text-xs text-slate-500 pt-2">
                Don&apos;t have an account?{' '}
                <Link href="/register" className="font-semibold text-brand-600 hover:text-brand-700 underline">
                  Register as Patient or Doctor
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>

        {/* Quick Demo Login Credentials Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">
            ⚡ Demo Quick Fill Credentials (Password: password123)
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => fillDemoAccount('patient.alex@example.com')}
              className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left font-medium text-slate-800"
            >
              <UserCheck className="h-3.5 w-3.5 text-brand-600 shrink-0" />
              <div className="truncate">
                <p className="font-semibold truncate">Patient Alex</p>
                <p className="text-[10px] text-slate-400">patient.alex@...</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => fillDemoAccount('dr.jenkins@docavail.com')}
              className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left font-medium text-slate-800"
            >
              <Stethoscope className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <div className="truncate">
                <p className="font-semibold truncate">Dr. Jenkins (Approved)</p>
                <p className="text-[10px] text-slate-400">dr.jenkins@...</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => fillDemoAccount('dr.pending@docavail.com')}
              className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left font-medium text-slate-800"
            >
              <Stethoscope className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <div className="truncate">
                <p className="font-semibold truncate">Dr. Miller (Pending)</p>
                <p className="text-[10px] text-slate-400">dr.pending@...</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => fillDemoAccount('admin@docavail.com')}
              className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left font-medium text-slate-800"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <div className="truncate">
                <p className="font-semibold truncate">System Admin</p>
                <p className="text-[10px] text-slate-400">admin@...</p>
              </div>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
