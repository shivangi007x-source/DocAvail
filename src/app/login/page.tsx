'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import {
  Activity,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Stethoscope,
  Sparkles,
  Users,
  CheckCircle,
} from 'lucide-react';

const DEMO_PATIENTS = [
  {
    name: 'Aanya Sharma',
    email: 'aanya.sharma@example.com',
    condition: 'Type 2 Diabetes',
    details: 'Elevated glucose, diet plan, Metformin Rx',
  },
  {
    name: 'Rohan Mehta',
    email: 'rohan.mehta@example.com',
    condition: 'Asthma',
    details: 'Wheezing history, inhalers, spirometry lab',
  },
  {
    name: 'Priya Verma',
    email: 'priya.verma@example.com',
    condition: 'PCOS',
    details: 'Irregular cycles, ultrasound report, inositol',
  },
  {
    name: 'Arjun Kapoor',
    email: 'arjun.kapoor@example.com',
    condition: 'Migraine',
    details: 'Throbbing headaches, MRI scan, triptans',
  },
  {
    name: 'Meera Singh',
    email: 'meera.singh@example.com',
    condition: 'Iron-Deficiency Anaemia',
    details: 'Low haemoglobin 9.2 g/dL, iron therapy',
  },
];

const DEMO_DOCTORS = [
  {
    name: 'Dr. Ananya Rao',
    email: 'dr.ananya.rao@docavail.com',
    specialty: 'Endocrinology',
    focus: 'Diabetes & Thyroid disorders',
  },
  {
    name: 'Dr. Rahul Khanna',
    email: 'dr.rahul.khanna@docavail.com',
    specialty: 'Pulmonology',
    focus: 'Asthma & Respiratory conditions',
  },
  {
    name: 'Dr. Neha Kapoor',
    email: 'dr.neha.kapoor@docavail.com',
    specialty: 'Obstetrics and Gynaecology',
    focus: 'PCOS & Menstrual disorders',
  },
  {
    name: 'Dr. Arjun Malhotra',
    email: 'dr.arjun.malhotra@docavail.com',
    specialty: 'Neurology',
    focus: 'Migraine & Headache disorders',
  },
  {
    name: 'Dr. Kavita Sharma',
    email: 'dr.kavita.sharma@docavail.com',
    specialty: 'Internal Medicine',
    focus: 'Anaemia & Common conditions',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect');
  const { setSession, refetchUser } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Demo Accounts Tab
  const [demoTab, setDemoTab] = useState<'PATIENTS' | 'DOCTORS' | 'ADMIN'>('PATIENTS');

  const executeLogin = async (userEmail: string, userPass: string) => {
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, password: userPass }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed. Please check your credentials.');
        setIsLoading(false);
        return;
      }

      toast('Welcome to DocAvail!', `Signed in as ${data.user.name}`, 'success');
      setSession(data.user);
      refetchUser();

      // Determine correct landing route
      if (redirectPath && redirectPath !== '/login' && redirectPath !== '/unauthorized') {
        const isPatientPath = redirectPath.startsWith('/patient');
        const isDoctorPath = redirectPath.startsWith('/doctor');

        if (data.user.role === 'PATIENT' && isDoctorPath) {
          router.push('/patient/dashboard');
        } else if (data.user.role === 'DOCTOR' && isPatientPath) {
          router.push('/doctor/dashboard');
        } else {
          router.push(redirectPath);
        }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    await executeLogin(email, password);
  };

  const handleInstantDemoLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
    await executeLogin(demoEmail, 'password123');
  };

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

        {/* EXPLORE DEMO ACCOUNTS PANEL */}
        <Card className="border-2 border-brand-200/90 shadow-md bg-gradient-to-br from-white to-brand-50/20 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-bold text-slate-900">Explore Demo Accounts</h2>
              <Badge variant="brand" className="text-[10px]">1-CLICK SIGN IN</Badge>
            </div>
            <span className="text-[11px] text-slate-500">Password for all: <code className="font-mono bg-slate-100 px-1 rounded text-slate-800">password123</code></span>
          </div>

          {/* Role Filter Tabs */}
          <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setDemoTab('PATIENTS')}
              className={`py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                demoTab === 'PATIENTS'
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              Patients (5)
            </button>
            <button
              type="button"
              onClick={() => setDemoTab('DOCTORS')}
              className={`py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                demoTab === 'DOCTORS'
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Stethoscope className="h-3.5 w-3.5" />
              Doctors (5)
            </button>
            <button
              type="button"
              onClick={() => setDemoTab('ADMIN')}
              className={`py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                demoTab === 'ADMIN'
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Admin
            </button>
          </div>

          {/* Demo List: Patients */}
          {demoTab === 'PATIENTS' && (
            <div className="space-y-2 pt-1">
              <p className="text-[11px] text-slate-500">
                Click any patient to test medical history, records, prescriptions, and search:
              </p>
              <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto pr-1">
                {DEMO_PATIENTS.map((p) => (
                  <div
                    key={p.email}
                    className="py-2 flex items-center justify-between gap-2 hover:bg-white/80 p-1.5 rounded-lg transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{p.name}</span>
                        <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.2 rounded border border-purple-200">
                          {p.condition}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{p.details}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleInstantDemoLogin(p.email)}
                      disabled={isLoading}
                      className="text-[11px] shrink-0 h-7 px-2.5 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-300 font-semibold"
                    >
                      Instant Sign In
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Demo List: Doctors */}
          {demoTab === 'DOCTORS' && (
            <div className="space-y-2 pt-1">
              <p className="text-[11px] text-slate-500">
                Click any doctor to test status toggling, schedule hours, and authorized patient charts:
              </p>
              <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto pr-1">
                {DEMO_DOCTORS.map((d) => (
                  <div
                    key={d.email}
                    className="py-2 flex items-center justify-between gap-2 hover:bg-white/80 p-1.5 rounded-lg transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{d.name}</span>
                        <span className="text-[10px] font-semibold text-brand-700 bg-brand-50 px-2 py-0.2 rounded border border-brand-200">
                          {d.specialty}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">Focus: {d.focus}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleInstantDemoLogin(d.email)}
                      disabled={isLoading}
                      className="text-[11px] shrink-0 h-7 px-2.5 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-300 font-semibold"
                    >
                      Instant Sign In
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Demo List: Admin */}
          {demoTab === 'ADMIN' && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
              <div>
                <p className="font-bold text-xs text-slate-900">DocAvail System Admin</p>
                <p className="text-[11px] text-slate-500">Full system oversight, doctor verification, and audit review</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleInstantDemoLogin('admin@docavail.com')}
                disabled={isLoading}
                className="text-[11px] shrink-0 h-7 px-2.5 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 font-semibold"
              >
                Instant Sign In
              </Button>
            </div>
          )}
        </Card>

        {/* Global Error Banner */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {/* Standard Manual Credentials Login Card */}
        <Card className="border-slate-200 shadow-sm">
          <form onSubmit={handleSubmit}>
            <CardHeader className="space-y-1">
              <CardTitle className="text-base">Manual Account Login</CardTitle>
              <CardDescription className="text-xs">
                Enter your DocAvail credentials or custom registered account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                leftIcon={<Mail className="h-4 w-4" />}
              />
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                leftIcon={<Lock className="h-4 w-4" />}
              />
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button
                type="submit"
                variant="default"
                className="w-full gap-2 shadow-sm font-semibold"
                isLoading={isLoading}
              >
                Sign In to Dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
              <p className="text-center text-xs text-slate-500">
                Don&apos;t have an account?{' '}
                <Link href="/register" className="font-semibold text-brand-600 hover:text-brand-700 underline">
                  Create Account
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
