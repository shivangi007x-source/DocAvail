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
    phone?: string | null;
    location?: string | null;
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
    availabilityStatus: AvailabilityStatus;
    statusNote?: string | null;
  } | null;
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
  statusNote?: string;
  avatarUrl: string;
  isVerified?: boolean;
  verificationStatus?: VerificationStatus;
  consultationTypes?: string;
  consultationType?: string;
}
