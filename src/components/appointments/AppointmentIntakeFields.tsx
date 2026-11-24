'use client';

import React from 'react';
import { Input } from '@/components/ui/Input';

export interface AppointmentIntakeValues {
  reasonForVisit: string;
  symptoms: string;
  existingConditions: string;
  currentMedications: string;
  knownAllergies: string;
}

export const EMPTY_APPOINTMENT_INTAKE: AppointmentIntakeValues = {
  reasonForVisit: '',
  symptoms: '',
  existingConditions: '',
  currentMedications: '',
  knownAllergies: '',
};

interface AppointmentIntakeFieldsProps {
  values: AppointmentIntakeValues;
  onChange: (next: AppointmentIntakeValues) => void;
  disabled?: boolean;
}

export function AppointmentIntakeFields({
  values,
  onChange,
  disabled = false,
}: AppointmentIntakeFieldsProps) {
  const updateField = (key: keyof AppointmentIntakeValues, value: string) => {
    onChange({ ...values, [key]: value });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
          Reason for Appointment <span className="text-rose-600">*</span>
        </label>
        <Input
          placeholder="e.g. Persistent fever, chest discomfort, diabetes follow-up..."
          value={values.reasonForVisit}
          onChange={(e) => updateField('reasonForVisit', e.target.value)}
          disabled={disabled}
          required
        />
      </div>

      <div>
        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
          Description of Symptoms (Optional)
        </label>
        <textarea
          rows={2}
          disabled={disabled}
          placeholder="Describe current symptoms, onset, or severity for this visit..."
          value={values.symptoms}
          onChange={(e) => updateField('symptoms', e.target.value)}
          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none disabled:bg-slate-50"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
            Existing Medical Conditions (Optional)
          </label>
          <Input
            placeholder="e.g. Type 2 Diabetes, Asthma..."
            value={values.existingConditions}
            onChange={(e) => updateField('existingConditions', e.target.value)}
            disabled={disabled}
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
            Current Medications (Optional)
          </label>
          <Input
            placeholder="e.g. Metformin 500mg, Inhaler..."
            value={values.currentMedications}
            onChange={(e) => updateField('currentMedications', e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
          Known Allergies (Optional)
        </label>
        <Input
          placeholder="e.g. Penicillin, sulfa drugs, pollen (leave blank if none)"
          value={values.knownAllergies}
          onChange={(e) => updateField('knownAllergies', e.target.value)}
          disabled={disabled}
        />
      </div>

      <p className="text-[11px] text-slate-500">
        These visit details are attached only to this appointment for your doctor and do not overwrite your permanent medical history.
      </p>
    </div>
  );
}
