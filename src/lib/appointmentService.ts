import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  ACTIVE_APPOINTMENT_STATUSES,
  DEFAULT_SLOT_DURATION_MINUTES,
  MAX_APPOINTMENTS_PER_DAY,
  STANDARD_CONSULTATION_TIMES,
  computeSlotRange,
  formatMinutesTo12h,
  getIstDayOfWeek,
  getTodayIstDateKey,
  getTomorrowIstDateKey,
  istDateKeyToStorageDate,
  istDateKeyToUtcBounds,
  parseTimeToMinutes,
  toIstDateKey,
} from '@/lib/appointmentTime';

export interface AppointmentIntakeInput {
  doctorId?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  consultationType?: string;
  reasonForVisit?: string;
  symptoms?: string;
  existingConditions?: string;
  currentMedications?: string;
  knownAllergies?: string;
  patientNotes?: string;
}

export interface AppointmentSummaryDto {
  id: string;
  doctorId: string;
  doctorName: string;
  date: string;
  appointmentDateKey: string | null;
  startTime: string;
  endTime: string;
  status: string;
  consultationType: string;
  reasonForVisit: string | null;
  symptoms: string | null;
  existingConditions: string | null;
  currentMedications: string | null;
  knownAllergies: string | null;
  patientNotes: string | null;
}

export type CreateAppointmentResult =
  | { ok: true; appointment: AppointmentSummaryDto }
  | { ok: false; status: number; code?: string; error: string };

class BookingConflictError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function normalizeOptionalText(value: unknown, maxLength = 2000): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

async function resolveDoctorByIdOrUserId(doctorId: string) {
  let doctorProfile = await prisma.doctorProfile.findUnique({
    where: { id: doctorId },
    include: { user: true },
  });

  if (!doctorProfile) {
    doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: doctorId },
      include: { user: true },
    });
  }

  return doctorProfile;
}

/**
 * Concurrency-safe patient appointment creation enforcing:
 * 1) Maximum 10 active (PENDING/CONFIRMED) appointments per doctor per IST calendar day
 * 2) Zero double-booking per doctor + IST date + startTime via row lock + partial unique index
 * 3) Valid normalized startTime -> endTime slot range (never reversed or zero-length)
 */
