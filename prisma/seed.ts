import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Populating DocAvail with realistic fictional healthcare demo data...');

  // Clean existing tables in order of foreign key constraints
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

  // =========================================================================
  // 1. SYSTEM ADMIN (DEMO)
  // =========================================================================
  await prisma.user.create({
    data: {
      email: 'admin@docavail.com',
      passwordHash,
      role: 'ADMIN',
      name: 'DocAvail System Admin (DEMO)',
    },
  });

  // =========================================================================
  // 2. FICTIONAL DEMO DOCTORS (5 Specialized Clinicians)
  // =========================================================================

  // Doctor 1: Dr. Ananya Rao (Endocrinology)
  const drRaoUser = await prisma.user.create({
    data: {
      email: 'dr.ananya.rao@docavail.com',
      passwordHash,
      role: 'DOCTOR',
      name: 'Dr. Ananya Rao, MD (DEMO)',
      avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=300&auto=format&fit=crop',
    },
  });

  const drRaoProfile = await prisma.doctorProfile.create({
    data: {
      userId: drRaoUser.id,
      specialization: 'Endocrinology',
      qualification: 'MBBS, MD (Medicine), DM (Endocrinology) — Demo Clinician',
      experience: 12,
      licenseNumber: 'DEMO-NY-END-4921',
      verificationStatus: 'APPROVED',
      consultationFee: 140.0,
      clinicName: 'Nova Endocrine & Diabetes Centre',
      clinicAddress: '404 Park Avenue, Suite 600',
      city: 'New York, NY',
      consultationType: 'BOTH',
      treatedConditions: 'Diabetes, Type 2 Diabetes, Type 1 Diabetes, Thyroid Disorders, Hypothyroidism, Hyperthyroidism, Metabolic Syndrome, Obesity',
      availabilityStatus: 'AVAILABLE',
      statusNote: 'Accepting clinic walk-ins & virtual consultations today',
      statusUpdatedAt: new Date(),
      rating: 4.9,
      reviewCount: 142,
    },
  });

  // Doctor 2: Dr. Rahul Khanna (Pulmonology)
  const drKhannaUser = await prisma.user.create({
    data: {
      email: 'dr.rahul.khanna@docavail.com',
      passwordHash,
      role: 'DOCTOR',
      name: 'Dr. Rahul Khanna, MD (DEMO)',
      avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=300&auto=format&fit=crop',
    },
  });

  const drKhannaProfile = await prisma.doctorProfile.create({
    data: {
      userId: drKhannaUser.id,
      specialization: 'Pulmonology',
      qualification: 'MBBS, MD (Pulmonary Medicine), FCCP — Demo Clinician',
      experience: 15,
      licenseNumber: 'DEMO-IL-PUL-8302',
      verificationStatus: 'APPROVED',
      consultationFee: 130.0,
      clinicName: 'BreatheWell Chest & Lung Institute',
      clinicAddress: '720 Michigan Avenue, 4th Floor',
      city: 'Chicago, IL',
      consultationType: 'IN_PERSON',
      treatedConditions: 'Asthma, Respiratory Conditions, Wheezing, Chronic Bronchitis, Allergy, Chronic Cough, COPD, Shortness of Breath',
      availabilityStatus: 'AVAILABLE',
      statusNote: 'In clinic today until 5:00 PM for spirometry & asthma reviews',
      statusUpdatedAt: new Date(Date.now() - 15 * 60 * 1000),
      rating: 4.85,
      reviewCount: 118,
    },
  });

  // Doctor 3: Dr. Neha Kapoor (Obstetrics and Gynaecology)
  const drKapoorUser = await prisma.user.create({
    data: {
      email: 'dr.neha.kapoor@docavail.com',
      passwordHash,
      role: 'DOCTOR',
      name: 'Dr. Neha Kapoor, MS (DEMO)',
      avatarUrl: 'https://images.unsplash.com/photo-1594824813566-818a4d7d1101?q=80&w=300&auto=format&fit=crop',
    },
  });

  const drKapoorProfile = await prisma.doctorProfile.create({
    data: {
      userId: drKapoorUser.id,
      specialization: 'Obstetrics and Gynaecology',
      qualification: 'MBBS, MS (OB-GYN), DGO — Demo Clinician',
      experience: 10,
      licenseNumber: 'DEMO-CA-GYN-9912',
      verificationStatus: 'APPROVED',
      consultationFee: 150.0,
      clinicName: "Bloom Women's Health & Fertility Clinic",
      clinicAddress: '550 Wilshire Blvd, Suite 210',
      city: 'Los Angeles, CA',
      consultationType: 'BOTH',
      treatedConditions: 'PCOS, Polycystic Ovary Syndrome, Menstrual Disorders, Irregular Cycles, Hormonal Imbalance, Infertility, Pelvic Pain, Women Health',
      availabilityStatus: 'BUSY',
      statusNote: 'Currently performing ultrasound reviews. Next open slot at 3:00 PM',
      statusUpdatedAt: new Date(Date.now() - 35 * 60 * 1000),
      rating: 4.95,
      reviewCount: 230,
    },
  });

  // Doctor 4: Dr. Arjun Malhotra (Neurology)
  const drMalhotraUser = await prisma.user.create({
    data: {
      email: 'dr.arjun.malhotra@docavail.com',
      passwordHash,
      role: 'DOCTOR',
      name: 'Dr. Arjun Malhotra, MD (DEMO)',
      avatarUrl: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=300&auto=format&fit=crop',
    },
  });

  const drMalhotraProfile = await prisma.doctorProfile.create({
    data: {
      userId: drMalhotraUser.id,
      specialization: 'Neurology',
      qualification: 'MBBS, MD, DM (Neurology) — Demo Clinician',
      experience: 14,
      licenseNumber: 'DEMO-NY-NEU-1093',
      verificationStatus: 'APPROVED',
      consultationFee: 160.0,
      clinicName: 'Cortex Neurology & Headache Institute',
      clinicAddress: '880 Lexington Ave, 8th Floor',
      city: 'New York, NY',
      consultationType: 'IN_PERSON',
      treatedConditions: 'Migraine, Headache Disorders, Cluster Headache, Neuropathic Pain, Vertigo, Nerve Disorders, Neurovascular Disease',
      availabilityStatus: 'AVAILABLE',
      statusNote: 'Available for headache evaluation & trigger management',
      statusUpdatedAt: new Date(Date.now() - 10 * 60 * 1000),
      rating: 4.9,
      reviewCount: 165,
    },
  });

  // Doctor 5: Dr. Kavita Sharma (Internal Medicine)
  const drSharmaUser = await prisma.user.create({
    data: {
      email: 'dr.kavita.sharma@docavail.com',
      passwordHash,
      role: 'DOCTOR',
      name: 'Dr. Kavita Sharma, MD (DEMO)',
      avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=300&auto=format&fit=crop',
    },
  });

  const drSharmaProfile = await prisma.doctorProfile.create({
    data: {
      userId: drSharmaUser.id,
      specialization: 'Internal Medicine',
      qualification: 'MBBS, MD (Internal Medicine) — Demo Clinician',
      experience: 11,
      licenseNumber: 'DEMO-TX-INT-5521',
      verificationStatus: 'APPROVED',
      consultationFee: 95.0,
      clinicName: 'Apex Comprehensive Internal Medicine Clinic',
      clinicAddress: '210 Main Street, Suite 102',
      city: 'Houston, TX',
      consultationType: 'BOTH',
      treatedConditions: 'Anaemia, Anemia, Iron Deficiency, Fatigue, Low Haemoglobin, Hypertension, Diabetes, Common Medical Conditions, Preventive Health',
      availabilityStatus: 'AVAILABLE',
      statusNote: 'On duty today for walk-in consultations & routine health checks',
      statusUpdatedAt: new Date(Date.now() - 5 * 60 * 1000),
      rating: 4.88,
      reviewCount: 190,
    },
  });

  const allDoctors = [
    drRaoProfile,
    drKhannaProfile,
    drKapoorProfile,
    drMalhotraProfile,
    drSharmaProfile,
  ];

  // Configure Working Hours for Doctors (Mon - Fri)
  const weekdays = [1, 2, 3, 4, 5];
  for (const doc of allDoctors) {
    for (const day of weekdays) {
      await prisma.workingHours.create({
        data: {
          doctorId: doc.id,
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '17:00',
          breakStart: '13:00',
          breakEnd: '14:00',
          slotDurationMinutes: 30,
          isActive: true,
        },
      });
    }
  }

  // =========================================================================
  // 3. FICTIONAL DEMO PATIENTS (5 Diverse Case Studies)
  // =========================================================================

  // Patient 1: Aanya Sharma (Type 2 Diabetes)
  const p1User = await prisma.user.create({
    data: {
      email: 'aanya.sharma@example.com',
      passwordHash,
      role: 'PATIENT',
      name: 'Aanya Sharma (DEMO)',
      patientProfile: {
        create: {
          phone: '+1 555-0101',
          location: 'New York, NY',
          dateOfBirth: new Date('1988-06-14'),
          gender: 'Female',
          bloodGroup: 'B+',
        },
      },
    },
    include: { patientProfile: true },
  });
  const aanyaProfile = p1User.patientProfile!;

  // Patient 2: Rohan Mehta (Asthma)
  const p2User = await prisma.user.create({
    data: {
      email: 'rohan.mehta@example.com',
      passwordHash,
      role: 'PATIENT',
      name: 'Rohan Mehta (DEMO)',
      patientProfile: {
        create: {
          phone: '+1 555-0202',
          location: 'Chicago, IL',
          dateOfBirth: new Date('1995-03-22'),
          gender: 'Male',
          bloodGroup: 'O+',
        },
      },
    },
    include: { patientProfile: true },
  });
  const rohanProfile = p2User.patientProfile!;

  // Patient 3: Priya Verma (PCOS)
  const p3User = await prisma.user.create({
    data: {
      email: 'priya.verma@example.com',
      passwordHash,
      role: 'PATIENT',
      name: 'Priya Verma (DEMO)',
      patientProfile: {
        create: {
          phone: '+1 555-0303',
          location: 'Los Angeles, CA',
          dateOfBirth: new Date('1998-09-08'),
          gender: 'Female',
          bloodGroup: 'A+',
        },
      },
    },
    include: { patientProfile: true },
  });
  const priyaProfile = p3User.patientProfile!;

  // Patient 4: Arjun Kapoor (Migraine)
  const p4User = await prisma.user.create({
    data: {
      email: 'arjun.kapoor@example.com',
      passwordHash,
      role: 'PATIENT',
      name: 'Arjun Kapoor (DEMO)',
      patientProfile: {
        create: {
          phone: '+1 555-0404',
          location: 'New York, NY',
          dateOfBirth: new Date('1991-11-19'),
          gender: 'Male',
          bloodGroup: 'AB+',
        },
      },
    },
    include: { patientProfile: true },
  });
  const arjunProfile = p4User.patientProfile!;

  // Patient 5: Meera Singh (Iron-Deficiency Anaemia)
  const p5User = await prisma.user.create({
    data: {
      email: 'meera.singh@example.com',
      passwordHash,
      role: 'PATIENT',
      name: 'Meera Singh (DEMO)',
      patientProfile: {
        create: {
          phone: '+1 555-0505',
          location: 'Houston, TX',
          dateOfBirth: new Date('1993-07-27'),
          gender: 'Female',
          bloodGroup: 'O-',
        },
      },
    },
    include: { patientProfile: true },
  });
  const meeraProfile = p5User.patientProfile!;

  // =========================================================================
  // 4. ESTABLISH PRIVACY ACCESS GRANTS (Doctor-Patient Authorized Relationships)
  // =========================================================================

  // Aanya Sharma grants consent to Dr. Ananya Rao (Endocrinologist) & Dr. Kavita Sharma (Internal Med)
  await prisma.doctorPatientAccess.create({
    data: {
      patientId: aanyaProfile.id,
      doctorId: drRaoProfile.id,
      status: 'GRANTED',
      reason: 'Type 2 Diabetes endocrine management and metabolic monitoring consent',
      grantedAt: new Date(Date.now() - 60 * 24 * 3600 * 1000),
    },
  });

  await prisma.doctorPatientAccess.create({
    data: {
      patientId: aanyaProfile.id,
      doctorId: drSharmaProfile.id,
      status: 'GRANTED',
      reason: 'Routine internal medicine and annual preventative screening',
      grantedAt: new Date(Date.now() - 30 * 24 * 3600 * 1000),
    },
  });

  // Rohan Mehta grants consent to Dr. Rahul Khanna (Pulmonologist)
  await prisma.doctorPatientAccess.create({
    data: {
      patientId: rohanProfile.id,
      doctorId: drKhannaProfile.id,
      status: 'GRANTED',
      reason: 'Pulmonary care and bronchial asthma treatment consent',
      grantedAt: new Date(Date.now() - 45 * 24 * 3600 * 1000),
    },
  });

  // Priya Verma grants consent to Dr. Neha Kapoor (OB-GYN)
  await prisma.doctorPatientAccess.create({
    data: {
      patientId: priyaProfile.id,
      doctorId: drKapoorProfile.id,
      status: 'GRANTED',
      reason: 'PCOS evaluation and reproductive health consultation consent',
      grantedAt: new Date(Date.now() - 25 * 24 * 3600 * 1000),
    },
  });

  // Arjun Kapoor grants consent to Dr. Arjun Malhotra (Neurologist)
  await prisma.doctorPatientAccess.create({
    data: {
      patientId: arjunProfile.id,
      doctorId: drMalhotraProfile.id,
      status: 'GRANTED',
      reason: 'Chronic migraine trigger mapping and neurological management consent',
      grantedAt: new Date(Date.now() - 40 * 24 * 3600 * 1000),
    },
  });

  // Meera Singh grants consent to Dr. Kavita Sharma (Internal Medicine)
  await prisma.doctorPatientAccess.create({
    data: {
      patientId: meeraProfile.id,
      doctorId: drSharmaProfile.id,
      status: 'GRANTED',
      reason: 'Iron-deficiency anaemia evaluation and haematological monitoring consent',
      grantedAt: new Date(Date.now() - 20 * 24 * 3600 * 1000),
    },
  });

  // =========================================================================
  // 5. POPULATE PATIENT 1: AANYA SHARMA (Type 2 Diabetes)
  // =========================================================================
  await prisma.medicalRecord.create({
    data: {
      patientId: aanyaProfile.id,
      doctorId: drRaoProfile.id,
      title: 'Type 2 Diabetes Mellitus',
      recordType: 'DIAGNOSIS',
      description: 'Confirmed diagnosis following elevated fasting blood glucose (142 mg/dL) and HbA1c of 7.4%. Patient advised on carbohydrate portion control and daily aerobic exercise.',
      severity: 'MODERATE',
      status: 'CHRONIC',
      addedByRole: 'DOCTOR',
      diagnosedDate: new Date('2025-05-12'),
      createdAt: new Date('2025-05-12'),
    },
  });

  await prisma.medicalRecord.create({
    data: {
      patientId: aanyaProfile.id,
      title: 'Penicillin Antibiotic Allergy',
      recordType: 'ALLERGY',
      description: 'Severe adverse reaction to amoxicillin in 2022. Symptoms included generalized urticaria, facial swelling, and mild wheezing. Beta-lactams contraindicated.',
      severity: 'SEVERE',
      status: 'ACTIVE',
      addedByRole: 'PATIENT',
      diagnosedDate: new Date('2022-04-18'),
      createdAt: new Date('2022-04-18'),
    },
  });

  await prisma.medicalRecord.create({
    data: {
      patientId: aanyaProfile.id,
      doctorId: drRaoProfile.id,
      title: 'Endocrine Consultation & Dietary Counselling',
      recordType: 'CONSULTATION_NOTE',
      description: 'Review of self-monitored blood glucose log. Morning readings average 125-135 mg/dL. Nutritionist counselling provided regarding low glycemic index foods. Follow-up scheduled in 3 months.',
      severity: 'MILD',
      status: 'ACTIVE',
      addedByRole: 'DOCTOR',
      diagnosedDate: new Date('2025-09-15'),
      createdAt: new Date('2025-09-15'),
    },
  });

  await prisma.medicalRecord.create({
    data: {
      patientId: aanyaProfile.id,
      title: 'Comprehensive Metabolic Panel & Glycated Haemoglobin (HbA1c)',
      recordType: 'LAB_REPORT',
      description: 'Fictional demo laboratory findings: HbA1c: 7.4% (elevated), Fasting Blood Glucose: 138 mg/dL, Serum Creatinine: 0.8 mg/dL (normal), eGFR: >90 mL/min (normal).',
      severity: 'MODERATE',
      status: 'ACTIVE',
      fileUrl: '/docs/demo_aanya_hba1c_lab.pdf',
      addedByRole: 'PATIENT',
      diagnosedDate: new Date('2025-09-10'),
      createdAt: new Date('2025-09-10'),
    },
  });

  await prisma.prescription.create({
    data: {
      patientId: aanyaProfile.id,
      doctorId: drRaoProfile.id,
      medicationName: 'Metformin Hydrochloride Extended-Release 500mg',
      dosage: '1 tablet (500mg)',
      frequency: 'Twice daily with breakfast and dinner',
      duration: '90 days (refill x 2)',
      instructions: 'Swallow whole with food and a full glass of water. Do not crush or chew.',
      prescribedDate: new Date('2025-09-15'),
      status: 'ACTIVE',
    },
  });

  // Aanya completed past appointment + upcoming follow-up appointment
  await prisma.appointment.create({
    data: {
      patientId: p1User.id,
      doctorId: drRaoProfile.id,
      date: new Date('2025-09-15'),
      startTime: '10:00',
      endTime: '10:30',
      status: 'COMPLETED',
      consultationType: 'IN_PERSON',
      reasonForVisit: 'Diabetes quarterly metabolic review and medication refill',
      patientNotes: 'Experiencing mild morning fatigue, fasting glucose readings fluctuating around 130 mg/dL.',
      doctorNotes: 'Target HbA1c < 7.0%. Initiated Metformin ER 500mg BID. Scheduled repeat metabolic panel.',
    },
  });

  await prisma.appointment.create({
    data: {
      patientId: p1User.id,
      doctorId: drRaoProfile.id,
      date: new Date(Date.now() + 7 * 24 * 3600 * 1000), // Next week
      startTime: '11:00',
      endTime: '11:30',
      status: 'CONFIRMED',
      consultationType: 'IN_PERSON',
      reasonForVisit: 'Scheduled diabetes follow-up and dietary progress evaluation',
      patientNotes: 'Bringing 30-day glucometer reading logs.',
    },
  });

  // =========================================================================
  // 6. POPULATE PATIENT 2: ROHAN MEHTA (Asthma)
  // =========================================================================
  await prisma.medicalRecord.create({
    data: {
      patientId: rohanProfile.id,
      doctorId: drKhannaProfile.id,
      title: 'Moderate Persistent Bronchial Asthma',
      recordType: 'DIAGNOSIS',
      description: 'Clinical history of episodic expiratory wheezing, chest tightness, and nocturnal cough triggered by cold weather and pollen exposure. Prescribed maintenance and rescue inhalers.',
      severity: 'MODERATE',
      status: 'CHRONIC',
      addedByRole: 'DOCTOR',
      diagnosedDate: new Date('2024-03-20'),
      createdAt: new Date('2024-03-20'),
    },
  });

  await prisma.medicalRecord.create({
    data: {
      patientId: rohanProfile.id,
      title: 'Sulfonamide (Sulfa Drug) Allergy',
      recordType: 'ALLERGY',
      description: 'Developed widespread pruritic maculopapular rash following oral trimethoprim-sulfamethoxazole in 2020. Avoid all sulfa medications.',
      severity: 'MODERATE',
      status: 'ACTIVE',
      addedByRole: 'PATIENT',
      diagnosedDate: new Date('2020-07-14'),
      createdAt: new Date('2020-07-14'),
    },
  });

  await prisma.medicalRecord.create({
    data: {
      patientId: rohanProfile.id,
      title: 'Pulmonary Function Test (PFT) & Spirometry Report',
      recordType: 'LAB_REPORT',
      description: 'Fictional demo spirometry findings: Pre-bronchodilator FEV1: 74% predicted, FEV1/FVC: 68%. Post-bronchodilator improvement of 14% (+260 mL), demonstrating reversible airway obstruction.',
      severity: 'MODERATE',
      status: 'ACTIVE',
      fileUrl: '/docs/demo_rohan_spirometry_pft.pdf',
      addedByRole: 'PATIENT',
      diagnosedDate: new Date('2025-08-10'),
      createdAt: new Date('2025-08-10'),
    },
  });

  await prisma.medicalRecord.create({
    data: {
      patientId: rohanProfile.id,
      doctorId: drKhannaProfile.id,
      title: 'Respiratory Follow-Up & Inhaler Technique Review',
      recordType: 'CONSULTATION_NOTE',
      description: 'Patient reviewed on proper spacer device usage. Nocturnal symptoms reduced from 3x/week to zero on current budesonide-formoterol maintenance regimen. Asthma Action Plan updated.',
      severity: 'MILD',
      status: 'ACTIVE',
      addedByRole: 'DOCTOR',
      diagnosedDate: new Date('2025-08-15'),
      createdAt: new Date('2025-08-15'),
    },
  });

  await prisma.prescription.create({
    data: {
      patientId: rohanProfile.id,
      doctorId: drKhannaProfile.id,
      medicationName: 'Budesonide / Formoterol Fumarate Inhaler 160/4.5 mcg',
      dosage: '2 inhalations',
      frequency: 'Twice daily (morning and night)',
      duration: '60 days',
      instructions: 'Rinse mouth thoroughly with water after inhalation to prevent oral candidiasis.',
      prescribedDate: new Date('2025-08-15'),
      status: 'ACTIVE',
    },
  });

  await prisma.prescription.create({
    data: {
      patientId: rohanProfile.id,
      doctorId: drKhannaProfile.id,
      medicationName: 'Albuterol Sulfate HFA Inhaler 90 mcg',
      dosage: '1 to 2 puffs',
      frequency: 'Every 4 to 6 hours as needed for sudden shortness of breath or wheezing',
      duration: 'Ongoing rescue prescription',
      instructions: 'Carry at all times. Use 15 minutes before vigorous cardiovascular exercise.',
      prescribedDate: new Date('2025-08-15'),
      status: 'ACTIVE',
    },
  });

  await prisma.appointment.create({
    data: {
      patientId: p2User.id,
      doctorId: drKhannaProfile.id,
      date: new Date('2025-08-15'),
      startTime: '14:00',
      endTime: '14:30',
      status: 'COMPLETED',
      consultationType: 'IN_PERSON',
      reasonForVisit: 'Asthma symptom check and spirometry review',
      patientNotes: 'Waking up with occasional chest tightness during seasonal transitions.',
      doctorNotes: 'Good response to inhaled corticosteroid therapy. Spirometry demonstrates reversible obstruction.',
    },
  });

  await prisma.appointment.create({
    data: {
      patientId: p2User.id,
      doctorId: drKhannaProfile.id,
      date: new Date(Date.now() + 10 * 24 * 3600 * 1000),
      startTime: '15:30',
      endTime: '16:00',
      status: 'CONFIRMED',
      consultationType: 'IN_PERSON',
      reasonForVisit: 'Six-month respiratory follow-up and peak flow monitoring',
    },
  });

  // =========================================================================
  // 7. POPULATE PATIENT 3: PRIYA VERMA (PCOS)
  // =========================================================================
  await prisma.medicalRecord.create({
    data: {
      patientId: priyaProfile.id,
      doctorId: drKapoorProfile.id,
      title: 'Polycystic Ovary Syndrome (PCOS)',
      recordType: 'DIAGNOSIS',
      description: 'Diagnosed meeting Rotterdam diagnostic criteria: oligomenorrhea (cycle length 45-60 days), clinical hyperandrogenism (mild hirsutism), and bilateral polycystic morphology on pelvic ultrasound.',
      severity: 'MODERATE',
      status: 'CHRONIC',
      addedByRole: 'DOCTOR',
      diagnosedDate: new Date('2024-11-04'),
      createdAt: new Date('2024-11-04'),
    },
  });

  await prisma.medicalRecord.create({
    data: {
      patientId: priyaProfile.id,
      title: 'No Known Drug Allergies (NKDA)',
      recordType: 'ALLERGY',
      description: 'Patient has explicitly verified no adverse reactions or known hypersensitivities to medications, latex, or common food allergens.',
      severity: 'MILD',
      status: 'ACTIVE',
      addedByRole: 'PATIENT',
      diagnosedDate: new Date('2024-11-04'),
      createdAt: new Date('2024-11-04'),
    },
  });

  await prisma.medicalRecord.create({
    data: {
      patientId: priyaProfile.id,
      title: 'Pelvic Sonography & Reproductive Endocrine Panel',
      recordType: 'LAB_REPORT',
      description: 'Fictional demo ultrasound report: Multiple sub-centimeter peripheral follicles (>12 per ovary) with increased stroma. Serum LH: 12.4 mIU/mL, FSH: 5.2 mIU/mL (LH:FSH ratio > 2:1). Thyroid stimulating hormone (TSH) normal at 1.8 uIU/mL.',
      severity: 'MODERATE',
      status: 'ACTIVE',
      fileUrl: '/docs/demo_priya_pcos_sonogram.pdf',
      addedByRole: 'PATIENT',
      diagnosedDate: new Date('2025-07-20'),
      createdAt: new Date('2025-07-20'),
    },
  });

  await prisma.medicalRecord.create({
    data: {
      patientId: priyaProfile.id,
      doctorId: drKapoorProfile.id,
      title: 'PCOS Lifestyle & Cycle Regularity Consultation',
      recordType: 'CONSULTATION_NOTE',
      description: 'Discussed holistic management plan including insulin sensitizing inositol supplements, low glycemic nutritional strategy, and cycle tracking. Follow-up recommended in 3 to 6 months.',
      severity: 'MILD',
      status: 'ACTIVE',
      addedByRole: 'DOCTOR',
      diagnosedDate: new Date('2025-07-25'),
      createdAt: new Date('2025-07-25'),
    },
  });

  await prisma.prescription.create({
    data: {
      patientId: priyaProfile.id,
      doctorId: drKapoorProfile.id,
      medicationName: 'Myo-Inositol & D-Chiro Inositol (40:1 Ratio) 2000mg',
      dosage: '1 sachet / capsule (2000mg)',
      frequency: 'Twice daily dissolved in water before meals',
      duration: '90 days',
      instructions: 'Take consistently to support ovulatory regularity and metabolic equilibrium.',
      prescribedDate: new Date('2025-07-25'),
      status: 'ACTIVE',
    },
  });

  await prisma.appointment.create({
    data: {
      patientId: p3User.id,
      doctorId: drKapoorProfile.id,
      date: new Date('2025-07-25'),
      startTime: '11:00',
      endTime: '11:30',
      status: 'COMPLETED',
      consultationType: 'IN_PERSON',
      reasonForVisit: 'Irregular menstrual cycle evaluation and ultrasound review',
      patientNotes: 'Cycles delayed by 6 to 8 weeks, experiencing acne breakouts.',
      doctorNotes: 'Ultrasound confirms polycystic ovarian morphology. Commenced inositol regimen.',
    },
  });

  await prisma.appointment.create({
    data: {
      patientId: p3User.id,
      doctorId: drKapoorProfile.id,
      date: new Date(Date.now() + 14 * 24 * 3600 * 1000),
      startTime: '14:30',
      endTime: '15:00',
      status: 'CONFIRMED',
      consultationType: 'VIDEO',
      reasonForVisit: 'PCOS follow-up and menstrual regularity review',
    },
  });

  // =========================================================================
  // 8. POPULATE PATIENT 4: ARJUN KAPOOR (Migraine)
  // =========================================================================
  await prisma.medicalRecord.create({
    data: {
      patientId: arjunProfile.id,
      doctorId: drMalhotraProfile.id,
      title: 'Chronic Migraine with Visual Aura',
      recordType: 'DIAGNOSIS',
      description: 'Severe unilateral pulsating temporal headaches lasting 12-24 hours. Accompanied by scintillating scotoma, photophobia, phonophobia, and nausea. Identified triggers include sleep deprivation, skipped meals, and prolonged screen glare.',
      severity: 'SEVERE',
      status: 'CHRONIC',
      addedByRole: 'DOCTOR',
      diagnosedDate: new Date('2024-06-18'),
      createdAt: new Date('2024-06-18'),
    },
  });

  await prisma.medicalRecord.create({
    data: {
      patientId: arjunProfile.id,
      title: 'NSAID / Aspirin Hypersensitivity',
      recordType: 'ALLERGY',
      description: 'History of severe gastric irritation, dyspepsia, and acute bronchospasm following oral ibuprofen and aspirin. Avoid all non-steroidal anti-inflammatory drugs.',
      severity: 'SEVERE',
      status: 'ACTIVE',
      addedByRole: 'PATIENT',
      diagnosedDate: new Date('2021-02-11'),
      createdAt: new Date('2021-02-11'),
    },
  });

  await prisma.medicalRecord.create({
    data: {
      patientId: arjunProfile.id,
      title: 'Brain Magnetic Resonance Imaging (MRI) & MRA Scan',
      recordType: 'LAB_REPORT',
      description: 'Fictional demo neuroimaging report: High-resolution 3.0T Brain MRI without contrast. Normal intracranial parenchyma without acute infarction, hemorrhage, or mass effect. Intracranial vascular flow voids intact.',
      severity: 'MILD',
      status: 'ACTIVE',
      fileUrl: '/docs/demo_arjun_brain_mri.pdf',
      addedByRole: 'PATIENT',
      diagnosedDate: new Date('2025-06-02'),
      createdAt: new Date('2025-06-02'),
    },
  });

  await prisma.medicalRecord.create({
    data: {
      patientId: arjunProfile.id,
      doctorId: drMalhotraProfile.id,
      title: 'Neurological Assessment & Trigger Journal Review',
      recordType: 'CONSULTATION_NOTE',
      description: 'Headache frequency reduced from 6 episodes/month to 2/month on prophylactic Propranolol. Patient maintains a digital migraine trigger log. Advised on adequate hydration and blue-light filtering.',
      severity: 'MILD',
      status: 'ACTIVE',
      addedByRole: 'DOCTOR',
      diagnosedDate: new Date('2025-06-10'),
      createdAt: new Date('2025-06-10'),
    },
  });

  await prisma.prescription.create({
    data: {
      patientId: arjunProfile.id,
      doctorId: drMalhotraProfile.id,
      medicationName: 'Sumatriptan Succinate 50mg Tablets',
      dosage: '1 tablet (50mg)',
      frequency: 'At first sign of migraine aura or severe headache onset',
      duration: 'As needed (max 2 tablets per 24 hours)',
      instructions: 'Take promptly at onset. May repeat once after 2 hours if headache recurs. Contraindicated in ischemic heart disease.',
      prescribedDate: new Date('2025-06-10'),
      status: 'ACTIVE',
    },
  });

  await prisma.prescription.create({
    data: {
      patientId: arjunProfile.id,
      doctorId: drMalhotraProfile.id,
      medicationName: 'Propranolol Hydrochloride 40mg ER',
      dosage: '1 tablet (40mg)',
      frequency: 'Once daily in the morning',
      duration: '90 days (daily prophylaxis)',
      instructions: 'Do not discontinue abruptly. Monitor resting heart rate.',
      prescribedDate: new Date('2025-06-10'),
      status: 'ACTIVE',
    },
  });

  await prisma.appointment.create({
    data: {
      patientId: p4User.id,
      doctorId: drMalhotraProfile.id,
      date: new Date('2025-06-10'),
      startTime: '15:00',
      endTime: '15:30',
      status: 'COMPLETED',
      consultationType: 'IN_PERSON',
      reasonForVisit: 'Chronic migraine trigger evaluation and preventive therapy review',
      patientNotes: 'Intense throbbing left temple pain radiating to neck.',
      doctorNotes: 'Brain MRI clear. Initiated Propranolol prophylaxis and rescue Sumatriptan.',
    },
  });

  await prisma.appointment.create({
    data: {
      patientId: p4User.id,
      doctorId: drMalhotraProfile.id,
      date: new Date(Date.now() + 5 * 24 * 3600 * 1000),
      startTime: '10:30',
      endTime: '11:00',
      status: 'CONFIRMED',
      consultationType: 'IN_PERSON',
      reasonForVisit: 'Prophylactic medication review and headache frequency check',
    },
  });

  // =========================================================================
  // 9. POPULATE PATIENT 5: MEERA SINGH (Iron-Deficiency Anaemia)
  // =========================================================================
  await prisma.medicalRecord.create({
    data: {
      patientId: meeraProfile.id,
      doctorId: drSharmaProfile.id,
      title: 'Microcytic Hypochromic Iron-Deficiency Anaemia',
      recordType: 'DIAGNOSIS',
      description: 'Diagnosed with symptomatic iron deficiency anaemia presenting with generalized fatigue, exertional dyspnea, and conjunctival pallor. Confirmed by low serum ferritin (8 ng/mL) and haemoglobin (9.2 g/dL).',
      severity: 'MODERATE',
      status: 'ACTIVE',
      addedByRole: 'DOCTOR',
      diagnosedDate: new Date('2025-09-02'),
      createdAt: new Date('2025-09-02'),
    },
  });

  await prisma.medicalRecord.create({
    data: {
      patientId: meeraProfile.id,
      title: 'No Known Drug Allergies (NKDA)',
      recordType: 'ALLERGY',
      description: 'Confirmed negative for all antibiotic, analgesic, and food allergies during comprehensive medical intake.',
      severity: 'MILD',
      status: 'ACTIVE',
      addedByRole: 'PATIENT',
      diagnosedDate: new Date('2025-09-02'),
      createdAt: new Date('2025-09-02'),
    },
  });

  await prisma.medicalRecord.create({
    data: {
      patientId: meeraProfile.id,
      title: 'Complete Blood Count (CBC) & Iron Studies Panel',
      recordType: 'LAB_REPORT',
      description: 'Fictional demo haematology report: Haemoglobin: 9.2 g/dL (Low, ref: 12.0-15.5), Haematocrit: 29.1%, MCV: 72 fL (microcytic), MCH: 23 pg (hypochromic), Serum Ferritin: 8 ng/mL (Severe iron depletion, ref: 15-150), Total Iron Binding Capacity (TIBC): 440 ug/dL (Elevated).',
      severity: 'MODERATE',
      status: 'ACTIVE',
      fileUrl: '/docs/demo_meera_cbc_iron_studies.pdf',
      addedByRole: 'PATIENT',
      diagnosedDate: new Date('2025-09-01'),
      createdAt: new Date('2025-09-01'),
    },
  });

  await prisma.medicalRecord.create({
    data: {
      patientId: meeraProfile.id,
      doctorId: drSharmaProfile.id,
      title: 'Haematology Consultation & Nutritional Guidance',
      recordType: 'CONSULTATION_NOTE',
      description: 'Initiated oral iron supplementation with Ferrous Ascorbate and elemental iron. Instructed patient to take with vitamin C / citrus to maximize absorption and avoid dairy or tea within 2 hours. Repeat CBC ordered in 8 weeks.',
      severity: 'MILD',
      status: 'ACTIVE',
      addedByRole: 'DOCTOR',
      diagnosedDate: new Date('2025-09-05'),
      createdAt: new Date('2025-09-05'),
    },
  });

  await prisma.prescription.create({
    data: {
      patientId: meeraProfile.id,
      doctorId: drSharmaProfile.id,
      medicationName: 'Ferrous Ascorbate 100mg with Elemental Iron & Folic Acid',
      dosage: '1 tablet (100mg)',
      frequency: 'Once daily 1 hour before breakfast or 2 hours after food',
      duration: '60 days',
      instructions: 'Take with orange juice or water. Avoid taking with milk, tea, or antacids. Mild dark stool is expected and harmless.',
      prescribedDate: new Date('2025-09-05'),
      status: 'ACTIVE',
    },
  });

  await prisma.appointment.create({
    data: {
      patientId: p5User.id,
      doctorId: drSharmaProfile.id,
      date: new Date('2025-09-05'),
      startTime: '09:30',
      endTime: '10:00',
      status: 'COMPLETED',
      consultationType: 'IN_PERSON',
      reasonForVisit: 'Fatigue, dizziness, and low haemoglobin lab review',
      patientNotes: 'Feeling lightheaded when standing quickly, persistent lethargy.',
      doctorNotes: 'Microcytic hypochromic anaemia confirmed. Commenced oral iron therapy.',
    },
  });

  await prisma.appointment.create({
    data: {
      patientId: p5User.id,
      doctorId: drSharmaProfile.id,
      date: new Date(Date.now() + 8 * 24 * 3600 * 1000),
      startTime: '11:30',
      endTime: '12:00',
      status: 'CONFIRMED',
      consultationType: 'IN_PERSON',
      reasonForVisit: 'Follow-up consultation to evaluate haemoglobin response to iron therapy',
    },
  });

  console.log('✅ DocAvail Database successfully seeded with 5 Patient Accounts, 5 Doctor Accounts, and rich clinical data!');
  console.log('-------------------------------------------------------------------------------------------------');
  console.log('DEMO ACCOUNTS (Password for all accounts: password123)');
  console.log('PATIENT ACCOUNTS:');
  console.log('  1. Aanya Sharma (Type 2 Diabetes):      aanya.sharma@example.com');
  console.log('  2. Rohan Mehta (Asthma):                rohan.mehta@example.com');
  console.log('  3. Priya Verma (PCOS):                  priya.verma@example.com');
  console.log('  4. Arjun Kapoor (Migraine):             arjun.kapoor@example.com');
  console.log('  5. Meera Singh (Iron-Deficiency Anaemia): meera.singh@example.com');
  console.log('DOCTOR ACCOUNTS:');
  console.log('  1. Dr. Ananya Rao (Endocrinology):      dr.ananya.rao@docavail.com');
  console.log('  2. Dr. Rahul Khanna (Pulmonology):      dr.rahul.khanna@docavail.com');
  console.log('  3. Dr. Neha Kapoor (OB-GYN):            dr.neha.kapoor@docavail.com');
  console.log('  4. Dr. Arjun Malhotra (Neurology):      dr.arjun.malhotra@docavail.com');
  console.log('  5. Dr. Kavita Sharma (Internal Medicine): dr.kavita.sharma@docavail.com');
  console.log('ADMIN ACCOUNT:');
  console.log('  DocAvail Admin:                         admin@docavail.com');
  console.log('-------------------------------------------------------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
