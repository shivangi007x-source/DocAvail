'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  const { refetchUser } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'PATIENT' | 'DOCTOR'>('PATIENT');
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
      refetchUser();
      router.push('/doctor/dashboard');
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 bg-slate-50">
      <div className="max-w-2xl w-full space-y-6">
        
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-2xl bg-brand-600 flex items-center justify-center text-white mx-auto shadow-lg">
            <Activity className="h-7 w-7 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Create a DocAvail Account</h1>
          <p className="text-xs text-slate-500">Join as a Patient or Healthcare Provider</p>
        </div>

        {/* Account Role Selector Tabs */}
        <div className="flex bg-slate-200/80 p-1 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('PATIENT');
              setError(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'PATIENT' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="h-4 w-4 text-brand-600" />
            Patient Registration
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('DOCTOR');
              setError(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'DOCTOR' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Stethoscope className="h-4 w-4 text-brand-600" />
            Doctor / Provider Registration
          </button>
        </div>

        <Card className="shadow-xl border-slate-200">
          {activeTab === 'PATIENT' ? (
            <form onSubmit={handlePatientSubmit}>
              <CardHeader>
                <CardTitle className="text-lg">Patient Registration</CardTitle>
                <CardDescription>Book consultations and check doctor real-time availability</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                    {error}
                  </div>
                )}

                <Input
                  label="Full Name *"
                  placeholder="e.g. Alex Morgan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  leftIcon={<User className="h-4 w-4" />}
                  required
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Email Address *"
                    type="email"
                    placeholder="alex@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    leftIcon={<Mail className="h-4 w-4" />}
                    required
                  />

                  <Input
                    label="Password *"
                    type="password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    leftIcon={<Lock className="h-4 w-4" />}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Phone Number"
                    placeholder="+1 555-0192"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    leftIcon={<Phone className="h-4 w-4" />}
                  />

                  <Input
                    label="City / Location"
                    placeholder="New York, NY"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    leftIcon={<MapPin className="h-4 w-4" />}
                  />
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-3">
                <Button type="submit" variant="default" className="w-full gap-2 shadow-md" isLoading={isLoading}>
                  Create Patient Account
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <div className="text-center text-xs text-slate-500">
                  Already registered?{' '}
                  <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700 underline">
                    Sign In
                  </Link>
                </div>
              </CardFooter>
            </form>
          ) : (
            <form onSubmit={handleDoctorSubmit}>
              <CardHeader>
                <CardTitle className="text-lg">Healthcare Provider Registration</CardTitle>
                <CardDescription>Publish your clinic profile and manage live availability</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                    {error}
                  </div>
                )}

                {/* Important Verification Notice */}
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Verification Notice: </span>
                    Newly registered doctor profiles are submitted as <span className="font-bold underline">PENDING</span> until approved by an administrator.
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Full Name & Title *"
                    placeholder="Dr. Sarah Jenkins"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    leftIcon={<Stethoscope className="h-4 w-4" />}
                    required
                  />

                  <Input
                    label="Email Address *"
                    type="email"
                    placeholder="dr.jenkins@clinic.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    leftIcon={<Mail className="h-4 w-4" />}
                    required
                  />

                  <Input
                    label="Password *"
                    type="password"
                    placeholder="At least 6 chars"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    leftIcon={<Lock className="h-4 w-4" />}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Dropdown
                    label="Medical Specialization *"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    options={MEDICAL_SPECIALIZATIONS.map((s) => ({ value: s, label: s }))}
                  />

                  <Input
                    label="Qualification *"
                    placeholder="MBBS, MD, FACC"
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    leftIcon={<Award className="h-4 w-4" />}
                    required
                  />

                  <Input
                    label="Experience (Years) *"
                    type="number"
                    min="0"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Medical License Number *"
                    placeholder="MD-NY-849201"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    required
                  />

                  <Input
                    label="Consultation Fee ($) *"
                    type="number"
                    min="0"
                    value={consultationFee}
                    onChange={(e) => setConsultationFee(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Clinic / Hospital Name *"
                    placeholder="Apex Heart Institute"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    leftIcon={<Building className="h-4 w-4" />}
                    required
                  />

                  <Input
                    label="Clinic Address *"
                    placeholder="450 Lexington Ave"
                    value={clinicAddress}
                    onChange={(e) => setClinicAddress(e.target.value)}
                    leftIcon={<MapPin className="h-4 w-4" />}
                    required
                  />

                  <Dropdown
                    label="City / Region *"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    options={CITIES.map((c) => ({ value: c, label: c }))}
                  />
                </div>

                <Dropdown
                  label="Consultation Mode *"
                  value={consultationType}
                  onChange={(e) => setConsultationType(e.target.value)}
                  options={[
                    { value: 'IN_PERSON', label: 'In-Person Clinic Visits' },
                    { value: 'VIDEO', label: 'Video Consultations Only' },
                    { value: 'BOTH', label: 'Both In-Person & Video' },
                  ]}
                />
              </CardContent>

              <CardFooter className="flex flex-col gap-3">
                <Button type="submit" variant="default" className="w-full gap-2 shadow-md" isLoading={isLoading}>
                  Submit Doctor Registration
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <div className="text-center text-xs text-slate-500">
                  Already registered?{' '}
                  <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700 underline">
                    Sign In
                  </Link>
                </div>
              </CardFooter>
            </form>
          )}
        </Card>

      </div>
    </div>
  );
}
