import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding DocAvail database with DEMO data...');

  // Clean existing data in order of foreign key dependencies
  await prisma.prescription.deleteMany();
  await prisma.medicalRecord.deleteMany();
  await prisma.doctorPatientAccess.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.appointmentSlot.deleteMany();
  await prisma.workingHours.deleteMany();
  await prisma.doctorProfile.deleteMany();
  await prisma.patientProfile.deleteMany();
  await prisma.reportedAccount.deleteMany();
  await prisma.review.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Create Admin User (DEMO)
  await prisma.user.create({
    data: {
      email: 'admin@docavail.com',
      passwordHash,
      role: 'ADMIN',
      name: 'DocAvail Admin (DEMO)',
    },
  });

  // 2. Create Sample Patients (DEMO)
  const patient1User = await prisma.user.create({
    data: {
      email: 'patient.alex@example.com',
      passwordHash,
      role: 'PATIENT',
      name: 'Alex Morgan (DEMO Patient)',
      patientProfile: {
        create: {
          phone: '+1 555-0192',
          location: 'New York, NY',
          dateOfBirth: new Date('1990-05-15'),
          gender: 'Male',
          bloodGroup: 'O+',
        },
      },
    },
    include: { patientProfile: true },
  });

  const patient2User = await prisma.user.create({
    data: {
      email: 'patient.emily@example.com',
      passwordHash,
      role: 'PATIENT',
      name: 'Emily Watson (DEMO Patient)',
      patientProfile: {
        create: {
          phone: '+1 555-0843',
          location: 'Chicago, IL',
          dateOfBirth: new Date('1994-11-20'),
          gender: 'Female',
          bloodGroup: 'A+',
        },
      },
    },
    include: { patientProfile: true },
  });

  const alexProfile = patient1User.patientProfile!;
  const emilyProfile = patient2User.patientProfile!;

  // 3. Create Sample Doctors with DoctorProfile
  // Doctor 1: Sarah Jenkins (Cardiology, APPROVED)
  const doctor1User = await prisma.user.create({
    data: {
      email: 'dr.jenkins@docavail.com',
      passwordHash,
      role: 'DOCTOR',
      name: 'Dr. Sarah Jenkins, MD (DEMO)',
      avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=300&auto=format&fit=crop',
    },
  });

  const doctor1Profile = await prisma.doctorProfile.create({
    data: {
      userId: doctor1User.id,
      specialization: 'Cardiology',
      qualification: 'MBBS, FACC (Harvard Medical)',
      experience: 14,
      licenseNumber: 'MD-NY-849201',
      verificationStatus: 'APPROVED',
      consultationFee: 150.0,
      clinicName: 'Apex Heart Institute',
      clinicAddress: '450 Lexington Ave, Suite 300',
      city: 'New York, NY',
      consultationType: 'IN_PERSON',
      treatedConditions: 'Hypertension, Heart Disease, Arrhythmia, High Cholesterol, Chest Pain, Coronary Artery Disease, Heart Failure',
      availabilityStatus: 'AVAILABLE',
      statusNote: 'Accepting walk-ins & immediate online slot requests',
      statusUpdatedAt: new Date(),
      rating: 4.9,
      reviewCount: 128,
    },
  });

  // Doctor 2: Marcus Vance (General Medicine, APPROVED)
  const doctor2User = await prisma.user.create({
    data: {
      email: 'dr.vance@docavail.com',
      passwordHash,
      role: 'DOCTOR',
      name: 'Dr. Marcus Vance, MD (DEMO)',
      avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=300&auto=format&fit=crop',
    },
  });

  const doctor2Profile = await prisma.doctorProfile.create({
    data: {
      userId: doctor2User.id,
      specialization: 'General Medicine',
      qualification: 'MD, Internal Medicine (Johns Hopkins)',
      experience: 11,
      licenseNumber: 'MD-IL-738210',
      verificationStatus: 'APPROVED',
      consultationFee: 90.0,
      clinicName: 'Metropolitan Family Care',
      clinicAddress: '120 Grand Ave',
      city: 'Chicago, IL',
      consultationType: 'BOTH',
      treatedConditions: 'Diabetes, Type 2 Diabetes, Hypertension, Asthma, Migraine, Fever, High Blood Pressure, Chronic Fatigue, Flu',
      availabilityStatus: 'BUSY',
      statusNote: 'Currently in patient consultation. Next open slot at 3:30 PM',
      statusUpdatedAt: new Date(Date.now() - 25 * 60 * 1000), // 25 mins ago
      rating: 4.8,
      reviewCount: 94,
    },
  });

  // Doctor 3: Elena Rostova (Dermatology, APPROVED)
  const doctor3User = await prisma.user.create({
    data: {
      email: 'dr.rostova@docavail.com',
      passwordHash,
      role: 'DOCTOR',
      name: 'Dr. Elena Rostova, MD (DEMO)',
      avatarUrl: 'https://images.unsplash.com/photo-1594824813566-818a4d7d1101?q=80&w=300&auto=format&fit=crop',
    },
  });

  const doctor3Profile = await prisma.doctorProfile.create({
    data: {
      userId: doctor3User.id,
      specialization: 'Dermatology',
      qualification: 'MD, FAAD (Stanford Medicine)',
      experience: 9,
      licenseNumber: 'MD-CA-910293',
      verificationStatus: 'APPROVED',
      consultationFee: 180.0,
      clinicName: 'Lumina Skin & Laser Clinic',
      clinicAddress: '880 Wilshire Blvd',
      city: 'Los Angeles, CA',
      consultationType: 'IN_PERSON',
      treatedConditions: 'Skin Allergy, Eczema, Acne, Psoriasis, Rash, Dermatitis, Rosacea, Skin Infection, Hair Loss',
      availabilityStatus: 'AVAILABLE',
      statusNote: 'On-site today until 6:00 PM',
      statusUpdatedAt: new Date(Date.now() - 10 * 60 * 1000), // 10 mins ago
      rating: 4.95,
      reviewCount: 210,
    },
  });

  // Doctor 4: Pending Verification Doctor (Pediatrics, PENDING)
  const doctor4User = await prisma.user.create({
    data: {
      email: 'dr.pending@docavail.com',
      passwordHash,
      role: 'DOCTOR',
      name: 'Dr. David Miller, MD (DEMO - Pending Verification)',
      avatarUrl: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=300&auto=format&fit=crop',
    },
  });

  await prisma.doctorProfile.create({
    data: {
      userId: doctor4User.id,
      specialization: 'Pediatrics',
      qualification: 'MD, Pediatrics (Columbia University)',
      experience: 6,
      licenseNumber: 'MD-TX-339201',
      verificationStatus: 'PENDING',
      consultationFee: 110.0,
      clinicName: 'Sunshine Kids Healthcare',
      clinicAddress: '310 Main Street',
      city: 'Houston, TX',
      consultationType: 'VIDEO',
      treatedConditions: 'Pediatric Fever, Childhood Asthma, Food Allergy, Ear Infection, Common Cold, Child Development',
      availabilityStatus: 'UNAVAILABLE',
      statusNote: 'Awaiting admin credential verification',
      statusUpdatedAt: new Date(Date.now() - 2 * 3600 * 1000),
      rating: 5.0,
      reviewCount: 0,
    },
  });

  // 4. Create Working Hours for Approved Doctors (Mon - Fri, with breaks and 30m slot)
  const days = [1, 2, 3, 4, 5]; // Mon - Fri
  for (const day of days) {
    await prisma.workingHours.create({
      data: {
        doctorId: doctor1Profile.id,
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '17:00',
        breakStart: '13:00',
        breakEnd: '14:00',
        slotDurationMinutes: 30,
        isActive: true,
      },
    });

    await prisma.workingHours.create({
      data: {
        doctorId: doctor2Profile.id,
        dayOfWeek: day,
        startTime: '08:30',
        endTime: '16:30',
        breakStart: '12:30',
        breakEnd: '13:30',
        slotDurationMinutes: 30,
        isActive: true,
      },
    });

    await prisma.workingHours.create({
      data: {
        doctorId: doctor3Profile.id,
        dayOfWeek: day,
        startTime: '10:00',
        endTime: '18:00',
        breakStart: '13:00',
        breakEnd: '14:00',
        slotDurationMinutes: 30,
        isActive: true,
      },
    });
  }

  // 5. Establish Doctor-Patient Access Grants (Explicit Permission & Consent)
  // Alex grants access to Dr. Vance (General Medicine) and Dr. Jenkins (Cardiology)
  await prisma.doctorPatientAccess.create({
    data: {
      patientId: alexProfile.id,
      doctorId: doctor2Profile.id,
      status: 'GRANTED',
      reason: 'Primary care and diabetes management relationship',
      grantedAt: new Date(Date.now() - 90 * 24 * 3600 * 1000),
    },
  });

  await prisma.doctorPatientAccess.create({
    data: {
      patientId: alexProfile.id,
      doctorId: doctor1Profile.id,
      status: 'GRANTED',
      reason: 'Cardiovascular checkup and lipid monitoring access',
      grantedAt: new Date(Date.now() - 30 * 24 * 3600 * 1000),
    },
  });

  // Emily grants access to Dr. Elena Rostova (Dermatology)
  await prisma.doctorPatientAccess.create({
    data: {
      patientId: emilyProfile.id,
      doctorId: doctor3Profile.id,
      status: 'GRANTED',
      reason: 'Dermatological consultation and skin allergy evaluation',
      grantedAt: new Date(Date.now() - 15 * 24 * 3600 * 1000),
    },
  });

  // 6. Seed Realistic Medical Records for Alex (Chronological order)
  // Record 1: Self-Reported Penicillin Allergy
  await prisma.medicalRecord.create({
    data: {
      patientId: alexProfile.id,
      title: 'Penicillin & Amoxicillin Allergy',
      recordType: 'ALLERGY',
      description: 'Developed full-body urticaria, facial swelling, and mild wheezing within 30 minutes of taking oral Amoxicillin. Avoid all beta-lactam antibiotics.',
      severity: 'SEVERE',
      status: 'ACTIVE',
      addedByRole: 'PATIENT',
      diagnosedDate: new Date('2021-08-14'),
      createdAt: new Date('2021-08-14'),
    },
  });

  // Record 2: Dr. Vance Diagnoses Type 2 Diabetes
  await prisma.medicalRecord.create({
    data: {
      patientId: alexProfile.id,
      doctorId: doctor2Profile.id,
      title: 'Type 2 Diabetes Mellitus',
      recordType: 'DIAGNOSIS',
      description: 'Confirmed diagnosis following consecutive fasting blood glucose readings of 138 mg/dL and HbA1c of 7.2%. Commencing lifestyle diet changes and oral Metformin therapy.',
      severity: 'MODERATE',
      status: 'CHRONIC',
      addedByRole: 'DOCTOR',
      diagnosedDate: new Date('2025-04-10'),
      createdAt: new Date('2025-04-10'),
    },
  });

  // Record 3: Dr. Vance prescribes Metformin
  await prisma.medicalRecord.create({
    data: {
      patientId: alexProfile.id,
      doctorId: doctor2Profile.id,
      title: 'Oral Metformin 500mg Twice Daily',
      recordType: 'MEDICATION',
      description: 'Prescribed Metformin ER 500mg BID to regulate fasting and postprandial glucose levels. Patient instructed to take with breakfast and dinner.',
      severity: 'MILD',
      status: 'ACTIVE',
      addedByRole: 'DOCTOR',
      diagnosedDate: new Date('2025-04-10'),
      createdAt: new Date('2025-04-10'),
    },
  });

  // Record 4: Dr. Vance Consultation Notes & Followup
  await prisma.medicalRecord.create({
    data: {
      patientId: alexProfile.id,
      doctorId: doctor2Profile.id,
      title: 'Quarterly Glycemic & Metabolic Review',
      recordType: 'CONSULTATION_NOTE',
      description: 'Patient reports high compliance with medication. HbA1c improved from 7.2% to 6.6%. Blood pressure well-regulated at 122/78 mmHg. Fasting blood sugar target achieved.',
      severity: 'MILD',
      status: 'RESOLVED',
      addedByRole: 'DOCTOR',
      diagnosedDate: new Date('2025-10-18'),
      createdAt: new Date('2025-10-18'),
    },
  });

  // Record 5: Lab Report self-uploaded by Alex
  await prisma.medicalRecord.create({
    data: {
      patientId: alexProfile.id,
      title: 'Comprehensive Metabolic Panel & Lipid Profile',
      recordType: 'LAB_REPORT',
      description: 'Routine blood panel from Quest Diagnostics. Total Cholesterol: 185 mg/dL, Triglycerides: 140 mg/dL, HDL: 48 mg/dL, LDL: 109 mg/dL. Kidney and liver functions normal.',
      severity: 'MILD',
      status: 'ACTIVE',
      fileUrl: '/docs/lab_metabolic_panel_2025.pdf',
      addedByRole: 'PATIENT',
      diagnosedDate: new Date('2025-10-15'),
      createdAt: new Date('2025-10-15'),
    },
  });

  // 7. Seed Active Prescriptions for Alex
  await prisma.prescription.create({
    data: {
      patientId: alexProfile.id,
      doctorId: doctor2Profile.id,
      medicationName: 'Metformin Hydrochloride Extended-Release 500mg',
      dosage: '1 tablet (500mg)',
      frequency: 'Twice daily with morning and evening meals',
      duration: '90 days (refillable x 3)',
      instructions: 'Swallow whole with food and a full glass of water. Do not crush or chew.',
      prescribedDate: new Date('2025-10-18'),
      status: 'ACTIVE',
    },
  });

  await prisma.prescription.create({
    data: {
      patientId: alexProfile.id,
      doctorId: doctor1Profile.id,
      medicationName: 'Atorvastatin Calcium 10mg',
      dosage: '1 tablet (10mg)',
      frequency: 'Once daily at bedtime',
      duration: '90 days',
      instructions: 'Take once daily before sleep. Regular lipid panel monitoring advised.',
      prescribedDate: new Date('2025-09-20'),
      status: 'ACTIVE',
    },
  });

  // 8. Seed Appointments between Alex and Doctors for history
  await prisma.appointment.create({
    data: {
      patientId: patient1User.id,
      doctorId: doctor2Profile.id,
      date: new Date('2025-10-18'),
      startTime: '10:00',
      endTime: '10:30',
      status: 'COMPLETED',
      consultationType: 'IN_PERSON',
      reasonForVisit: 'Quarterly Diabetes follow-up and prescription refill',
      patientNotes: 'Feeling much more energetic, glucose readings have stabilized around 110-120 mg/dL.',
      doctorNotes: 'HbA1c lowered to 6.6%. Patient is responding well to Metformin. Advised continued diet and moderate exercise.',
    },
  });

  await prisma.appointment.create({
    data: {
      patientId: patient1User.id,
      doctorId: doctor1Profile.id,
      date: new Date('2025-09-20'),
      startTime: '14:00',
      endTime: '14:30',
      status: 'COMPLETED',
      consultationType: 'IN_PERSON',
      reasonForVisit: 'Cardiovascular screening and lipid evaluation',
      patientNotes: 'Family history of early coronary heart disease.',
      doctorNotes: 'ECG normal sinus rhythm. Commenced low-dose Atorvastatin as preventive measure.',
    },
  });

  console.log('✅ DocAvail Database successfully seeded with rich medical records & access grants!');
  console.log('----------------------------------------------------');
  console.log('DEMO ACCOUNTS (Password: password123):');
  console.log(`- Patient Alex (with rich history): patient.alex@example.com`);
  console.log(`- Patient Emily (fresh profile):    patient.emily@example.com`);
  console.log(`- Dr. Jenkins (Cardiology):         dr.jenkins@docavail.com`);
  console.log(`- Dr. Vance (General Medicine):     dr.vance@docavail.com`);
  console.log(`- Dr. Rostova (Dermatology):        dr.rostova@docavail.com`);
  console.log(`- Dr. Miller (Pending Doctor):      dr.pending@docavail.com`);
  console.log(`- System Admin:                     admin@docavail.com`);
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
