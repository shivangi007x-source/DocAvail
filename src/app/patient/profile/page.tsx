'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dropdown } from '@/components/ui/Dropdown';
import { useToast } from '@/components/ui/Toast';
import { VerificationCard } from '@/components/verification/VerificationCard';
import { User, ShieldCheck, HeartPulse, CheckCircle2, Phone, MapPin, Calendar } from 'lucide-react';

export default function PatientProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, refetchUser } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');

  // Fetch current profile
  const { data, isLoading } = useQuery({
    queryKey: ['patient-profile-data'],
    queryFn: async () => {
      const res = await fetch('/api/patient/me/profile', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load profile');
      return res.json();
    },
    staleTime: 0,
    refetchOnMount: 'always',
  });

  useEffect(() => {
    if (data?.profile) {
      const p = data.profile;
      setName(p.name || user?.name || '');
      setPhone(p.phone || '');
      setLocation(p.location || '');
      setDateOfBirth(p.dateOfBirth || '');
      setGender(p.gender || '');
      setBloodGroup(p.bloodGroup || '');
    } else if (user) {
      setName(user.name || '');
      setPhone(user.patientProfile?.phone || '');
      setLocation(user.patientProfile?.location || '');
      setDateOfBirth(user.patientProfile?.dateOfBirth ? user.patientProfile.dateOfBirth.split('T')[0] : '');
      setGender(user.patientProfile?.gender || '');
      setBloodGroup(user.patientProfile?.bloodGroup || '');
    }
  }, [data, user]);

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/patient/me/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to update profile');
      return resData;
    },
    onSuccess: async (resData) => {
      if (resData?.profile) {
        queryClient.setQueryData(['patient-profile-data'], { profile: resData.profile });
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['patient-profile-data'] }),
        queryClient.invalidateQueries({ queryKey: ['patient-medical-records'] }),
        queryClient.invalidateQueries({ queryKey: ['patient-appointments'] }),
        queryClient.invalidateQueries({ queryKey: ['verification-status'] }),
        queryClient.invalidateQueries({ queryKey: ['auth-me'] }),
      ]);
      refetchUser();
      router.refresh();
      toast('Profile Updated', 'Your medical and personal information has been saved.', 'success');
    },
    onError: (err: any) => {
      toast('Update Failed', err.message, 'error');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      name,
      phone,
      location,
      dateOfBirth,
      gender,
      bloodGroup,
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            My Patient Profile & Medical Information
          </h1>
          <Badge variant="brand">PERSONAL</Badge>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Manage your personal details, blood group, emergency contact info, and permitted health parameters.
        </p>
      </div>

      <Card className="p-6 border-slate-200 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900">Personal Information</h2>
            <p className="text-xs text-slate-500">Details used for clinic appointments and verified medical charts.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Account Email
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
              />
            </div>

            <Input
              label="Phone Number"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              leftIcon={<Phone className="h-4 w-4 text-slate-400" />}
            />

            <Input
              label="District / City, PIN Code (Jammu & Kashmir, India)"
              placeholder="e.g. Rajbagh, Srinagar 190008, District Srinagar"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              leftIcon={<MapPin className="h-4 w-4 text-slate-400" />}
            />
          </div>

          <div className="border-b border-slate-100 pb-4 pt-2">
            <h2 className="text-base font-bold text-slate-900">Permitted Medical Demographics</h2>
            <p className="text-xs text-slate-500">These fields are shared with authorized doctors for clinical decision support.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Date of Birth"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Biological Gender
              </label>
              <Dropdown
                options={[
                  { value: '', label: 'Select Gender' },
                  { value: 'Male', label: 'Male' },
                  { value: 'Female', label: 'Female' },
                  { value: 'Other', label: 'Other' },
                ]}
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Blood Group
              </label>
              <Dropdown
                options={[
                  { value: '', label: 'Select Blood Group' },
                  { value: 'A+', label: 'A+' },
                  { value: 'A-', label: 'A-' },
                  { value: 'B+', label: 'B+' },
                  { value: 'B-', label: 'B-' },
                  { value: 'O+', label: 'O+' },
                  { value: 'O-', label: 'O-' },
                  { value: 'AB+', label: 'AB+' },
                  { value: 'AB-', label: 'AB-' },
                ]}
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
              />
            </div>
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
              Save Profile Changes
            </Button>
          </div>
        </form>
      </Card>

      <VerificationCard />
    </div>
  );
}
