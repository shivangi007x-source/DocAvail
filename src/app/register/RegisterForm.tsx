'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dropdown } from '@/components/ui/Dropdown';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { MEDICAL_SPECIALIZATIONS, CITIES, JK_ALL_DISTRICTS } from '@/lib/constants';
import { User, Stethoscope, Mail, Lock, Phone, MapPin, Building, Award, ShieldAlert, ArrowRight, Clock3, CheckCircle2 } from 'lucide-react';

interface SubmittedRegistration {
  name: string;
  email: string;
  role: 'PATIENT' | 'DOCTOR';
}

export default function RegisterForm() {
  const searchParams = useSearchParams();
  const initialRole = searchParams.get('role')?.toUpperCase() === 'DOCTOR' ? 'DOCTOR' : 'PATIENT';
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'PATIENT' | 'DOCTOR'>(initialRole);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<SubmittedRegistration | null>(null);

  // Common fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Patient fields
  const [phone, setPhone] = useState('');
  const [patientDistrict, setPatientDistrict] = useState<string>('Jammu');
  const [location, setLocation] = useState('');

  // Doctor fields
  const [specialization, setSpecialization] = useState<string>(MEDICAL_SPECIALIZATIONS[0]);
  const [qualification, setQualification] = useState('');
  const [experience, setExperience] = useState('5');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [consultationFee, setConsultationFee] = useState('500');
  const [clinicName, setClinicName] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [district, setDistrict] = useState<string>('Jammu');
  const [city, setCity] = useState<string>('Jammu');
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
      const formattedLocation = location.trim()
        ? `${location.trim()}${patientDistrict ? `, District ${patientDistrict}, Jammu and Kashmir, India` : ''}`
        : patientDistrict
        ? `District ${patientDistrict}, Jammu and Kashmir, India`
        : '';

      const res = await fetch('/api/auth/register/patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone, location: formattedLocation }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed.');
        setIsLoading(false);
        return;
      }

      toast('Registration Submitted', 'Your patient account is saved and awaiting administrator approval.', 'success');
      setSubmitted({
        name: data.user?.name || name,
        email: data.user?.email || email,
        role: 'PATIENT',
      });
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
          district,
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
        'Your healthcare provider profile has been submitted for admin approval.',
        'success'
      );
      setSubmitted({
        name: data.user?.name || name,
        email: data.user?.email || email,
        role: 'DOCTOR',
      });
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <Card className="border-amber-200 bg-white shadow-md">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
            <Clock3 className="h-7 w-7" />
          </div>
          <CardTitle className="text-lg text-slate-900">Account Submitted &amp; Pending Approval</CardTitle>
          <CardDescription className="text-xs text-slate-600">
            Thank you, <span className="font-semibold text-slate-900">{submitted.name}</span>. Your{' '}
            <span className="font-semibold text-slate-900">{submitted.role.toLowerCase()}</span> registration has been
            saved to DocAvail.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-4 w-4 text-amber-700 shrink-0" />
              <span>Current Status: PENDING ADMIN APPROVAL</span>
            </div>
            <p className="text-amber-800 leading-relaxed">
              Account email: <span className="font-mono font-semibold">{submitted.email}</span>
            </p>
            <p className="text-amber-800 leading-relaxed">
              Protected {submitted.role === 'DOCTOR' ? 'doctor' : 'patient'} portals remain restricted until a DocAvail
              administrator reviews and approves your account.
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
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              setSubmitted(null);
              setName('');
              setEmail('');
              setPassword('');
              setError(null);
            }}
          >
            Register Another Account
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <>
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
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  leftIcon={<Phone className="h-4 w-4" />}
                />
                <Dropdown
                  label="District (Jammu & Kashmir)"
                  options={JK_ALL_DISTRICTS.map((d) => ({ value: d, label: d }))}
                  value={patientDistrict}
                  onChange={(e) => setPatientDistrict(e.target.value)}
                />
              </div>
              <Input
                label="City / Town, Area & PIN Code"
                placeholder="e.g. Gandhi Nagar, Jammu 180004"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                leftIcon={<MapPin className="h-4 w-4" />}
              />
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
                  All clinician registrations require administrator review and approval. Portal access and public directory listing remain disabled until your account is approved.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Doctor Name (with title)"
                  placeholder="Dr. Farooq Ahmad, MD"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  leftIcon={<User className="h-4 w-4" />}
                />
                <Input
                  label="Official Email"
                  type="email"
                  placeholder="dr.ahmad@clinic.in"
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
                  placeholder="e.g. JK-MC-12345"
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
                  placeholder="MBBS, MD, DNB"
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
                  label="Consultation Fee (₹ INR)"
                  type="number"
                  min="0"
                  placeholder="e.g. 500"
                  value={consultationFee}
                  onChange={(e) => setConsultationFee(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Clinic or Hospital Name"
                  placeholder="e.g. Jammu Care Clinic"
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  required
                  leftIcon={<Building className="h-4 w-4" />}
                />
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

              <Input
                label="Clinic Address, Tehsil & PIN Code (Jammu & Kashmir, India)"
                placeholder="e.g. Bakshi Nagar, Jammu 180001, Jammu and Kashmir"
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
    </>
  );
}
