/**
 * DocAvail — Stage 3 Approved Production Healthcare Facility Ingestion
 *
 * Preconditions Verified:
 * - Stage 1 Verified Backup intact
 * - Stage 2 Prisma Migrations deployed and baselined
 * - Stage 3 Evidence Manifest & Sample Dataset audited (24/24 URLs HTTP 200 OK; 12/12 parity)
 * - Explicit user approval received ("APPROVED")
 *
 * Guarantees:
 * - Only inserts verified facilities into HealthcareFacility from src/data/sample_facilities.json.
 * - Never writes to DoctorFacilityAffiliation, DoctorProfile, User, PatientProfile, or other baseline tables.
 * - Executes a dryRun check before committing inserts.
 * - Verifies post-ingestion table counts and idempotency without exposing credentials or PII.
 */

import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { ingestFacilities, RawFacilityInput } from '../src/lib/facilityIngestion';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const rawProdUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
const rawRestoreUrl = process.env.RESTORE_TEST_DATABASE_URL;

if (!rawProdUrl) {
  console.error('FATAL: Production DIRECT_URL / DATABASE_URL not found in .env');
  process.exit(1);
}

const prodObj = new URL(rawProdUrl);
if (!prodObj.searchParams.has('connect_timeout')) {
  prodObj.searchParams.set('connect_timeout', '30');
}
if (!prodObj.searchParams.has('pool_timeout')) {
  prodObj.searchParams.set('pool_timeout', '30');
}
const prodUrl = prodObj.toString();

if (rawRestoreUrl) {
  const restoreObj = new URL(rawRestoreUrl);
  if (prodObj.hostname === restoreObj.hostname) {
    console.error('FATAL: Production URL hostname matches disposable restore target. Aborting.');
    process.exit(1);
  }
}

const samplePath = path.join(__dirname, '..', 'src', 'data', 'sample_facilities.json');
const sampleRecords: RawFacilityInput[] = JSON.parse(fs.readFileSync(samplePath, 'utf8'));

async function getBaselineCounts(client: PrismaClient) {
  const counts = {
    User: await client.user.count(),
    PatientProfile: await client.patientProfile.count(),
    DoctorProfile: await client.doctorProfile.count(),
    WorkingHours: await client.workingHours.count(),
    Appointment: await client.appointment.count(),
    MedicalRecord: await client.medicalRecord.count(),
    Prescription: await client.prescription.count(),
    DoctorPatientAccess: await client.doctorPatientAccess.count(),
    AppointmentSlot: await client.appointmentSlot.count(),
    ReportedAccount: await client.reportedAccount.count(),
    Review: await client.review.count(),
  };
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  return { counts, total };
}

