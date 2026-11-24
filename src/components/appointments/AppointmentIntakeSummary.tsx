'use client';

import React from 'react';
import { AlertTriangle, FileText, Pill, Stethoscope, Activity } from 'lucide-react';

export interface AppointmentIntakeData {
  reasonForVisit?: string | null;
  symptoms?: string | null;
  existingConditions?: string | null;
  currentMedications?: string | null;
  knownAllergies?: string | null;
  patientNotes?: string | null;
}

interface AppointmentIntakeSummaryProps {
  appointment: AppointmentIntakeData;
  audience?: 'DOCTOR' | 'PATIENT';
}

export function AppointmentIntakeSummary({
  appointment,
  audience = 'DOCTOR',
}: AppointmentIntakeSummaryProps) {
  const {
    reasonForVisit,
    symptoms,
    existingConditions,
    currentMedications,
    knownAllergies,
    patientNotes,
  } = appointment;

  const hasAnyDetails = Boolean(
    reasonForVisit ||
      symptoms ||
      existingConditions ||
      currentMedications ||
      knownAllergies ||
      patientNotes
  );

  if (!hasAnyDetails) return null;

  return (
    <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl text-xs space-y-2.5">
      {reasonForVisit && (
        <div className="space-y-0.5">
          <span className="font-bold text-slate-900 flex items-center gap-1.5">
            <Stethoscope className="h-3.5 w-3.5 text-brand-600 shrink-0" />
            {audience === 'DOCTOR' ? 'Reason for Appointment:' : 'Reason for Visit:'}
          </span>
          <p className="text-slate-700 leading-relaxed pl-5">{reasonForVisit}</p>
        </div>
      )}

      {symptoms && (
        <div className="space-y-0.5">
          <span className="font-bold text-slate-800 flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-sky-600 shrink-0" />
            Reported Symptoms:
          </span>
          <p className="text-slate-700 leading-relaxed pl-5">{symptoms}</p>
        </div>
      )}

      {(existingConditions || currentMedications || knownAllergies) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
          {existingConditions && (
            <div className="bg-white border border-slate-200 rounded-lg p-2.5 space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <FileText className="h-3 w-3 text-purple-600" />
                Existing Conditions
              </span>
              <p className="text-slate-800 font-medium">{existingConditions}</p>
            </div>
          )}

          {currentMedications && (
            <div className="bg-white border border-slate-200 rounded-lg p-2.5 space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Pill className="h-3 w-3 text-emerald-600" />
                Current Medications
              </span>
              <p className="text-slate-800 font-medium">{currentMedications}</p>
            </div>
          )}

          {knownAllergies && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-2.5 space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-rose-600" />
                Known Allergies
              </span>
              <p className="text-rose-900 font-semibold">{knownAllergies}</p>
            </div>
          )}
        </div>
      )}

      {patientNotes && (
        <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-200/70">
          <span className="font-semibold text-slate-700">Additional Notes:</span> {patientNotes}
        </div>
      )}
    </div>
  );
}
