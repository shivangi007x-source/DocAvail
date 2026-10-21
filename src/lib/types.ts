export type UserRole = 'PATIENT' | 'DOCTOR' | 'ADMIN';
export type AvailabilityStatus = 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE';
export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ConsultationType = 'IN_PERSON' | 'VIDEO' | 'BOTH';
export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  patientProfile?: {
    id?: string;
    phone?: string | null;
    location?: string | null;
    dateOfBirth?: string | null;
    gender?: string | null;
    bloodGroup?: string | null;
  } | null;
  doctorProfile?: {
    id: string;
    specialization: string;
    qualification: string;
    experience: number;
    licenseNumber: string;
    verificationStatus: VerificationStatus;
    consultationFee: number;
    clinicName: string;
    clinicAddress: string;
    city: string;
    consultationType: string;
    treatedConditions?: string | null;
    availabilityStatus: AvailabilityStatus;
    statusNote?: string | null;
    statusUpdatedAt?: string | null;
  } | null;
}

export interface WorkingHoursItem {
  id?: string;
  doctorId?: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startTime: string; // e.g. "09:00"
  endTime: string;   // e.g. "17:00"
  breakStart?: string | null; // e.g. "13:00"
  breakEnd?: string | null;   // e.g. "14:00"
  slotDurationMinutes: number; // e.g. 30
  isActive: boolean;
}

export interface DoctorSummary {
  id: string;
  userId?: string;
  name: string;
  specialization: string;
  qualifications?: string;
  qualification?: string;
  experienceYears?: number;
  experience?: number;
  rating: number;
  reviewCount: number;
  clinicName: string;
  clinicAddress: string;
  city: string;
  fee: number;
  consultationFee?: number;
  availabilityStatus: AvailabilityStatus;
  statusNote?: string | null;
  statusUpdatedAt?: string | null;
  avatarUrl: string;
  isVerified?: boolean;
  verificationStatus?: VerificationStatus;
  consultationTypes?: string;
  consultationType?: string;
  treatedConditions?: string | null;
  conditions?: string[];
  workingHours?: WorkingHoursItem[];
}

export interface PublicDoctorAvailability {
  doctorId: string;
  doctorUserId?: string;
  name: string;
  specialization: string;
  availabilityStatus: AvailabilityStatus;
  statusNote?: string | null;
  statusUpdatedAt?: string | null;
}

export type RecordType = 'DIAGNOSIS' | 'ALLERGY' | 'MEDICATION' | 'CONSULTATION_NOTE' | 'LAB_REPORT' | 'OTHER';

export interface MedicalRecordItem {
  id: string;
  patientId: string;
  doctorId?: string | null;
  doctorName?: string | null;
  doctorSpecialization?: string | null;
  doctorClinic?: string | null;
  title: string;
  recordType: RecordType;
  description: string;
  diagnosedDate?: string | null;
  severity?: 'MILD' | 'MODERATE' | 'SEVERE' | null;
  status?: 'ACTIVE' | 'RESOLVED' | 'CHRONIC' | null;
  fileUrl?: string | null;
  addedByRole: 'PATIENT' | 'DOCTOR';
  createdAt: string;
  updatedAt?: string;
}

export interface PrescriptionItem {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialization: string;
  doctorClinic?: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string | null;
  prescribedDate: string;
  status: 'ACTIVE' | 'COMPLETED' | 'DISCONTINUED';
  createdAt: string;
}

export interface DoctorPatientAccessItem {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialization: string;
  doctorClinic: string;
  status: 'GRANTED' | 'REVOKED';
  grantedAt: string;
  reason?: string | null;
}

export interface PatientAuthorizedSummary {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string | null;
  location?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  bloodGroup?: string | null;
  recordCount: number;
  prescriptionCount: number;
  lastVisit?: string | null;
  accessStatus: string;
  accessGrantedAt: string;
}