async function main() {
  console.log('================================================================');
  console.log('DocAvail — Stage 3 Approved Production Facility Ingestion');
  console.log('================================================================');
  console.log(`Target Host: ${prodObj.hostname} (${prodObj.pathname})`);
  console.log(`Source Dataset: src/data/sample_facilities.json (${sampleRecords.length} records)\n`);

  const client = new PrismaClient({
    datasources: { db: { url: prodUrl } },
  });

  try {
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        await client.$connect();
        break;
      } catch (err) {
        if (attempt === 4) throw err;
        console.log(`Waiting for Neon serverless compute wake-up (attempt ${attempt}/4)...`);
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    // 1. Pre-ingestion parity check
    const preBaseline = await getBaselineCounts(client);
    const preFacilities = await client.healthcareFacility.count();
    const preAffiliations = await client.doctorFacilityAffiliation.count();

    console.log('[1/4] Pre-Ingestion Production State:');
    console.log(` - Baseline 11 tables total : ${preBaseline.total}`);
    console.log(` - HealthcareFacility       : ${preFacilities}`);
    console.log(` - DoctorFacilityAffiliation: ${preAffiliations}\n`);

    if (preFacilities !== 0) {
      throw new Error(`Expected 0 pre-existing HealthcareFacility records, found ${preFacilities}. Aborting to avoid unintended overwrite.`);
    }

    // 2. Dry Run Validation
    console.log('[2/4] Executing Dry-Run Validation...');
    const dryRunReport = await ingestFacilities(sampleRecords, client, {
      dryRun: true,
      targetName: 'Production Neon (DRY RUN)',
    });
    console.log(` - Processed: ${dryRunReport.totalProcessed}, Would Insert: ${dryRunReport.inserted}, Rejected: ${dryRunReport.rejected}`);
    if (dryRunReport.rejected > 0 || dryRunReport.inserted !== 12) {
      console.error('Dry-run rejections:', JSON.stringify(dryRunReport.rejections, null, 2));
      throw new Error('Dry-run validation failed; aborting production write.');
    }
    console.log(' ✅ Dry-run validation passed (12/12 valid, 0 rejected).\n');

    // 3. Execute Production Ingestion
    console.log('[3/4] Applying Approved Facility Ingestion to Production...');
    const liveReport = await ingestFacilities(sampleRecords, client, {
      dryRun: false,
      targetName: 'Production Neon',
    });
    console.log(` - Processed: ${liveReport.totalProcessed}`);
    console.log(` - Inserted : ${liveReport.inserted}`);
    console.log(` - Updated  : ${liveReport.updated}`);
    console.log(` - Skipped  : ${liveReport.skipped}`);
    console.log(` - Rejected : ${liveReport.rejected}\n`);

    // 4. Post-Ingestion Verification & Idempotency Check
    console.log('[4/4] Verifying Post-Ingestion Integrity & Idempotency...');
    const idempotencyReport = await ingestFacilities(sampleRecords, client, {
      dryRun: false,
      targetName: 'Production Neon (Idempotency Check)',
    });

    const postBaseline = await getBaselineCounts(client);
    const postFacilities = await client.healthcareFacility.findMany({
      orderBy: [{ division: 'asc' }, { district: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        facilityType: true,
        district: true,
        division: true,
        sourceVerified: true,
        locationVerified: true,
        operationalVerified: true,
        operationalStatus: true,
        emergencyServices: true,
        latitude: true,
        longitude: true,
      },
    });
    const postAffiliations = await client.doctorFacilityAffiliation.count();

    if (postFacilities.length !== 12) {
      throw new Error(`Expected 12 HealthcareFacility rows after ingestion, found ${postFacilities.length}`);
    }
    if (postAffiliations !== 0) {
      throw new Error(`Expected 0 DoctorFacilityAffiliation rows, found ${postAffiliations}`);
    }
    if (idempotencyReport.skipped !== 12 || idempotencyReport.inserted !== 0 || idempotencyReport.updated !== 0) {
      throw new Error(`Idempotency check mismatch: ${JSON.stringify(idempotencyReport)}`);
    }
    if (postBaseline.total !== preBaseline.total) {
      throw new Error(`Baseline count changed! Before=${preBaseline.total}, After=${postBaseline.total}`);
    }

    console.log(` ✅ Post-ingestion HealthcareFacility count     : ${postFacilities.length}`);
    console.log(` ✅ Post-ingestion DoctorFacilityAffiliation   : ${postAffiliations}`);
    console.log(` ✅ Idempotency verification (re-run)          : ${idempotencyReport.skipped}/12 skipped, 0 inserted`);
    console.log(` ✅ Baseline 11 tables unchanged               : ${postBaseline.total}/${preBaseline.total}\n`);

    console.log('Inserted Production Facilities:');
    for (const f of postFacilities) {
      console.log(
        ` - [${f.division.padEnd(7)} | ${f.district.padEnd(9)} | ${f.facilityType.padEnd(8)}] ${f.name} | src=${f.sourceVerified} loc=${f.locationVerified} op=${f.operationalVerified} (${f.operationalStatus}) emg=${f.emergencyServices}`
      );
    }

    console.log('\n================================================================');
    console.log('PRODUCTION FACILITY INGESTION COMPLETED CLEANLY');
    console.log('================================================================');
  } finally {
    await client.$disconnect();
  }
}

main().catch(err => {
  console.error('\n❌ PRODUCTION INGESTION FAILED:', err);
  process.exit(1);
});
