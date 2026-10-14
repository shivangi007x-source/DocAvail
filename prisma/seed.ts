import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding DocAvail database with DEMO data...');

  // Clean existing data in order of dependencies
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
  const admin = await prisma.user.create({
    data: {
      email: 'admin@docavail.com',
      passwordHash,
      role: 'ADMIN',
      name: 'DocAvail Admin (DEMO)',
    },
  });

  // 2. Create Sample Patients (DEMO)
  const patient1 = await prisma.user.create({
    data: {
      email: 'patient.alex@example.com',
      passwordHash,
      role: 'PATIENT',
      name: 'Alex Morgan (DEMO Patient)',
      patientProfile: {
        create: {
          phone: '+1 555-0192',
          location: 'New York, NY',
        },
      },
    },
  });

  const patient2 = await prisma.user.create({
    data: {
      email: 'patient.emily@example.com',
      passwordHash,
      role: 'PATIENT',
      name: 'Emily Watson (DEMO Patient)',
      patientProfile: {
        create: {
          phone: '+1 555-0843',
          location: 'Chicago, IL',
        },
      },
    },
  });

  // 3. Create Sample Doctors with DoctorProfile (APPROVED and PENDING verification status)

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
      availabilityStatus: 'AVAILABLE',
      statusNote: 'Accepting walk-ins & immediate online slot requests',
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
      availabilityStatus: 'BUSY',
      statusNote: 'Currently in patient consultation. Next open slot at 3:30 PM',
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
      availabilityStatus: 'AVAILABLE',
      statusNote: 'On-site today until 6:00 PM',
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

  const doctor4Profile = await prisma.doctorProfile.create({
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
      availabilityStatus: 'UNAVAILABLE',
      statusNote: 'Awaiting admin credential verification',
      rating: 5.0,
      reviewCount: 0,
    },
  });

  // 4. Create Working Hours for Approved Doctors
  const days = [1, 2, 3, 4, 5]; // Mon - Fri
  for (const day of days) {
    await prisma.workingHours.create({
      data: {
        doctorId: doctor1Profile.id,
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '17:00',
        isActive: true,
      },
    });

    await prisma.workingHours.create({
      data: {
        doctorId: doctor2Profile.id,
        dayOfWeek: day,
        startTime: '08:30',
        endTime: '16:30',
        isActive: true,
      },
    });

    await prisma.workingHours.create({
      data: {
        doctorId: doctor3Profile.id,
        dayOfWeek: day,
        startTime: '10:00',
        endTime: '18:00',
        isActive: true,
      },
    });
  }

  console.log('✅ DocAvail Database successfully seeded!');
  console.log('----------------------------------------------------');
  console.log('DEMO ACCOUNTS (Password for all: password123):');
  console.log(`- Admin: admin@docavail.com`);
  console.log(`- Approved Doctor: dr.jenkins@docavail.com`);
  console.log(`- Pending Doctor: dr.pending@docavail.com`);
  console.log(`- Patient 1: patient.alex@example.com`);
  console.log(`- Patient 2: patient.emily@example.com`);
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
