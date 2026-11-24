'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SlotPicker, SlotOption } from '@/components/ui/SlotPicker';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { DoctorSummary } from '@/lib/types';
import { formatClinicAddress, formatCurrency } from '@/lib/utils';
import {
  formatAppointmentDate,
  getTodayIstDateKey,
  getTomorrowIstDateKey,
} from '@/lib/appointmentTime';
import { MapPin, CheckCircle, UserCheck, Video } from 'lucide-react';
import {
  AppointmentIntakeFields,
  AppointmentIntakeValues,
  EMPTY_APPOINTMENT_INTAKE,
} from './AppointmentIntakeFields';

interface SlotsApiResponse {
  doctorId: string;
  dateKey: string;
  dailyLimit: number;
  activeCount: number;
  remainingCapacity: number;
  isDailyLimitReached: boolean;
  slots: SlotOption[];
}

interface BookAppointmentModalProps {
  doctor: DoctorSummary | null;
  onClose: () => void;
  redirectBasePath?: string;
}

export function BookAppointmentModal({
  doctor,
  onClose,
  redirectBasePath = '/',
}: BookAppointmentModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState(getTomorrowIstDateKey);
  const [bookingSlotId, setBookingSlotId] = useState('');
  const [consultationType, setConsultationType] = useState<'IN_PERSON' | 'VIDEO'>('IN_PERSON');
  const [intake, setIntake] = useState<AppointmentIntakeValues>(EMPTY_APPOINTMENT_INTAKE);
  const [isBooking, setIsBooking] = useState(false);

  const { data: slotsData, isLoading: slotsLoading } = useQuery<SlotsApiResponse>({
    queryKey: ['doctor-slots', doctor?.id || null, selectedDate],
    queryFn: async () => {
      const res = await fetch(
        `/api/doctors/${doctor!.id}/slots?date=${encodeURIComponent(selectedDate)}`,
        { cache: 'no-store' }
      );
      if (!res.ok) throw new Error('Failed to load live slot availability');
      return res.json();
    },
    enabled: Boolean(doctor?.id && selectedDate),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const liveSlots = slotsData?.slots || [];

  useEffect(() => {
    if (doctor) {
      setIntake(EMPTY_APPOINTMENT_INTAKE);
      setConsultationType('IN_PERSON');
    }
  }, [doctor]);

  useEffect(() => {
    const currentSlots = slotsData?.slots || [];
    if (currentSlots.length > 0) {
      const stillValid = currentSlots.some((s) => s.id === bookingSlotId && s.available);
      if (!stillValid) {
        const firstOpen = currentSlots.find((s) => s.available);
        setBookingSlotId(firstOpen ? firstOpen.id : '');
      }
    }
  }, [slotsData?.slots, bookingSlotId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctor) return;

    if (!user) {
      toast('Sign In Required', 'Please sign in with your patient account to book an appointment.', 'error');
      onClose();
      router.push(`/login?redirect=${encodeURIComponent(redirectBasePath)}`);
      return;
    }

    if (user.role === 'DOCTOR') {
      toast('Account Notice', 'Doctor accounts cannot book patient appointments.', 'info');
      return;
    }

    if (!intake.reasonForVisit.trim()) {
      toast('Reason Required', 'Please provide your reason for the appointment.', 'error');
      return;
    }

    const chosenSlot = liveSlots.find((s) => s.id === bookingSlotId && s.available);
    if (!chosenSlot) {
      toast(
        'No Available Slot',
        slotsData?.isDailyLimitReached
          ? 'This doctor has reached the 10-appointment daily limit for the selected date.'
          : 'Please choose an available consultation time slot.',
        'error'
      );
      return;
    }

    setIsBooking(true);
    try {
      const res = await fetch('/api/patient/me/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: doctor.id,
          date: selectedDate,
          startTime: chosenSlot.time,
          endTime: chosenSlot.endTime,
          consultationType,
          reasonForVisit: intake.reasonForVisit.trim(),
          symptoms: intake.symptoms.trim() || undefined,
          existingConditions: intake.existingConditions.trim() || undefined,
          currentMedications: intake.currentMedications.trim() || undefined,
          knownAllergies: intake.knownAllergies.trim() || undefined,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        await queryClient.invalidateQueries({
          queryKey: ['doctor-slots', doctor.id, selectedDate],
        });
        throw new Error(resData.error || 'Failed to book appointment');
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['doctor-slots'] }),
        queryClient.invalidateQueries({ queryKey: ['patient-appointments'] }),
        queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] }),
        queryClient.invalidateQueries({ queryKey: ['patient-medical-records'] }),
        queryClient.invalidateQueries({ queryKey: ['notifications'] }),
      ]);

      toast(
        'Appointment Confirmed!',
        `Scheduled with ${doctor.name} (${chosenSlot.time} – ${chosenSlot.endTime}).`,
        'success'
      );
      onClose();
      router.push('/patient/appointments');
    } catch (err: any) {
      toast('Booking Conflict', err.message || 'Could not schedule appointment.', 'error');
    } finally {
      setIsBooking(false);
    }
  };

  if (!doctor) return null;

  const fee = doctor.consultationFee ?? doctor.fee ?? 0;

  return (
    <Modal
      isOpen={Boolean(doctor)}
      onClose={onClose}
      title={`Request Appointment — ${doctor.name}`}
      description={`${doctor.specialization} • ${doctor.clinicName}`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <div className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
          <div className="flex items-start gap-2.5 min-w-0">
            <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 truncate">
                {doctor.affiliatedFacilities?.[0]?.name || doctor.clinicName}
              </p>
              <p className="text-slate-500 truncate">
                {formatClinicAddress(doctor.clinicAddress, doctor.city, doctor.district)}
              </p>
            </div>
          </div>
          <StatusIndicator status={doctor.availabilityStatus} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Consultation Date
            </label>
            <Input
              type="date"
              value={selectedDate}
              min={getTodayIstDateKey()}
              onChange={(e) => setSelectedDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Consultation Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConsultationType('IN_PERSON')}
                className={`h-10 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  consultationType === 'IN_PERSON'
                    ? 'border-brand-600 bg-brand-50 text-brand-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <UserCheck className="h-3.5 w-3.5" />
                In-Person
              </button>
              <button
                type="button"
                onClick={() => setConsultationType('VIDEO')}
                className={`h-10 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  consultationType === 'VIDEO'
                    ? 'border-brand-600 bg-brand-50 text-brand-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Video className="h-3.5 w-3.5" />
                Video
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Select Slot
          </label>
          <SlotPicker
            slots={liveSlots}
            selectedSlotId={bookingSlotId}
            onSelectSlot={setBookingSlotId}
            dateLabel={formatAppointmentDate(selectedDate, selectedDate)}
            remainingCapacity={slotsData?.remainingCapacity}
            dailyLimit={slotsData?.dailyLimit}
            isDailyLimitReached={slotsData?.isDailyLimitReached}
            isLoading={slotsLoading}
          />
        </div>

        <AppointmentIntakeFields
          values={intake}
          onChange={setIntake}
          disabled={isBooking}
        />

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <span className="text-xs text-slate-500 font-semibold">
            Consultation Fee: {fee > 0 ? formatCurrency(fee) : 'Not listed'}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={isBooking}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              isLoading={isBooking}
              disabled={slotsLoading || !bookingSlotId || Boolean(slotsData?.isDailyLimitReached)}
              className="gap-1.5"
            >
              <CheckCircle className="h-4 w-4" />
              Confirm Appointment
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
