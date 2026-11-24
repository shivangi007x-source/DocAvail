import { prisma } from '@/lib/prisma';

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

export type CreateAppointmentResult =
  | {
      ok: true;
      appointment: {
        id: string;
        doctorId: string;
        doctorName: string;
        date: string;
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
      };
    }
  | { ok: false; status: number; error: string };

function normalizeOptionalText(value: unknown, maxLength = 2000): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

/**
 * Validates and persists a patient appointment together with appointment-scoped medical intake details.
 * Keeps appointment-specific symptoms/conditions separate from permanent PatientProfile / MedicalRecord entries.
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

  // Resolve DoctorProfile by id or userId
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

  const patientProfile = await prisma.patientProfile.upsert({
    where: { userId: patientUserId },
    update: {},
    create: { userId: patientUserId },
  });

  let appointmentDate = new Date();
  if (input.date) {
    const parsed = new Date(input.date);
    if (!Number.isNaN(parsed.getTime())) {
      appointmentDate = parsed;
    }
  }

  const consultationType =
    input.consultationType === 'VIDEO' ? 'VIDEO' : 'IN_PERSON';

  const symptoms = normalizeOptionalText(input.symptoms);
  const existingConditions = normalizeOptionalText(input.existingConditions);
  const currentMedications = normalizeOptionalText(input.currentMedications);
  const knownAllergies = normalizeOptionalText(input.knownAllergies);
  const patientNotes = normalizeOptionalText(input.patientNotes);

  const appointment = await prisma.appointment.create({
    data: {
      patientId: patientUserId,
      doctorId: doctorProfile.id,
      date: appointmentDate,
      startTime: normalizeOptionalText(input.startTime, 40) || '10:00 AM',
      endTime: normalizeOptionalText(input.endTime, 40) || '10:30 AM',
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
          user: {
            select: {
              name: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });

  // Record consent relationship for this doctor-patient consultation
  await prisma.doctorPatientAccess.upsert({
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

  return {
    ok: true,
    appointment: {
      id: appointment.id,
      doctorId: appointment.doctorId,
      doctorName: appointment.doctor.user.name,
      date: appointment.date.toISOString(),
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
}