export async function createPatientAppointment(
  patientUserId: string,
  input: AppointmentIntakeInput
): Promise<CreateAppointmentResult> {
  const doctorId = typeof input.doctorId === 'string' ? input.doctorId.trim() : '';
  if (!doctorId) {
    return { ok: false, status: 400, error: 'Doctor ID is required.' };
  }

  const reasonForVisit = normalizeOptionalText(input.reasonForVisit, 500);
  if (!reasonForVisit) {
    return { ok: false, status: 400, error: 'Reason for appointment is required.' };
  }

  const dateKey =
    input.date !== undefined && String(input.date).trim() !== ''
      ? toIstDateKey(input.date)
      : getTodayIstDateKey();

  if (!dateKey) {
    return { ok: false, status: 400, error: 'Please select a valid appointment date.' };
  }

  const slotRange = computeSlotRange(
    input.startTime || '10:00 AM',
    DEFAULT_SLOT_DURATION_MINUTES,
    input.endTime
  );
  if (!slotRange) {
    return { ok: false, status: 400, error: 'Please choose a valid appointment time slot.' };
  }

  const doctorProfile = await resolveDoctorByIdOrUserId(doctorId);
  if (!doctorProfile) {
    return { ok: false, status: 404, error: 'Doctor profile not found.' };
  }

  if (
    doctorProfile.user.role !== 'DOCTOR' ||
    doctorProfile.user.approvalStatus !== 'APPROVED' ||
    doctorProfile.verificationStatus === 'REJECTED'
  ) {
    return {
      ok: false,
      status: 403,
      error: 'This doctor account is not approved to accept appointments.',
    };
  }

  const consultationType = input.consultationType === 'VIDEO' ? 'VIDEO' : 'IN_PERSON';
  const symptoms = normalizeOptionalText(input.symptoms);
  const existingConditions = normalizeOptionalText(input.existingConditions);
  const currentMedications = normalizeOptionalText(input.currentMedications);
  const knownAllergies = normalizeOptionalText(input.knownAllergies);
  const patientNotes = normalizeOptionalText(input.patientNotes);
  const { startUtc, endUtc } = istDateKeyToUtcBounds(dateKey);

  try {
    const appointment = await prisma.$transaction(
      async (tx) => {
        // Lock DoctorProfile row to serialize concurrent capacity & slot checks for this doctor
        await tx.$queryRaw`SELECT id FROM "DoctorProfile" WHERE id = ${doctorProfile.id} FOR UPDATE`;

        const activeDayAppointments = await tx.appointment.findMany({
          where: {
            doctorId: doctorProfile.id,
            status: { in: [...ACTIVE_APPOINTMENT_STATUSES] },
            OR: [
              { appointmentDateKey: dateKey },
              {
                appointmentDateKey: null,
                date: { gte: startUtc, lte: endUtc },
              },
            ],
          },
          select: { id: true, startTime: true },
        });

        const hasSlotConflict = activeDayAppointments.some(
          (existing) => parseTimeToMinutes(existing.startTime) === slotRange.startMinutes
        );
        if (hasSlotConflict) {
          throw new BookingConflictError(
            409,
            'SLOT_ALREADY_BOOKED',
            `The ${slotRange.startTime} slot is already booked for ${dateKey}. Please pick another time slot.`
          );
        }

        if (activeDayAppointments.length >= MAX_APPOINTMENTS_PER_DAY) {
          throw new BookingConflictError(
            409,
            'DAILY_LIMIT_REACHED',
            `This doctor has reached the daily maximum of ${MAX_APPOINTMENTS_PER_DAY} active appointments for ${dateKey}. Please select another date.`
          );
        }

        const patientProfile = await tx.patientProfile.upsert({
          where: { userId: patientUserId },
          update: {},
          create: { userId: patientUserId },
        });

        const created = await tx.appointment.create({
          data: {
            patientId: patientUserId,
            doctorId: doctorProfile.id,
            date: istDateKeyToStorageDate(dateKey),
            appointmentDateKey: dateKey,
            startTime: slotRange.startTime,
            endTime: slotRange.endTime,
            status: 'CONFIRMED',
            consultationType,
            reasonForVisit,
            symptoms,
            existingConditions,
            currentMedications,
            knownAllergies,
            patientNotes,
          },
          include: {
            doctor: {
              include: {
                user: { select: { name: true } },
              },
            },
          },
        });

        await tx.doctorPatientAccess.upsert({
          where: {
            patientId_doctorId: {
              patientId: patientProfile.id,
              doctorId: doctorProfile.id,
            },
          },
          update: {
            status: 'GRANTED',
            reason: reasonForVisit || 'Consultation appointment booking consent',
            revokedAt: null,
          },
          create: {
            patientId: patientProfile.id,
            doctorId: doctorProfile.id,
            status: 'GRANTED',
            reason: reasonForVisit || 'Consultation appointment booking consent',
          },
        });

        return created;
      },
      {
        maxWait: 5000,
        timeout: 15000,
      }
    );

    return {
      ok: true,
      appointment: {
        id: appointment.id,
        doctorId: appointment.doctorId,
        doctorName: appointment.doctor.user.name,
        date: appointment.date.toISOString(),
        appointmentDateKey: appointment.appointmentDateKey,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        status: appointment.status,
        consultationType: appointment.consultationType,
        reasonForVisit: appointment.reasonForVisit,
        symptoms: appointment.symptoms,
        existingConditions: appointment.existingConditions,
        currentMedications: appointment.currentMedications,
        knownAllergies: appointment.knownAllergies,
        patientNotes: appointment.patientNotes,
      },
    };
  } catch (err: unknown) {
    if (err instanceof BookingConflictError) {
      return { ok: false, status: err.status, code: err.code, error: err.message };
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return {
        ok: false,
        status: 409,
        code: 'SLOT_ALREADY_BOOKED',
        error: `The ${slotRange.startTime} slot is already booked for ${dateKey}. Please pick another time slot.`,
      };
    }
    throw err;
  }
}

export interface DoctorSlotItem {
  id: string;
  time: string;
  endTime: string;
  available: boolean;
  isBooked: boolean;
}

export type DoctorSlotsAvailabilityResult =
  | {
      ok: true;
      doctorId: string;
      dateKey: string;
      dailyLimit: number;
      activeCount: number;
      remainingCapacity: number;
      isDailyLimitReached: boolean;
      slots: DoctorSlotItem[];
    }
  | { ok: false; status: number; error: string };

/**
 * Returns privacy-safe slot availability and daily booking capacity for an approved doctor on a given IST date.
 */
