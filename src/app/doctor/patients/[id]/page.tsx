'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dropdown } from '@/components/ui/Dropdown';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { RecordType, MedicalRecordItem, PrescriptionItem } from '@/lib/types';
import {
  FolderOpen,
  ArrowLeft,
  Plus,
  Pill,
  Activity,
  AlertTriangle,
  Calendar,
  Clock,
  ShieldCheck,
  Stethoscope,
  FileCheck,
  CheckCircle2,
  Paperclip,
  User,
  AlertCircle,
  FileText,
} from 'lucide-react';

export default function DoctorPatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const patientProfileId = params.id as string;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'ALL' | 'DIAGNOSIS' | 'ALLERGY' | 'PRESCRIPTIONS' | 'CONSULTATIONS'>('ALL');

  // Modals
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isRxModalOpen, setIsRxModalOpen] = useState(false);

  // Note / Diagnosis Form State
  const [formRecordType, setFormRecordType] = useState<RecordType>('CONSULTATION_NOTE');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formSeverity, setFormSeverity] = useState<'MILD' | 'MODERATE' | 'SEVERE'>('MILD');
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'RESOLVED' | 'CHRONIC'>('ACTIVE');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);

  // Prescription Form State
  const [rxName, setRxName] = useState('');
  const [rxDosage, setRxDosage] = useState('');
  const [rxFrequency, setRxFrequency] = useState('');
  const [rxDuration, setRxDuration] = useState('');
  const [rxInstructions, setRxInstructions] = useState('');

  // Fetch Patient Chart & Medical History
  const { data, isLoading, error } = useQuery({
    queryKey: ['doctor-patient-chart', patientProfileId],
    queryFn: async () => {
      const res = await fetch(`/api/doctor/me/patients/${patientProfileId}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to access patient chart');
      }
      return res.json();
    },
    retry: false,
  });

  // Mutation: Add Clinical Record / Diagnosis
  const addRecordMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch(`/api/doctor/me/patients/${patientProfileId}/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to save clinical note');
      return resData;
    },
    onSuccess: () => {
      toast('Clinical Entry Saved', 'New consultation note has been added to the patient chart.', 'success');
      setIsNoteModalOpen(false);
      resetNoteForm();
      queryClient.invalidateQueries({ queryKey: ['doctor-patient-chart', patientProfileId] });
      queryClient.invalidateQueries({ queryKey: ['doctor-patients'] });
    },
    onError: (err: any) => {
      toast('Action Failed', err.message, 'error');
    },
  });

  // Mutation: Add Prescription
  const addRxMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch(`/api/doctor/me/patients/${patientProfileId}/prescriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to write prescription');
      return resData;
    },
    onSuccess: () => {
      toast('Prescription Recorded', 'Medication prescription has been recorded in the patient chart.', 'success');
      setIsRxModalOpen(false);
      resetRxForm();
      queryClient.invalidateQueries({ queryKey: ['doctor-patient-chart', patientProfileId] });
      queryClient.invalidateQueries({ queryKey: ['doctor-patients'] });
    },
    onError: (err: any) => {
      toast('Prescription Failed', err.message, 'error');
    },
  });

  const resetNoteForm = () => {
    setFormTitle('');
    setFormDescription('');
    setFormSeverity('MILD');
    setFormStatus('ACTIVE');
  };

  const resetRxForm = () => {
    setRxName('');
    setRxDosage('');
    setRxFrequency('');
    setRxDuration('');
    setRxInstructions('');
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formDescription) {
      toast('Missing Information', 'Please complete title and description.', 'error');
      return;
    }
    addRecordMutation.mutate({
      title: formTitle,
      recordType: formRecordType,
      description: formDescription,
      severity: formSeverity,
      status: formStatus,
      diagnosedDate: formDate,
    });
  };

  const handleSaveRx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rxName || !rxDosage || !rxFrequency || !rxDuration) {
      toast('Missing Fields', 'Please complete medication name, dosage, frequency, and duration.', 'error');
      return;
    }
    addRxMutation.mutate({
      medicationName: rxName,
      dosage: rxDosage,
      frequency: rxFrequency,
      duration: rxDuration,
      instructions: rxInstructions,
    });
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Date not specified';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const calculateAge = (dobStr?: string | null) => {
    if (!dobStr) return null;
    const diff = Date.now() - new Date(dobStr).getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

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
            Record
          </span>
        );
    }
  };

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="h-14 w-14 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto shadow-sm">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
        <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
          {(error as any).message || 'You do not have patient consent or authorized permission to view this medical chart.'}
        </p>
        <Link href="/doctor/patients">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Authorized Patients
          </Button>
        </Link>
      </div>
    );
  }

  const patient = data?.patient;
  const records: MedicalRecordItem[] = data?.records || [];
  const prescriptions: PrescriptionItem[] = data?.prescriptions || [];
  const consultations = data?.consultations || [];
  const allergies: MedicalRecordItem[] = data?.allergies || [];
  const age = calculateAge(patient?.dateOfBirth);

  const filteredRecords = records.filter((r) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'DIAGNOSIS') return r.recordType === 'DIAGNOSIS';
    if (activeTab === 'ALLERGY') return r.recordType === 'ALLERGY';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Breadcrumb & Back Link */}
      <div className="flex items-center justify-between">
        <Link
          href="/doctor/patients"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-brand-600 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Authorized Patients
        </Link>
        <span className="text-xs text-slate-400">
          Chart ID: {patientProfileId.slice(0, 8)}
        </span>
      </div>

      {/* Patient Demographic & Access Header Card */}
      <Card className="p-6 border-slate-200/90 shadow-sm space-y-4 bg-gradient-to-br from-white via-white to-slate-50/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {isLoading ? 'Loading patient chart...' : patient?.name}
              </h1>
              <Badge variant="verified" className="gap-1 text-[11px]">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                PATIENT CONSENT ACTIVE
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              {patient?.email} • {patient?.phone || 'No phone recorded'} • {patient?.location || 'No location'}
            </p>
          </div>

          {/* Clinical Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsNoteModalOpen(true)}
              className="gap-1.5 text-xs"
            >
              <Plus className="h-3.5 w-3.5 text-brand-600" />
              Add Clinical Note / Diagnosis
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsRxModalOpen(true)}
              className="gap-1.5 text-xs shadow-sm"
            >
              <Pill className="h-3.5 w-3.5" />
              Write Prescription
            </Button>
          </div>
        </div>

        {/* Patient Vitals & Demographics Bar */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg">
            <span className="text-slate-400 font-semibold">Blood Group:</span>
            <span className="font-extrabold text-rose-600">{patient?.bloodGroup || 'Unspecified'}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg">
            <span className="text-slate-400 font-semibold">Gender:</span>
            <span className="font-bold text-slate-800">{patient?.gender || 'Unspecified'}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg">
            <span className="text-slate-400 font-semibold">Age:</span>
            <span className="font-bold text-slate-800">{age !== null ? `${age} years old` : 'Unknown'}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg">
            <span className="text-slate-400 font-semibold">Consent Date:</span>
            <span className="font-medium text-slate-700">{formatDate(patient?.accessGrantedAt)}</span>
          </div>
        </div>
      </Card>

      {/* CRITICAL SAFETY ALERT: Known Allergies Banner */}
      {allergies.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-950 text-xs shadow-sm space-y-2">
          <div className="flex items-center gap-2 font-extrabold text-sm text-rose-800">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
            CRITICAL ALLERGY ALERT — PATIENT SAFETY WARNING
          </div>
          <div className="flex flex-wrap gap-2">
            {allergies.map((allergy) => (
              <div
                key={allergy.id}
                className="bg-white/90 border border-rose-200 rounded-lg p-2 text-rose-900 font-semibold shadow-xs"
              >
                <span className="font-bold">{allergy.title}:</span> {allergy.description}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
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
          Chronological Records ({records.length})
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
          Allergies ({allergies.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('PRESCRIPTIONS')}
          className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'PRESCRIPTIONS'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Prescriptions ({prescriptions.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('CONSULTATIONS')}
          className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'CONSULTATIONS'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Consultation History ({consultations.length})
        </button>
      </div>

      {/* Tab: Prescriptions */}
      {activeTab === 'PRESCRIPTIONS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Pill className="h-4 w-4 text-emerald-600" />
              Patient Prescriptions & Regimens
            </h3>
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsRxModalOpen(true)}
              className="gap-1.5 text-xs shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              Write Prescription
            </Button>
          </div>

          {prescriptions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {prescriptions.map((rx) => (
                <Card key={rx.id} className="p-4 border-l-4 border-l-emerald-500 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-base text-slate-900">{rx.medicationName}</h4>
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
                      <span className="font-semibold text-slate-700">Course Duration:</span> {rx.duration}
                    </p>
                    {rx.instructions && (
                      <p>
                        <span className="font-semibold text-slate-700">Directions:</span> &ldquo;{rx.instructions}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                    <span>Prescribing Physician: Dr. {rx.doctorName}</span>
                    <span>Prescribed: {formatDate(rx.prescribedDate)}</span>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300 p-6 space-y-2">
              <Pill className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500">No prescriptions written for this patient yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Previous Consultations */}
      {activeTab === 'CONSULTATIONS' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-brand-600" />
            Previous Clinic Consultations
          </h3>

          {consultations.length > 0 ? (
            <div className="space-y-3">
              {consultations.map((c: any) => (
                <Card key={c.id} className="p-4 border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-brand-600" />
                      Visit Date: {formatDate(c.date)} ({c.startTime} - {c.endTime})
                    </span>
                    <Badge variant="brand" className="text-[10px]">{c.status}</Badge>
                  </div>

                  {c.reasonForVisit && (
                    <p className="text-xs text-slate-700">
                      <span className="font-semibold text-slate-900">Chief Complaint / Reason:</span> {c.reasonForVisit}
                    </p>
                  )}

                  {c.doctorNotes && (
                    <div className="bg-slate-50 p-2.5 rounded-lg text-xs text-slate-700 italic border border-slate-100">
                      <span className="font-semibold not-italic text-slate-900 block mb-0.5">Clinical Consultation Note:</span>
                      &ldquo;{c.doctorNotes}&rdquo;
                    </div>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300 p-6 space-y-2">
              <Calendar className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500">No previous consultations recorded with this clinic.</p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Chronological Timeline Records (ALL, DIAGNOSIS, ALLERGY) */}
      {activeTab !== 'PRESCRIPTIONS' && activeTab !== 'CONSULTATIONS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-purple-600" />
              Chronological Patient Medical Records ({filteredRecords.length})
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsNoteModalOpen(true)}
              className="gap-1.5 text-xs"
            >
              <Plus className="h-3.5 w-3.5 text-brand-600" />
              Add Clinical Note / Diagnosis
            </Button>
          </div>

          {filteredRecords.length > 0 ? (
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
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                    {record.description}
                  </p>

                  {record.fileUrl && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-brand-700">
                      <Paperclip className="h-3.5 w-3.5 text-brand-600" />
                      <span>Report / Document: {record.fileUrl}</span>
                    </div>
                  )}

                  {/* Author Attribution Footer */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                    {record.doctorId && record.doctorName ? (
                      <span className="flex items-center gap-1 font-medium text-brand-800">
                        <Stethoscope className="h-3.5 w-3.5 text-brand-600" />
                        Author: Dr. {record.doctorName} ({record.doctorSpecialization || 'Physician'})
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 font-medium text-slate-600">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        Self-Reported by Patient
                      </span>
                    )}

                    <span>Saved {formatDate(record.createdAt)}</span>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300 p-6 space-y-2">
              <FileText className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500">No medical entries found in this view.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal: Add Clinical Note / Diagnosis */}
      <Modal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        title="Add Clinical Consultation Note or Diagnosis"
        size="lg"
      >
        <form onSubmit={handleSaveNote} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Entry Category
              </label>
              <Dropdown
                options={[
                  { value: 'CONSULTATION_NOTE', label: 'Consultation Note / Clinical Observation' },
                  { value: 'DIAGNOSIS', label: 'Official Diagnosis' },
                  { value: 'LAB_REPORT', label: 'Lab Findings' },
                ]}
                value={formRecordType}
                onChange={(e) => setFormRecordType(e.target.value as RecordType)}
              />
            </div>

            <Input
              label="Diagnosis / Clinical Title"
              placeholder="e.g. Essential Hypertension, Bronchitis..."
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Date"
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
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
                Condition Status
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
              Clinical Findings, Plan & Recommendations
            </label>
            <textarea
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[100px]"
              placeholder="Document physical exam findings, differential diagnosis, treatment instructions, and recommended follow-up..."
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsNoteModalOpen(false)}
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
              Save to Patient Chart
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Write Prescription */}
      <Modal
        isOpen={isRxModalOpen}
        onClose={() => setIsRxModalOpen(false)}
        title="Write Electronic Prescription"
        size="lg"
      >
        <form onSubmit={handleSaveRx} className="space-y-4">
          <Input
            label="Medication Name & Strength"
            placeholder="e.g. Amoxicillin 500mg, Metformin ER 500mg..."
            value={rxName}
            onChange={(e) => setRxName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Dosage"
              placeholder="e.g. 1 capsule, 2 tablets"
              value={rxDosage}
              onChange={(e) => setRxDosage(e.target.value)}
              required
            />

            <Input
              label="Frequency"
              placeholder="e.g. Twice daily with meals"
              value={rxFrequency}
              onChange={(e) => setRxFrequency(e.target.value)}
              required
            />

            <Input
              label="Duration"
              placeholder="e.g. 7 days, 30 days"
              value={rxDuration}
              onChange={(e) => setRxDuration(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Instructions & Patient Directions
            </label>
            <textarea
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[70px]"
              placeholder="e.g. Take with a full glass of water. Complete full course even if symptoms subside..."
              value={rxInstructions}
              onChange={(e) => setRxInstructions(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsRxModalOpen(false)}
              disabled={addRxMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              isLoading={addRxMutation.isPending}
              className="gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              Sign & Record Prescription
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
