'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dropdown } from '@/components/ui/Dropdown';
import { useToast } from '@/components/ui/Toast';
import {
  Stethoscope,
  ShieldCheck,
  Building2,
  MapPin,
  DollarSign,
  Activity,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export default function DoctorProfilePage() {
  const { user, refetchUser } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [treatedConditions, setTreatedConditions] = useState('');
  const [consultationFee, setConsultationFee] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [city, setCity] = useState('');
  const [consultationType, setConsultationType] = useState('IN_PERSON');
  const [qualification, setQualification] = useState('');
  const [experience, setExperience] = useState('0');

  const { data, isLoading } = useQuery({
    queryKey: ['doctor-profile-data'],
    queryFn: async () => {
      const res = await fetch('/api/doctor/me/profile');
      if (!res.ok) throw new Error('Failed to load profile');
      return res.json();
    },
  });

  useEffect(() => {
    if (data?.profile) {
      const p = data.profile;
      setName(p.user?.name || user?.name || '');
      setTreatedConditions(p.treatedConditions || '');
      setConsultationFee(String(p.consultationFee ?? 0));
      setClinicName(p.clinicName || '');
      setClinicAddress(p.clinicAddress || '');
      setCity(p.city || '');
      setConsultationType(p.consultationType || 'IN_PERSON');
      setQualification(p.qualification || '');
      setExperience(String(p.experience ?? 0));
    } else if (user?.doctorProfile) {
      const p = user.doctorProfile;
      setName(user.name || '');
      setTreatedConditions(p.treatedConditions || '');
      setConsultationFee(String(p.consultationFee ?? 0));
      setClinicName(p.clinicName || '');
      setClinicAddress(p.clinicAddress || '');
      setCity(p.city || '');
      setConsultationType(p.consultationType || 'IN_PERSON');
      setQualification(p.qualification || '');
      setExperience(String(p.experience ?? 0));
    }
  }, [data, user]);

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/doctor/me/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to update profile');
      return resData;
    },
    onSuccess: () => {
      toast('Profile Updated', 'Your doctor profile and treated conditions have been updated.', 'success');
      refetchUser();
    },
    onError: (err: any) => {
      toast('Update Failed', err.message, 'error');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      name,
      treatedConditions,
      consultationFee,
      clinicName,
      clinicAddress,
      city,
      consultationType,
      qualification,
      experience,
    });
  };

  const isVerified = user?.doctorProfile?.verificationStatus === 'APPROVED';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Doctor Profile & Clinical Credentials
            </h1>
            {isVerified ? (
              <Badge variant="verified" className="gap-1 text-[11px]">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                VERIFIED PHYSICIAN
              </Badge>
            ) : (
              <Badge variant="busy" className="text-[11px]">
                VERIFICATION PENDING
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure your declared conditions treated, consultation fees, clinic address, and qualifications.
          </p>
        </div>
      </div>

      <Card className="p-6 border-slate-200 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900">Physician Identity</h2>
            <p className="text-xs text-slate-500">Your public doctor credentials visible on search results.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Doctor Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Medical Specialty (Fixed)
              </label>
              <input
                type="text"
                disabled
                value={user?.doctorProfile?.specialization || 'General Medicine'}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold cursor-not-allowed"
              />
            </div>

            <Input
              label="Qualifications & Degrees"
              placeholder="e.g. MBBS, MD, FACC (Harvard)"
              value={qualification}
              onChange={(e) => setQualification(e.target.value)}
              required
            />

            <Input
              label="Years of Clinical Experience"
              type="number"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              required
            />
          </div>

          {/* CONDITIONS TREATED SECTION */}
          <div className="border-b border-slate-100 pb-4 pt-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-brand-600" />
              <h2 className="text-base font-bold text-slate-900">Conditions Treated & Clinical Focus Areas</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Patients search for doctors by disease. Comma-separated list of medical conditions you treat.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Treated Conditions (Comma-Separated)
            </label>
            <textarea
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[80px]"
              placeholder="e.g. Diabetes, Type 2 Diabetes, Hypertension, Heart Failure, Arrhythmia, High Cholesterol, Asthma, Migraine..."
              value={treatedConditions}
              onChange={(e) => setTreatedConditions(e.target.value)}
            />
            <p className="text-[11px] text-slate-400">
              Tip: Include specific diseases (e.g. &ldquo;Diabetes, Migraine, Skin Allergy&rdquo;) so your profile matches patient disease searches.
            </p>
          </div>

          {/* CLINIC & FEES SECTION */}
          <div className="border-b border-slate-100 pb-4 pt-2">
            <h2 className="text-base font-bold text-slate-900">Clinic Location & Consultation Settings</h2>
            <p className="text-xs text-slate-500">Practice address and fees displayed to patients.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Clinic / Hospital Name"
              placeholder="e.g. Apex Medical Center"
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              leftIcon={<Building2 className="h-4 w-4 text-slate-400" />}
              required
            />

            <Input
              label="City / Region"
              placeholder="e.g. New York, NY"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              leftIcon={<MapPin className="h-4 w-4 text-slate-400" />}
              required
            />

            <Input
              label="Clinic Street Address"
              placeholder="e.g. 450 Lexington Ave, Suite 300"
              value={clinicAddress}
              onChange={(e) => setClinicAddress(e.target.value)}
              required
            />

            <Input
              label="Standard Consultation Fee ($)"
              type="number"
              step="5"
              placeholder="100.00"
              value={consultationFee}
              onChange={(e) => setConsultationFee(e.target.value)}
              leftIcon={<DollarSign className="h-4 w-4 text-slate-400" />}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Consultation Mode
            </label>
            <Dropdown
              options={[
                { value: 'IN_PERSON', label: 'In-Person Only' },
                { value: 'VIDEO', label: 'Video / Virtual Only' },
                { value: 'BOTH', label: 'Both In-Person & Video' },
              ]}
              value={consultationType}
              onChange={(e) => setConsultationType(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end pt-4 border-t border-slate-200">
            <Button
              type="submit"
              variant="default"
              size="sm"
              isLoading={updateMutation.isPending}
              className="gap-1.5 shadow-sm"
            >
              <CheckCircle2 className="h-4 w-4" />
              Save Doctor Credentials
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