export async function getDoctorSlotAvailability(
  doctorIdOrUserId: string,
  rawDate?: string | null
): Promise<DoctorSlotsAvailabilityResult> {
  const dateKey =
    rawDate && rawDate.trim() !== '' ? toIstDateKey(rawDate) : getTomorrowIstDateKey();

  if (!dateKey) {
    return { ok: false, status: 400, error: 'Invalid date parameter. Expected YYYY-MM-DD.' };
  }

  const doctorProfile = await resolveDoctorByIdOrUserId(doctorIdOrUserId);
  if (
    !doctorProfile ||
    doctorProfile.user.role !== 'DOCTOR' ||
    doctorProfile.user.approvalStatus !== 'APPROVED' ||
    doctorProfile.verificationStatus === 'REJECTED'
  ) {
    return { ok: false, status: 404, error: 'Doctor profile not found.' };
  }

  const { startUtc, endUtc } = istDateKeyToUtcBounds(dateKey);
  const dayOfWeek = getIstDayOfWeek(dateKey);

  const [activeAppointments, dayHours] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        doctorId: doctorProfile.id,
        status: { in: [...ACTIVE_APPOINTMENT_STATUSES] },
        OR: [
          { appointmentDateKey: dateKey },
          {
            appointmentDateKey: null,
            date: { gte: startUtc, lte: endUtc },
          },
        ],
      },
      select: { startTime: true },
    }),
    prisma.workingHours.findUnique({
      where: {
        doctorId_dayOfWeek: {
          doctorId: doctorProfile.id,
          dayOfWeek,
        },
      },
    }),
  ]);

  const bookedStartMinutes = new Set(
    activeAppointments
      .map((a) => parseTimeToMinutes(a.startTime))
      .filter((m): m is number => m !== null)
  );

  // Build candidate slots from configured active working hours or standard clinical slots
  let candidateMinutes: number[] = [];
  if (dayHours?.isActive) {
    const startMin = parseTimeToMinutes(dayHours.startTime);
    const endMin = parseTimeToMinutes(dayHours.endTime);
    const breakStart = parseTimeToMinutes(dayHours.breakStart);
    const breakEnd = parseTimeToMinutes(dayHours.breakEnd);
    const step = dayHours.slotDurationMinutes || DEFAULT_SLOT_DURATION_MINUTES;

    if (startMin !== null && endMin !== null && step >= 15 && endMin > startMin) {
      for (let t = startMin; t + step <= endMin && candidateMinutes.length < 16; t += step) {
        const inBreak =
          breakStart !== null && breakEnd !== null && t < breakEnd && t + step > breakStart;
        if (!inBreak) {
          candidateMinutes.push(t);
        }
      }
    }
  }

  if (candidateMinutes.length === 0) {
    candidateMinutes = STANDARD_CONSULTATION_TIMES.map((label) => parseTimeToMinutes(label)!);
  }

  const activeCount = activeAppointments.length;
  const remainingCapacity = Math.max(0, MAX_APPOINTMENTS_PER_DAY - activeCount);
  const isDailyLimitReached = remainingCapacity === 0;

  const slots: DoctorSlotItem[] = candidateMinutes.map((min, idx) => {
    const startTime = formatMinutesTo12h(min);
    const endTime = formatMinutesTo12h(min + DEFAULT_SLOT_DURATION_MINUTES);
    const isBooked = bookedStartMinutes.has(min);
    return {
      id: `slot-${idx + 1}`,
      time: startTime,
      endTime,
      isBooked,
      available: !isBooked && !isDailyLimitReached,
    };
  });

  return {
    ok: true,
    doctorId: doctorProfile.id,
    dateKey,
    dailyLimit: MAX_APPOINTMENTS_PER_DAY,
    activeCount,
    remainingCapacity,
    isDailyLimitReached,
    slots,
  };
}

export type CancelAppointmentResult =
  | { ok: true; appointment: { id: string; status: string; doctorId: string; appointmentDateKey: string | null } }
  | { ok: false; status: number; error: string };

/**
 * Cancels an active appointment owned by the authenticated patient, immediately releasing
 * the doctor's time slot and daily appointment capacity.
 */
export async function cancelPatientAppointment(
  appointmentId: string,
  callerUserId: string,
  callerRole: string
): Promise<CancelAppointmentResult> {
  if (!appointmentId) {
    return { ok: false, status: 400, error: 'Appointment ID is required.' };
  }

  const existing = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, patientId: true, doctorId: true, status: true, appointmentDateKey: true },
  });

  if (!existing) {
    return { ok: false, status: 404, error: 'Appointment not found.' };
  }

  if (callerRole !== 'ADMIN' && existing.patientId !== callerUserId) {
    return {
      ok: false,
      status: 403,
      error: 'Forbidden. You can only cancel your own appointments.',
    };
  }

  if (existing.status === 'COMPLETED') {
    return { ok: false, status: 400, error: 'Completed appointments cannot be cancelled.' };
  }

  if (existing.status === 'CANCELLED') {
    return {
      ok: true,
      appointment: {
        id: existing.id,
        status: existing.status,
        doctorId: existing.doctorId,
        appointmentDateKey: existing.appointmentDateKey,
      },
    };
  }

  const updated = await prisma.appointment.update({
    where: { id: existing.id },
    data: { status: 'CANCELLED' },
    select: { id: true, status: true, doctorId: true, appointmentDateKey: true },
  });

  return { ok: true, appointment: updated };
}
