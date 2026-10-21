'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dropdown } from '@/components/ui/Dropdown';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { RecordType, MedicalRecordItem, PrescriptionItem } from '@/lib/types';
import {
  FileText,
  Plus,
  AlertTriangle,
  Pill,
  Activity,
  Calendar,
  Clock,
  ShieldCheck,
  ShieldAlert,
  User,
  Stethoscope,
  Trash2,
  FileCheck,
  Paperclip,
  CheckCircle2,
  ArrowRight,
  HeartPulse,
  Lock,
  Search,
} from 'lucide-react';

export default function PatientMedicalHistoryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'ALL' | 'DIAGNOSIS' | 'ALLERGY' | 'MEDICATION' | 'NOTE' | 'LAB' | 'ACCESS'>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State for Adding Medical Record
  const [formRecordType, setFormRecordType] = useState<RecordType>('DIAGNOSIS');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDiagnosedDate, setFormDiagnosedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [formSeverity, setFormSeverity] = useState<'MILD' | 'MODERATE' | 'SEVERE'>('MILD');
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'RESOLVED' | 'CHRONIC'>('ACTIVE');
  const [formFileUrl, setFormFileUrl] = useState('');

  // Fetch Patient Medical History & Records
  const { data, isLoading } = useQuery({
    queryKey: ['patient-medical-records'],
    queryFn: async () => {
      const res = await fetch('/api/patient/me/medical-records');
      if (!res.ok) throw new Error('Failed to load medical history');
      return res.json();
    },
  });

  // Fetch Doctor Access Grants
  const { data: accessData, refetch: refetchAccess } = useQuery({
    queryKey: ['patient-doctor-access'],
    queryFn: async () => {
      const res = await fetch('/api/patient/me/access');
      if (!res.ok) throw new Error('Failed to load doctor access list');
      return res.json();
    },
  });

  // Add Medical Record Mutation
  const addRecordMutation = useMutation({
    mutationFn: async (newRecordData: any) => {
      const res = await fetch('/api/patient/me/medical-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecordData),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to add record');
      return resData;
    },
    onSuccess: () => {
      toast('Record Added', 'Your medical record has been securely saved.', 'success');
      setIsAddModalOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['patient-medical-records'] });
    },
    onError: (err: any) => {
      toast('Failed to Add Record', err.message, 'error');
    },
  });

  // Delete Record Mutation
  const deleteRecordMutation = useMutation({
    mutationFn: async (recordId: string) => {
      const res = await fetch(`/api/patient/me/medical-records/${recordId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete record');
      return res.json();
    },
    onSuccess: () => {
      toast('Record Deleted', 'The medical entry has been removed.', 'success');
      queryClient.invalidateQueries({ queryKey: ['patient-medical-records'] });
    },
    onError: (err: any) => {
      toast('Delete Failed', err.message, 'error');
    },
  });

  // Doctor Access Grant/Revoke Mutation
  const updateAccessMutation = useMutation({
    mutationFn: async ({ doctorId, action }: { doctorId: string; action: 'GRANT' | 'REVOKE' }) => {
      const res = await fetch('/api/patient/me/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorId, action }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to update access');
      return resData;
    },
    onSuccess: (resData) => {
      toast('Privacy Permissions Updated', resData.message, 'success');
      refetchAccess();
    },
    onError: (err: any) => {
      toast('Update Failed', err.message, 'error');
    },
  });

  const resetForm = () => {
    setFormTitle('');
    setFormDescription('');
    setFormFileUrl('');
    setFormSeverity('MILD');
    setFormStatus('ACTIVE');
  };

  const handleSubmitNewRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formDescription) {
      toast('Missing Information', 'Please fill in both title and description.', 'error');
      return;
    }

    addRecordMutation.mutate({
      title: formTitle,
      recordType: formRecordType,
      description: formDescription,
      diagnosedDate: formDiagnosedDate,
      severity: formSeverity,
      status: formStatus,
      fileUrl: formFileUrl,
    });
  };

  const records: MedicalRecordItem[] = data?.records || [];
  const prescriptions: PrescriptionItem[] = data?.prescriptions || [];
  const consultations = data?.consultations || [];
  const profile = data?.profile;

  // Filter records based on active tab
  const filteredRecords = records.filter((r) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'DIAGNOSIS') return r.recordType === 'DIAGNOSIS';
    if (activeTab === 'ALLERGY') return r.recordType === 'ALLERGY';
    if (activeTab === 'MEDICATION') return r.recordType === 'MEDICATION';
    if (activeTab === 'NOTE') return r.recordType === 'CONSULTATION_NOTE';
    if (activeTab === 'LAB') return r.recordType === 'LAB_REPORT';
    return true;
  });

  const getRecordTypeBadge = (type: RecordType) => {
    switch (type) {
      case 'ALLERGY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertTriangle className="h-3 w-3 text-rose-600" />
            Allergy
          </span>
        );
      case 'DIAGNOSIS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <Activity className="h-3 w-3 text-purple-600" />
            Diagnosis
          </span>
        );
      case 'MEDICATION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Pill className="h-3 w-3 text-emerald-600" />
            Medication
          </span>
        );
      case 'CONSULTATION_NOTE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
            <Stethoscope className="h-3 w-3 text-sky-600" />
            Clinical Note
          </span>
        );
      case 'LAB_REPORT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <FileCheck className="h-3 w-3 text-blue-600" />
            Lab Document
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800">
            Medical Record
          </span>
        );
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Date not recorded';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              My Medical History
            </h1>
            <Badge variant="brand">CONFIDENTIAL</Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Your encrypted chronological medical records, prescriptions, allergies, and clinical notes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/doctors">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Search className="h-3.5 w-3.5 text-brand-600" />
              Find Specialists
            </Button>
          </Link>
          <Button
            variant="default"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="gap-1.5 text-xs shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Medical Entry
          </Button>
        </div>
      </div>

      {/* Patient Health Summary Card */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 border-slate-200 bg-white">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Blood Group
          </span>
          <p className="text-xl font-extrabold text-rose-600 mt-1">
            {profile?.bloodGroup || 'Not set'}
          </p>
          <p className="text-[10px] text-slate-400">Emergency ID</p>
        </Card>

        <Card className="p-4 border-slate-200 bg-white">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Known Allergies
          </span>
          <p className="text-xl font-extrabold text-amber-600 mt-1">
            {records.filter((r) => r.recordType === 'ALLERGY').length}
          </p>
          <p className="text-[10px] text-slate-400">Critical safety flags</p>
        </Card>

        <Card className="p-4 border-slate-200 bg-white">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Active Prescriptions
          </span>
          <p className="text-xl font-extrabold text-emerald-600 mt-1">
            {prescriptions.filter((p) => p.status === 'ACTIVE').length}
          </p>
          <p className="text-[10px] text-slate-400">Ongoing medications</p>
        </Card>

        <Card className="p-4 border-slate-200 bg-white">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Health Records
          </span>
          <p className="text-xl font-extrabold text-slate-900 mt-1">
            {records.length}
          </p>
          <p className="text-[10px] text-slate-400">Diagnoses, notes & labs</p>
        </Card>
      </div>

      {/* Navigation Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('ALL')}
          className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'ALL'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Timeline Records ({records.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('DIAGNOSIS')}
          className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'DIAGNOSIS'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Diagnoses ({records.filter((r) => r.recordType === 'DIAGNOSIS').length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ALLERGY')}
          className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'ALLERGY'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Allergies ({records.filter((r) => r.recordType === 'ALLERGY').length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('MEDICATION')}
          className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'MEDICATION'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Medications & Prescriptions ({records.filter((r) => r.recordType === 'MEDICATION').length + prescriptions.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('NOTE')}
          className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'NOTE'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Clinical Notes ({records.filter((r) => r.recordType === 'CONSULTATION_NOTE').length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('LAB')}
          className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'LAB'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Lab Reports & Files ({records.filter((r) => r.recordType === 'LAB_REPORT').length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ACCESS')}
          className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ml-auto ${
            activeTab === 'ACCESS'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
          }`}
        >
          <Lock className="inline-block h-3.5 w-3.5 mr-1 text-amber-400" />
          Doctor Access & Privacy ({accessData?.grants?.filter((g: any) => g.status === 'GRANTED').length || 0})
        </button>
      </div>

      {/* Tab: Doctor Access & Privacy */}
      {activeTab === 'ACCESS' && (
        <div className="space-y-6">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-brand-600" />
              Doctor Access & Consent Control
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Your medical history is private. Doctors can only view your records if you grant permission or have an active clinical relationship. You may revoke access at any time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accessData?.doctors?.map((doc: any) => (
              <Card key={doc.id} className="p-4 flex items-center justify-between border-slate-200">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-slate-900">{doc.name}</h4>
                    {doc.hasAccess ? (
                      <Badge variant="verified" className="text-[10px]">
                        ACCESS GRANTED
                      </Badge>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-400 px-2 py-0.5 rounded-full bg-slate-100">
                        NO ACCESS
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-brand-600 font-medium">{doc.specialization}</p>
                  <p className="text-[11px] text-slate-400">{doc.clinicName}</p>
                </div>

                <div>
                  {doc.hasAccess ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateAccessMutation.mutate({ doctorId: doc.id, action: 'REVOKE' })
                      }
                      className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                      disabled={updateAccessMutation.isPending}
                    >
                      Revoke Access
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() =>
                        updateAccessMutation.mutate({ doctorId: doc.id, action: 'GRANT' })
                      }
                      className="text-xs shadow-sm"
                      disabled={updateAccessMutation.isPending}
                    >
                      Grant Access
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Chronological Medical Records Content */}
      {activeTab !== 'ACCESS' && (
        <div className="space-y-6">
          {/* Active Prescriptions Sub-section if Viewing ALL or MEDICATION */}
          {(activeTab === 'ALL' || activeTab === 'MEDICATION') && prescriptions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Pill className="h-4 w-4 text-emerald-600" />
                  Prescriptions Written by Authorized Doctors
                </h3>
                <span className="text-xs text-slate-400">
                  {prescriptions.length} Active Rx
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {prescriptions.map((rx) => (
                  <Card key={rx.id} className="p-4 border-l-4 border-l-emerald-500 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{rx.medicationName}</h4>
                        <p className="text-xs font-semibold text-emerald-700 mt-0.5">
                          {rx.dosage} • {rx.frequency}
                        </p>
                      </div>
                      <Badge variant="available" className="text-[10px]">
                        {rx.status}
                      </Badge>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-lg text-xs space-y-1 text-slate-600">
                      <p>
                        <span className="font-semibold text-slate-700">Duration:</span> {rx.duration}
                      </p>
                      {rx.instructions && (
                        <p>
                          <span className="font-semibold text-slate-700">Instructions:</span> &ldquo;{rx.instructions}&rdquo;
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                      <span className="flex items-center gap-1">
                        <Stethoscope className="h-3.5 w-3.5 text-brand-600" />
                        {rx.doctorName} ({rx.doctorSpecialization})
                      </span>
                      <span>Prescribed: {formatDate(rx.prescribedDate)}</span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Past Consultation History Summary if viewing ALL */}
          {activeTab === 'ALL' && consultations.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-brand-600" />
                Previous Consultations
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {consultations.map((c: any) => (
                  <Card key={c.id} className="p-4 border-slate-200 space-y-2 bg-gradient-to-br from-white to-slate-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Stethoscope className="h-4 w-4 text-brand-600" />
                        <h4 className="font-bold text-sm text-slate-900">{c.doctorName}</h4>
                      </div>
                      <Badge variant="brand" className="text-[10px]">{c.status}</Badge>
                    </div>

                    <p className="text-xs text-slate-500 font-medium">
                      {c.doctorSpecialization} • {c.clinicName}
                    </p>

                    {c.reasonForVisit && (
                      <p className="text-xs text-slate-700 bg-white p-2 rounded-md border border-slate-100">
                        <span className="font-semibold text-slate-900">Reason:</span> {c.reasonForVisit}
                      </p>
                    )}

                    {c.doctorNotes && (
                      <p className="text-xs text-slate-600 italic">
                        &ldquo;{c.doctorNotes}&rdquo;
                      </p>
                    )}

                    <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-100 flex items-center justify-between">
                      <span>{formatDate(c.date)}</span>
                      <span>{c.startTime} - {c.endTime}</span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Timeline of Clinical Records */}
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-purple-600" />
              Medical Timeline & Records ({filteredRecords.length})
            </h3>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : filteredRecords.length > 0 ? (
              <div className="space-y-4">
                {filteredRecords.map((record) => (
                  <Card
                    key={record.id}
                    className="p-5 border-slate-200/90 hover:border-brand-300 transition-all shadow-sm space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getRecordTypeBadge(record.recordType)}
                        <h4 className="font-bold text-base text-slate-900 leading-tight">
                          {record.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2">
                        {record.severity && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              record.severity === 'SEVERE'
                                ? 'bg-rose-100 text-rose-800'
                                : record.severity === 'MODERATE'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {record.severity}
                          </span>
                        )}

                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-slate-300" />
                          {formatDate(record.diagnosedDate || record.createdAt)}
                        </span>

                        {record.addedByRole === 'PATIENT' && (
                          <button
                            type="button"
                            onClick={() => deleteRecordMutation.mutate(record.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors ml-2"
                            title="Delete personal record"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                      {record.description}
                    </p>

                    {record.fileUrl && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-brand-700 hover:bg-brand-50 transition-colors">
                        <Paperclip className="h-3.5 w-3.5 text-brand-600" />
                        <span>Attached Report: {record.fileUrl}</span>
                      </div>
                    )}

                    {/* Author Attribution Footer */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                      {record.doctorId && record.doctorName ? (
                        <span className="flex items-center gap-1 font-medium text-brand-800">
                          <Stethoscope className="h-3.5 w-3.5 text-brand-600" />
                          Recorded by: Dr. {record.doctorName} ({record.doctorSpecialization} • {record.doctorClinic})
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 font-medium text-slate-600">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          Self-Reported by Patient
                        </span>
                      )}

                      <span className="text-[10px]">
                        Last updated {formatDate(record.updatedAt || record.createdAt)}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              /* Empty state */
              <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300 p-8 space-y-4">
                <div className="h-14 w-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto shadow-inner">
                  <FileText className="h-7 w-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900">No Medical Records Added Yet</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  You haven&apos;t added any personal medical records in this category. You can record existing conditions, known allergies, current prescriptions, or health documents.
                </p>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setIsAddModalOpen(true)}
                  className="gap-1.5 text-xs shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Your First Record
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Add Personal Medical Entry */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Medical Information"
        size="lg"
      >
        <form onSubmit={handleSubmitNewRecord} className="space-y-4">
          <p className="text-xs text-slate-500">
            Record details about your medical condition, allergy, or medication. This information is securely linked to your account and visible only to authorized doctors.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Record Type
              </label>
              <Dropdown
                options={[
                  { value: 'DIAGNOSIS', label: 'Diagnosis / Chronic Condition' },
                  { value: 'ALLERGY', label: 'Allergy / Adverse Reaction' },
                  { value: 'MEDICATION', label: 'Current Medication' },
                  { value: 'CONSULTATION_NOTE', label: 'Medical Note / Symptom Log' },
                  { value: 'LAB_REPORT', label: 'Lab Report / Test Document' },
                  { value: 'OTHER', label: 'Other Health Information' },
                ]}
                value={formRecordType}
                onChange={(e) => setFormRecordType(e.target.value as RecordType)}
              />
            </div>

            <Input
              label="Title / Condition Name"
              placeholder="e.g. Type 2 Diabetes, Penicillin Allergy..."
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Date Diagnosed / Started"
              type="date"
              value={formDiagnosedDate}
              onChange={(e) => setFormDiagnosedDate(e.target.value)}
            />

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Severity
              </label>
              <Dropdown
                options={[
                  { value: 'MILD', label: 'Mild' },
                  { value: 'MODERATE', label: 'Moderate' },
                  { value: 'SEVERE', label: 'Severe' },
                ]}
                value={formSeverity}
                onChange={(e) => setFormSeverity(e.target.value as any)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Status
              </label>
              <Dropdown
                options={[
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'RESOLVED', label: 'Resolved' },
                  { value: 'CHRONIC', label: 'Chronic' },
                ]}
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as any)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Detailed Description & Notes
            </label>
            <textarea
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[90px]"
              placeholder="Describe symptoms, known triggers, dosage, or relevant clinical context..."
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              required
            />
          </div>

          <Input
            label="Document / Report Attachment Link (Optional)"
            placeholder="e.g. /docs/lab_metabolic_panel.pdf"
            value={formFileUrl}
            onChange={(e) => setFormFileUrl(e.target.value)}
            leftIcon={<Paperclip className="h-4 w-4 text-slate-400" />}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
              disabled={addRecordMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              isLoading={addRecordMutation.isPending}
              className="gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              Save Record
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
