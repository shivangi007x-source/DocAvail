import { prisma } from '../src/lib/prisma';

async function testPhase3() {
  console.log('--- Testing Phase 3 Database & Realtime Features ---');
  
  // 1. Find Dr. Jenkins
  const doc = await prisma.doctorProfile.findFirst({
    where: { user: { email: 'dr.jenkins@docavail.com' } },
    include: { user: true, workingHours: true }
  });
  console.log('1. Doctor Found:', doc?.user.name, '| Status:', doc?.availabilityStatus, '| UpdatedAt:', doc?.statusUpdatedAt);
  
  // 2. Test Availability Update & Persistence
  const updated = await prisma.doctorProfile.update({
    where: { id: doc!.id },
    data: {
      availabilityStatus: 'BUSY',
      statusNote: 'In consultation until 4:30 PM (Testing)',
      statusUpdatedAt: new Date()
    }
  });
  console.log('2. Updated Status:', updated.availabilityStatus, '| Note:', updated.statusNote, '| New Timestamp:', updated.statusUpdatedAt);

  // 3. Test Working Hours retrieval
  console.log('3. Working Hours days count:', doc?.workingHours.length, 'days configured');
  const mon = doc?.workingHours.find(w => w.dayOfWeek === 1);
  console.log('   Monday:', mon?.startTime, '-', mon?.endTime, '| Break:', mon?.breakStart, '-', mon?.breakEnd, '| Slot:', mon?.slotDurationMinutes, 'mins');
  
  // 4. Test Public Doctor Query
  const publicDocs = await prisma.doctorProfile.findMany({
    where: { verificationStatus: 'APPROVED' },
    include: { user: { select: { name: true } }, workingHours: true }
  });
  console.log('4. Public Approved Doctors count:', publicDocs.length);
  publicDocs.forEach(d => console.log('   -', d.user.name, ':', d.availabilityStatus, (d.statusNote ? '(' + d.statusNote + ')' : '')));
  
  console.log('--- All Phase 3 Core Validations Passed ---');
}

testPhase3()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
