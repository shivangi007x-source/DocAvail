'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dropdown } from '@/components/ui/Dropdown';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { FacilitySummaryDTO } from '@/lib/types';
import { MEDICAL_SPECIALIZATIONS, CITIES, JK_ALL_DISTRICTS } from '@/lib/constants';
import {
  User,
  Stethoscope,
  Mail,
  Lock,
  Phone,
  MapPin,
  Building,
  Award,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  Clock3,
  CheckCircle2,
  Navigation,
  FileUp,
  Calendar,
  Sparkles,
} from 'lucide-react';

interface SubmittedDoctorRegistration {
  name: string;
  email: string;
  district: string;
  verificationDocName?: string | null;
}

interface RegisterFormProps {
  forcedRole?: 'PATIENT' | 'DOCTOR';
}

export default function RegisterForm({ forcedRole }: RegisterFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole =
    forcedRole ||
    (searchParams.get('role')?.toUpperCase() === 'DOCTOR' ? 'DOCTOR' : 'PATIENT');
  const { toast } = useToast();
  const { setSession, refetchUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'PATIENT' | 'DOCTOR'>(initialRole);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doctorSubmitted, setDoctorSubmitted] = useState<SubmittedDoctorRegistration | null>(null);

  // Patient Multi-Step State (Steps 1-3 + Step 4 /discover)
  const [patientStep, setPatientStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [patientDistrict, setPatientDistrict] = useState<string>('Jammu');
  const [patientCityTown, setPatientCityTown] = useState('');
  const [patientPincode, setPatientPincode] = useState('');
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  // Doctor Multi-Step State (Steps 1-3)
  const [doctorStep, setDoctorStep] = useState<1 | 2 | 3>(1);
  const [doctorPhone, setDoctorPhone] = useState('');
  const [specialization, setSpecialization] = useState<string>(MEDICAL_SPECIALIZATIONS[0]);
  const [qualification, setQualification] = useState('');
  const [experience, setExperience] = useState('5');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [consultationFee, setConsultationFee] = useState('500');
  const [clinicName, setClinicName] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [district, setDistrict] = useState<string>('Jammu');
  const [city, setCity] = useState<string>('Jammu');
  const [facilityId, setFacilityId] = useState<string>('');
  const [consultationType, setConsultationType] = useState('IN_PERSON');
  const [verificationFile, setVerificationFile] = useState<File | null>(null);

  // Load real J&K healthcare facilities for optional clinician affiliation
  const { data: facilitiesData } = useQuery<{ facilities: FacilitySummaryDTO[] }>({
    queryKey: ['register-facilities'],
    queryFn: async () => {
      const res = await fetch('/api/facilities?limit=50');
      if (!res.ok) return { facilities: [] };
      return res.json();
    },
    enabled: activeTab === 'DOCTOR',
    staleTime: 60 * 1000,
  });

  const jkFacilities = facilitiesData?.facilities || [];

  const handleRequestGeolocation = () => {
    setError(null);
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoLoading(false);
        toast('Location Captured', 'Your approximate location will personalize nearby healthcare results.', 'success');
      },
      () => {
        setGeoLoading(false);
        toast('Permission Declined', 'Continuing with your selected J&K district.', 'info');
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  };

  const handlePatientNextStep = () => {
    setError(null);
    if (patientStep === 1) {
      if (!name.trim() || !email.trim() || !phone.trim() || !password) {
        setError('Full name, email, phone number, and password are required.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Password and confirmation password do not match.');
        return;
      }
      setPatientStep(2);
      return;
    }
    if (patientStep === 2) {
      if (!patientDistrict || !patientCityTown.trim()) {
        setError('Please select a Jammu & Kashmir district and enter your city, town, or tehsil.');
        return;
      }
      if (patientPincode.trim() && !/^\d{6}$/.test(patientPincode.trim())) {
        setError('PIN code must be a valid 6-digit Indian postal code.');
        return;
      }
      setPatientStep(3);
    }
  };

  const handlePatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register/patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          dateOfBirth: dateOfBirth || undefined,
          password,
          confirmPassword,
          district: patientDistrict,
          cityTown: patientCityTown.trim(),
          pincode: patientPincode.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed.');
        setIsLoading(false);
        return;
      }

      if (data.user) {
        setSession(data.user);
        refetchUser();
        router.refresh();
      }

      toast(
        'Account Active!',
        'Your patient account is now active. Exploring nearby Jammu & Kashmir healthcare.',
        'success'
      );

      const nextParams = new URLSearchParams();
      nextParams.set('registered', '1');
      if (patientDistrict) nextParams.set('district', patientDistrict);
      if (geoCoords) {
        nextParams.set('lat', String(geoCoords.lat));
        nextParams.set('lng', String(geoCoords.lng));
      }
      router.push(`/discover?${nextParams.toString()}`);
    } catch {
      setError('An unexpected error occurred during registration.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDoctorNextStep = () => {
    setError(null);
    if (doctorStep === 1) {
      if (!name.trim() || !email.trim() || !doctorPhone.trim() || !password) {
        setError('Doctor name, email, phone number, and password are required.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Password and confirmation password do not match.');
        return;
      }
      setDoctorStep(2);
      return;
    }
    if (doctorStep === 2) {
      if (!specialization || !qualification.trim() || !licenseNumber.trim() || !clinicName.trim() || !clinicAddress.trim() || !city.trim()) {
        setError('Please complete all required medical credential and clinic location fields.');
        return;
      }
      setDoctorStep(3);
    }
  };

  const handleDoctorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (verificationFile && verificationFile.size > 2 * 1024 * 1024) {
      setError('Supporting verification document must be 2 MB or smaller.');
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('email', email.trim());
      formData.append('phone', doctorPhone.trim());
      formData.append('password', password);
      formData.append('confirmPassword', confirmPassword);
      formData.append('specialization', specialization);
      formData.append('qualification', qualification.trim());
      formData.append('experience', String(parseInt(experience, 10) || 0));
      formData.append('licenseNumber', licenseNumber.trim());
      formData.append('consultationFee', String(parseFloat(consultationFee) || 0));
      formData.append('clinicName', clinicName.trim());
      formData.append('clinicAddress', clinicAddress.trim());
      formData.append('district', district);
      formData.append('city', city.trim());
      formData.append('consultationType', consultationType);
      if (facilityId) {
        formData.append('facilityId', facilityId);
      }
      if (verificationFile) {
        formData.append('verificationDocument', verificationFile);
      }

      const res = await fetch('/api/auth/register/doctor', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Doctor registration failed.');
        setIsLoading(false);
        return;
      }

      toast(
        'Application Submitted',
        'Your healthcare provider profile has been saved for administrator approval.',
        'success'
      );
      setDoctorSubmitted({
        name: data.user?.name || name,
        email: data.user?.email || email,
        district,
        verificationDocName: data.user?.doctorProfile?.verificationDocName || verificationFile?.name || null,
      });
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  if (doctorSubmitted) {
    return (
      <Card className="border-amber-200 bg-white shadow-md">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
            <Clock3 className="h-7 w-7" />
          </div>
          <CardTitle className="text-lg text-slate-900">
            Doctor Application Submitted &amp; Pending Approval
          </CardTitle>
          <CardDescription className="text-xs text-slate-600">
            Thank you, <span className="font-semibold text-slate-900">{doctorSubmitted.name}</span>. Your doctor registration for District{' '}
            <span className="font-semibold text-slate-900">{doctorSubmitted.district}</span> has been recorded.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-4 w-4 text-amber-700 shrink-0" />
              <span>Current Status: PENDING ADMIN APPROVAL</span>
            </div>
            <p>
              Account email: <span className="font-mono font-semibold">{doctorSubmitted.email}</span>
            </p>
            {doctorSubmitted.verificationDocName && (
              <p>
                Uploaded verification document:{' '}
                <span className="font-semibold">{doctorSubmitted.verificationDocName}</span> (securely restricted to admin review)
              </p>
            )}
            <p className="leading-relaxed">
              Your doctor dashboard access and public homepage/directory visibility remain disabled until a DocAvail administrator approves your credentials. Once approved, you will appear publicly and on the homepage automatically.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-3">
          <Link href="/login" className="w-full">
            <Button variant="default" className="w-full gap-2">
              Go to Sign In
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/" className="w-full">
            <Button variant="outline" className="w-full">
              Return to Home
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Role Toggle Tabs (Patient / Doctor only — Admin registration strictly excluded) */}
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 p-1 bg-slate-200/80 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('PATIENT');
              setError(null);
            }}
            className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === 'PATIENT'
                ? 'bg-white text-brand-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="h-4 w-4" />
            Patient Account
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('DOCTOR');
              setError(null);
            }}
            className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === 'DOCTOR'
                ? 'bg-white text-brand-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Stethoscope className="h-4 w-4" />
            Healthcare Provider
          </button>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
          <Link href="/get-started" className="hover:text-brand-700 font-medium inline-flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-brand-500" />
            Browse Role Flashcards
          </Link>
          <Link href="/admin-access" className="hover:text-amber-700 font-medium">
            Administrator access?
          </Link>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2" role="alert">
          <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* GUIDED PATIENT MULTI-STEP FLOW */}
      {activeTab === 'PATIENT' ? (
        <Card className="border-slate-200 shadow-sm">
          <form onSubmit={handlePatientSubmit}>
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <span>Patient Onboarding · Step {patientStep} of 4</span>
                <span>Jammu &amp; Kashmir, India</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5" aria-label="Registration progress">
                {[1, 2, 3, 4].map((s) => (
                  <div
                    key={s}
                    className={`h-1.5 rounded-full transition-colors ${
                      s <= patientStep ? 'bg-brand-600' : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
              <div>
                <CardTitle className="text-base">
                  {patientStep === 1
                    ? 'Step 1 — Personal Information'
                    : patientStep === 2
                    ? 'Step 2 — Jammu & Kashmir Location'
                    : 'Step 3 — Confirm & Create Account'}
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {patientStep === 1
                    ? 'Enter your identity and account credentials.'
                    : patientStep === 2
                    ? 'Select your J&K district so Step 4 shows nearby doctors & healthcare facilities.'
                    : 'Review your details before submitting your registration for admin approval.'}
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {patientStep === 1 && (
                <>
                  <Input
                    label="Full Name"
                    placeholder="e.g. Aanya Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    leftIcon={<User className="h-4 w-4" />}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      label="Phone Number"
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      leftIcon={<Phone className="h-4 w-4" />}
                    />
                  </div>
                  <Input
                    label="Date of Birth (Optional)"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    leftIcon={<Calendar className="h-4 w-4" />}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Password"
                      type="password"
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      leftIcon={<Lock className="h-4 w-4" />}
                    />
                    <Input
                      label="Confirm Password"
                      type="password"
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      leftIcon={<Lock className="h-4 w-4" />}
                    />
                  </div>
                </>
              )}

              {patientStep === 2 && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Country</span>
                      <span className="font-bold text-slate-800">India</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Union Territory</span>
                      <span className="font-bold text-slate-800">Jammu and Kashmir</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Dropdown
                      label="District (All 20 J&K Districts)"
                      options={JK_ALL_DISTRICTS.map((d) => ({ value: d, label: d }))}
                      value={patientDistrict}
                      onChange={(e) => setPatientDistrict(e.target.value)}
                    />
                    <Input
                      label="PIN Code (Optional)"
                      placeholder="e.g. 180004"
                      maxLength={6}
                      value={patientPincode}
                      onChange={(e) => setPatientPincode(e.target.value)}
                    />
                  </div>

                  <Input
                    label="City / Town / Tehsil"
                    placeholder="e.g. Gandhi Nagar, Jammu or Karan Nagar, Srinagar"
                    value={patientCityTown}
                    onChange={(e) => setPatientCityTown(e.target.value)}
                    required
                    leftIcon={<MapPin className="h-4 w-4" />}
                  />

                  <div className="p-3.5 rounded-xl bg-brand-50/50 border border-brand-100 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          Optional Nearby Healthcare Discovery
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Grant browser location permission to calculate distance to mapped hospitals in Step 4.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant={geoCoords ? 'success' : 'outline'}
                        size="sm"
                        isLoading={geoLoading}
                        onClick={handleRequestGeolocation}
                        className="gap-1.5 text-xs"
                      >
                        <Navigation className="h-3.5 w-3.5" />
                        {geoCoords ? 'Location Ready' : 'Use My Location'}
                      </Button>
                    </div>
                    {geoCoords && (
                      <p className="text-[10px] font-mono text-emerald-700">
                        Captured coordinates: {geoCoords.lat.toFixed(4)}°N, {geoCoords.lng.toFixed(4)}°E
                      </p>
                    )}
                  </div>
                </>
              )}

              {patientStep === 3 && (
                <div className="space-y-3 text-xs">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <p className="font-bold text-slate-900">Registration Summary</p>
                    <p><span className="text-slate-500">Name:</span> <strong>{name}</strong></p>
                    <p><span className="text-slate-500">Email:</span> <strong>{email}</strong></p>
                    <p><span className="text-slate-500">Phone:</span> <strong>{phone}</strong></p>
                    <p>
                      <span className="text-slate-500">Location:</span>{' '}
                      <strong>
                        {patientCityTown}
                        {patientPincode ? `, PIN ${patientPincode}` : ''}, District {patientDistrict}, Jammu and Kashmir, India
                      </strong>
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px]">
                    Your patient account activates immediately upon registration — no admin approval needed. After creating your account, you can sign in anytime and explore approved doctors and verified facilities near District {patientDistrict}.
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3 w-full">
                {patientStep > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setError(null);
                      setPatientStep((s) => (s === 3 ? 2 : 1));
                    }}
                    className="gap-1.5"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                ) : (
                  <div />
                )}

                {patientStep < 3 ? (
                  <Button type="button" variant="default" onClick={handlePatientNextStep} className="gap-2 ml-auto">
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="submit" variant="default" isLoading={isLoading} className="gap-2 ml-auto">
                    Create Patient Account
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <p className="text-center text-xs text-slate-500 pt-1">
                Already have an account?{' '}
                <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700 underline">
                  Sign in here
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      ) : (
        /* GUIDED DOCTOR MULTI-STEP FLOW */
        <Card className="border-slate-200 shadow-sm">
          <form onSubmit={handleDoctorSubmit}>
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <span>Doctor Onboarding · Step {doctorStep} of 3</span>
                <span>Admin Review Required</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5" aria-label="Doctor registration progress">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={`h-1.5 rounded-full transition-colors ${
                      s <= doctorStep ? 'bg-brand-600' : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
              <div>
                <CardTitle className="text-base">
                  {doctorStep === 1
                    ? 'Step 1 — Clinician Identity & Contact'
                    : doctorStep === 2
                    ? 'Step 2 — Medical Credentials & J&K Affiliation'
                    : 'Step 3 — Supporting Documents & Submit'}
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {doctorStep === 1
                    ? 'Enter your name, official email, phone number, and password.'
                    : doctorStep === 2
                    ? 'Provide qualification, registration/licence number, district, and hospital or clinic details.'
                    : 'Optionally attach verification documents (PDF or image up to 2 MB) for administrator review.'}
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {doctorStep === 1 && (
                <>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                    <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p>
                      All clinician accounts are created with <strong className="font-semibold">PENDING</strong> status and remain hidden from public listings until approved by a DocAvail administrator.
                    </p>
                  </div>

                  <Input
                    label="Doctor Full Name (with title)"
                    placeholder="Dr. Farooq Ahmad, MD"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    leftIcon={<User className="h-4 w-4" />}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Official Email"
                      type="email"
                      placeholder="dr.ahmad@clinic.in"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      leftIcon={<Mail className="h-4 w-4" />}
                    />
                    <Input
                      label="Phone Number"
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={doctorPhone}
                      onChange={(e) => setDoctorPhone(e.target.value)}
                      required
                      leftIcon={<Phone className="h-4 w-4" />}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Password"
                      type="password"
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      leftIcon={<Lock className="h-4 w-4" />}
                    />
                    <Input
                      label="Confirm Password"
                      type="password"
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      leftIcon={<Lock className="h-4 w-4" />}
                    />
                  </div>
                </>
              )}

              {doctorStep === 2 && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Dropdown
                      label="Primary Specialization"
                      options={MEDICAL_SPECIALIZATIONS.map((s) => ({ value: s, label: s }))}
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                    />
                    <Input
                      label="Medical Qualifications"
                      placeholder="MBBS, MD, DNB"
                      value={qualification}
                      onChange={(e) => setQualification(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Input
                      label="Medical Licence Number"
                      placeholder="e.g. JK-MC-12345"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      required
                      leftIcon={<Award className="h-4 w-4" />}
                    />
                    <Input
                      label="Experience (Years)"
                      type="number"
                      min="0"
                      placeholder="e.g. 8"
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                    />
                    <Input
                      label="Consultation Fee (₹ INR)"
                      type="number"
                      min="0"
                      placeholder="e.g. 500"
                      value={consultationFee}
                      onChange={(e) => setConsultationFee(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Dropdown
                      label="J&K District"
                      options={JK_ALL_DISTRICTS.map((d) => ({ value: d, label: d }))}
                      value={district}
                      onChange={(e) => {
                        setDistrict(e.target.value);
                        setCity(e.target.value);
                      }}
                    />
                    <Dropdown
                      label="City / Town"
                      options={CITIES.map((c) => ({ value: c, label: c }))}
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>

                  <Dropdown
                    label="Affiliated J&K Healthcare Facility (Optional)"
                    options={[
                      { value: '', label: 'Independent Clinic / Not Listed Above' },
                      ...jkFacilities.map((f) => ({
                        value: f.id,
                        label: `${f.name} (${f.district})`,
                      })),
                    ]}
                    value={facilityId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFacilityId(val);
                      const matched = jkFacilities.find((f) => f.id === val);
                      if (matched) {
                        if (!clinicName) setClinicName(matched.name);
                        if (!clinicAddress) setClinicAddress(matched.address);
                        setDistrict(matched.district);
                        setCity(matched.city || matched.district);
                      }
                    }}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Clinic or Hospital Name"
                      placeholder="e.g. Jammu Care Clinic"
                      value={clinicName}
                      onChange={(e) => setClinicName(e.target.value)}
                      required
                      leftIcon={<Building className="h-4 w-4" />}
                    />
                    <Dropdown
                      label="Consultation Format"
                      options={[
                        { value: 'IN_PERSON', label: 'In-Person Only' },
                        { value: 'VIDEO', label: 'Video Consultations Only' },
                        { value: 'BOTH', label: 'Both (In-Person & Video)' },
                      ]}
                      value={consultationType}
                      onChange={(e) => setConsultationType(e.target.value)}
                    />
                  </div>

                  <Input
                    label="Clinic Address & PIN Code (Jammu & Kashmir, India)"
                    placeholder="e.g. Bakshi Nagar, Jammu 180001, Jammu and Kashmir"
                    value={clinicAddress}
                    onChange={(e) => setClinicAddress(e.target.value)}
                    required
                    leftIcon={<MapPin className="h-4 w-4" />}
                  />
                </>
              )}

              {doctorStep === 3 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 space-y-2.5">
                    <label
                      htmlFor="verification-doc-upload"
                      className="text-xs font-bold text-slate-800 flex items-center gap-2 cursor-pointer"
                    >
                      <FileUp className="h-4 w-4 text-brand-600" />
                      Supporting Verification Document (Optional · PDF / PNG / JPG, max 2 MB)
                    </label>
                    <input
                      id="verification-doc-upload"
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      onChange={(e) => setVerificationFile(e.target.files?.[0] || null)}
                      className="block w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-slate-300 file:text-xs file:font-semibold file:bg-white file:text-slate-700 hover:file:bg-slate-100"
                    />
                    <p className="text-[11px] text-slate-500">
                      Uploaded credentials (e.g. State Medical Council registration certificate) are stored securely and visible only to authorised administrators during approval review.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                    <p className="font-bold text-slate-900">Application Summary</p>
                    <p><span className="text-slate-500">Clinician:</span> <strong>{name}</strong> ({specialization})</p>
                    <p><span className="text-slate-500">Qualification &amp; Licence:</span> <strong>{qualification}</strong> · <code className="font-mono">{licenseNumber}</code></p>
                    <p><span className="text-slate-500">Practice:</span> <strong>{clinicName}</strong>, District {district}, Jammu and Kashmir</p>
                    <p><span className="text-slate-500">Fee:</span> <strong>₹{consultationFee || 0}</strong></p>
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3 w-full">
                {doctorStep > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setError(null);
                      setDoctorStep((s) => (s === 3 ? 2 : 1));
                    }}
                    className="gap-1.5"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                ) : (
                  <div />
                )}

                {doctorStep < 3 ? (
                  <Button type="button" variant="default" onClick={handleDoctorNextStep} className="gap-2 ml-auto">
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="submit" variant="default" isLoading={isLoading} className="gap-2 ml-auto">
                    Submit Doctor Application
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <p className="text-center text-xs text-slate-500 pt-1">
                Already registered?{' '}
                <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700 underline">
                  Sign in here
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      )}
    </div>
  );
}
