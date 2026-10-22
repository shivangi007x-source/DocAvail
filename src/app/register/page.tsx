'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dropdown } from '@/components/ui/Dropdown';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { MEDICAL_SPECIALIZATIONS, CITIES } from '@/lib/constants';
import { Activity, User, Stethoscope, Mail, Lock, Phone, MapPin, Building, Award, ShieldAlert, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get('role')?.toUpperCase() === 'DOCTOR' ? 'DOCTOR' : 'PATIENT';
  const { setSession, refetchUser } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'PATIENT' | 'DOCTOR'>(initialRole);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Common fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Patient fields
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');

  // Doctor fields
  const [specialization, setSpecialization] = useState<string>(MEDICAL_SPECIALIZATIONS[0]);
  const [qualification, setQualification] = useState('');
  const [experience, setExperience] = useState('5');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [consultationFee, setConsultationFee] = useState('100');
  const [clinicName, setClinicName] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [city, setCity] = useState<string>(CITIES[0]);
  const [consultationType, setConsultationType] = useState('IN_PERSON');

  const handlePatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name || !email || !password) {
      setError('Name, email, and password are required.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register/patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone, location }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed.');
        setIsLoading(false);
        return;
      }

      toast('Welcome to DocAvail!', 'Your patient account has been created.', 'success');
      setSession(data.user);
      refetchUser();
      router.push('/patient/dashboard');
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDoctorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (
      !name ||
      !email ||
      !password ||
      !specialization ||
      !qualification ||
      !licenseNumber ||
      !clinicName ||
      !clinicAddress ||
      !city
    ) {
      setError('Please fill out all required doctor registration fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register/doctor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          specialization,
          qualification,
          experience: parseInt(experience) || 0,
          licenseNumber,
          consultationFee: parseFloat(consultationFee) || 0.0,
          clinicName,
          clinicAddress,
          city,
          consultationType,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Doctor registration failed.');
        setIsLoading(false);
        return;
      }

      toast(
        'Registration Submitted',
        'Your profile has been created and submitted for admin verification.',
        'success'
      );
      setSession(data.user);
      refetchUser();
      router.push('/doctor/dashboard');
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-10 bg-slate-50">
      <div className="max-w-xl w-full space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-2xl bg-brand-600 flex items-center justify-center text-white mx-auto shadow-lg">
            <Activity className="h-7 w-7 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Create your DocAvail Account</h1>
          <p className="text-xs text-slate-500">Join the real-time doctor availability and healthcare coordination platform</p>
        </div>

        {/* Role Toggle Tabs */}
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

        {/* Global Error Banner */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {/* PATIENT FORM */}
        {activeTab === 'PATIENT' ? (
          <Card className="border-slate-200 shadow-sm">
            <form onSubmit={handlePatientSubmit}>
              <CardHeader className="space-y-1">
                <CardTitle className="text-base">Register as Patient</CardTitle>
                <CardDescription className="text-xs">
                  Access real-time doctor availability, track clinic queues, and book instant slots.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Full Name"
                  placeholder="e.g. Sarah Jenkins"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  leftIcon={<User className="h-4 w-4" />}
                />
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="sarah@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  leftIcon={<Mail className="h-4 w-4" />}
                />
                <Input
                  label="Password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  leftIcon={<Lock className="h-4 w-4" />}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Phone Number (Optional)"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    leftIcon={<Phone className="h-4 w-4" />}
                  />
                  <Input
                    label="City / Location"
                    placeholder="e.g. New York, NY"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    leftIcon={<MapPin className="h-4 w-4" />}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button
                  type="submit"
                  variant="default"
                  className="w-full gap-2 shadow-sm font-semibold"
                  isLoading={isLoading}
                >
                  Create Patient Account
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <p className="text-center text-xs text-slate-500">
                  Already have an account?{' '}
                  <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700 underline">
                    Sign in here
                  </Link>
                </p>
              </CardFooter>
            </form>
          </Card>
        ) : (
          /* DOCTOR FORM */
          <Card className="border-slate-200 shadow-sm">
            <form onSubmit={handleDoctorSubmit}>
              <CardHeader className="space-y-1">
                <CardTitle className="text-base">Register as Healthcare Provider</CardTitle>
                <CardDescription className="text-xs">
                  Broadcast live clinic status (Available / Busy / Unavailable) and manage consultations.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p>
                    All clinician registrations are reviewed for license authenticity. You will be able to update your live availability immediately upon registration.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Doctor Name (with title)"
                    placeholder="Dr. Emily Thorne, MD"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    leftIcon={<User className="h-4 w-4" />}
                  />
                  <Input
                    label="Official Email"
                    type="email"
                    placeholder="dr.thorne@clinic.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    leftIcon={<Mail className="h-4 w-4" />}
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
                    label="Medical License Number"
                    placeholder="e.g. MD-NY-89304"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    required
                    leftIcon={<Award className="h-4 w-4" />}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Dropdown
                    label="Primary Specialization"
                    options={MEDICAL_SPECIALIZATIONS.map((s) => ({ value: s, label: s }))}
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                  />
                  <Input
                    label="Qualifications & Degrees"
                    placeholder="MBBS, MD, FACC"
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Years of Experience"
                    type="number"
                    min="0"
                    placeholder="e.g. 10"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    required
                  />
                  <Input
                    label="Consultation Fee ($)"
                    type="number"
                    min="0"
                    placeholder="e.g. 150"
                    value={consultationFee}
                    onChange={(e) => setConsultationFee(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Clinic or Hospital Name"
                    placeholder="Apex Health Center"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    required
                    leftIcon={<Building className="h-4 w-4" />}
                  />
                  <Dropdown
                    label="City"
                    options={CITIES.map((c) => ({ value: c, label: c }))}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>

                <Input
                  label="Clinic Street Address"
                  placeholder="Suite 400, 100 Main Street"
                  value={clinicAddress}
                  onChange={(e) => setClinicAddress(e.target.value)}
                  required
                  leftIcon={<MapPin className="h-4 w-4" />}
                />

                <Dropdown
                  label="Consultation Formats Supported"
                  options={[
                    { value: 'IN_PERSON', label: 'In-Person Only' },
                    { value: 'VIDEO', label: 'Video Consultations Only' },
                    { value: 'BOTH', label: 'Both (In-Person & Video)' },
                  ]}
                  value={consultationType}
                  onChange={(e) => setConsultationType(e.target.value)}
                />
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button
                  type="submit"
                  variant="default"
                  className="w-full gap-2 shadow-sm font-semibold"
                  isLoading={isLoading}
                >
                  Register Clinician Profile
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <p className="text-center text-xs text-slate-500">
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
    </div>
  );
}
