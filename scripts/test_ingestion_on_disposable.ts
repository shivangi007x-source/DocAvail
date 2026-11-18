/**
 * DocAvail — Phase D Ingestion Validation & Testing Suite (Audited & Enhanced)
 * 
 * Strict Guarantees:
 * 1. Executes ONLY against RESTORE_TEST_DATABASE_URL (Asserts target is NOT production).
 * 2. Tests validation filters (rejection of invalid districts, out-of-bounds GPS, missing provenance).
 * 3. Tests false-positive merge prevention in dense hospital clusters (same district, different facility).
 * 4. Resets disposable facilities table to 0 before test run.
 * 5. Ingests 12 audited, source-verified sample facilities (6 Jammu, 6 Kashmir).
 * 6. Tests idempotency and duplicate detection: re-running ingestion must insert 0 and skip all 12.
 * 7. Tests quality-preserving enrichment: submitting candidate with newly verified coordinates enriches the record.
 * 8. Asserts 100% record parity for the original 89 baseline records.
 * 9. Strictly never touches production.
 */

import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import {
  ingestFacilities,
  validateFacilityRecord,
  RawFacilityInput,
} from '../src/lib/facilityIngestion';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const rawRestoreUrl = process.env.RESTORE_TEST_DATABASE_URL;
const prodUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!rawRestoreUrl || !prodUrl) {
  console.error('FATAL: Missing database URLs in .env');
  process.exit(1);
}

const testObj = new URL(rawRestoreUrl);
if (!testObj.searchParams.has('connect_timeout')) {
  testObj.searchParams.set('connect_timeout', '30');
}
if (!testObj.searchParams.has('pool_timeout')) {
  testObj.searchParams.set('pool_timeout', '30');
}
const restoreUrl = testObj.toString();
const prodObj = new URL(prodUrl);

if (testObj.hostname === prodObj.hostname) {
  console.error('FATAL SAFETY VIOLATION: Target matches production host! Aborting.');
  process.exit(1);
}

const sampleDataPath = path.join(__dirname, '..', 'src', 'data', 'sample_facilities.json');
const sampleRecords: RawFacilityInput[] = JSON.parse(fs.readFileSync(sampleDataPath, 'utf8'));

async function runDisposableIngestionTest() {
  console.log('================================================================');
  console.log('DocAvail — Stage 3 Disposable Ingestion & Validation Test');
  console.log('================================================================');
  console.log(`Disposable Target: ${testObj.hostname} / ${testObj.pathname}\n`);

  const client = new PrismaClient({
    datasources: { db: { url: restoreUrl } },
  });

  try {
    // Warm up connection for Neon serverless compute
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        await client.$connect();
        break;
      } catch (err: any) {
        if (attempt === 4) throw err;
        console.log(`Connecting to Neon serverless target (attempt ${attempt}/4)...`);
        await new Promise(r => setTimeout(r, 3000));
      }
    }
    // -------------------------------------------------------------------------
    // TEST 1: Validation Rules & Rejection Edge Cases
    // -------------------------------------------------------------------------
    console.log('[Test 1/7] Testing validation and rejection filters...');

    const invalidTestCases: Array<{ label: string; record: RawFacilityInput; expectedField: string }> = [
      {
        label: 'Invalid district outside J&K',
        record: {
          name: 'Non Existent Hospital',
          facilityType: 'HOSPITAL',
          district: 'Ludhiana', // Not in J&K!
          division: 'Jammu',
          address: 'GT Road',
          sourceReference: 'https://example.com',
          sourceAttribution: 'Test Attr',
        },
        expectedField: 'district',
      },
      {
        label: 'Division mismatch (Kathua assigned to Kashmir)',
        record: {
          name: 'Misplaced Clinic',
          facilityType: 'CLINIC',
          district: 'Kathua', // Belongs to Jammu!
          division: 'Kashmir',
          address: 'Kathua Town',
          sourceReference: 'https://example.com',
          sourceAttribution: 'Test Attr',
        },
        expectedField: 'division',
      },
      {
        label: 'Out-of-bounds coordinates (London coordinates)',
        record: {
          name: 'Foreign Coords Hospital',
          facilityType: 'HOSPITAL',
          district: 'Srinagar',
          division: 'Kashmir',
          address: 'Srinagar',
          latitude: 51.5074, // London!
          longitude: -0.1278,
          sourceReference: 'https://example.com',
          sourceAttribution: 'Test Attr',
        },
        expectedField: 'latitude',
      },
      {
        label: 'Missing mandatory provenance',
        record: {
          name: 'Unattributed Hospital',
          facilityType: 'HOSPITAL',
          district: 'Baramulla',
          division: 'Kashmir',
          address: 'Baramulla',
          sourceReference: '', // Missing!
          sourceAttribution: 'Test Attr',
        },
        expectedField: 'sourceReference',
      },
      {
        label: 'locationVerified true with NULL coordinates',
        record: {
          name: 'Inconsistent Flags Hospital',
          facilityType: 'HOSPITAL',
          district: 'Anantnag',
          division: 'Kashmir',
          address: 'Anantnag',
          latitude: null,
          longitude: null,
          locationVerified: true, // Inconsistent with null coordinates!
          sourceReference: 'https://example.com',
          sourceAttribution: 'Test Attr',
        },
        expectedField: 'locationVerified',
      },
    ];

    for (const tc of invalidTestCases) {
      const res = validateFacilityRecord(tc.record);
      if (res.isValid) {
        throw new Error(`Validation failed to reject invalid case: ${tc.label}`);
      }
      const matched = res.issues.some(i => i.field === tc.expectedField);
      if (!matched) {
        throw new Error(`Expected issue on field '${tc.expectedField}' for '${tc.label}', got: ${JSON.stringify(res.issues)}`);
      }
      console.log(` ✅ Correctly rejected: [${tc.label}] -> Issue on '${tc.expectedField}'`);
    }
    console.log('✅ All validation filter tests passed.\n');

    // -------------------------------------------------------------------------
    // TEST 2: Reset disposable facility table to clean initial state
    // -------------------------------------------------------------------------
    console.log('[Test 2/7] Resetting disposable HealthcareFacility table for clean benchmark...');
    await client.doctorFacilityAffiliation.deleteMany({});
    await client.healthcareFacility.deleteMany({});
    console.log('✅ Disposable facility tables cleaned.\n');

    // -------------------------------------------------------------------------
    // TEST 3: Pre-ingestion Baseline Check on Disposable DB
    // -------------------------------------------------------------------------
    console.log('[Test 3/7] Verifying pre-ingestion database state (Expected: 89 original records, 0 facilities)...');
    let preCount = 0;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        preCount = await client.user.count() +
          await client.patientProfile.count() +
          await client.doctorProfile.count() +
          await client.workingHours.count() +
          await client.appointment.count() +
          await client.medicalRecord.count() +
          await client.prescription.count() +
          await client.doctorPatientAccess.count() +
          await client.appointmentSlot.count() +
          await client.reportedAccount.count() +
          await client.review.count();
        break;
      } catch (err) {
        if (attempt < 3) {
          console.log(`Connection attempt ${attempt} waiting for compute resume...`);
          await new Promise(r => setTimeout(r, 3000));
        } else {
          throw err;
        }
      }
    }

    const initialFacilityCount = await client.healthcareFacility.count();
    console.log(`Original 11 tables total records: ${preCount} (Expected: 89)`);
    console.log(`HealthcareFacility initial count:  ${initialFacilityCount} (Expected: 0)`);
    if (preCount !== 89 || initialFacilityCount !== 0) {
      throw new Error('Disposable database is not in expected baseline state!');
    }
    console.log('✅ Baseline confirmed.\n');

    // -------------------------------------------------------------------------
    // TEST 4: Ingest Audited Sample Dataset (12 Facilities)
    // -------------------------------------------------------------------------
    console.log('[Test 4/7] Ingesting 12 source-verified sample facilities...');
    const report1 = await ingestFacilities(sampleRecords, client, {
      dryRun: false,
      targetName: 'Disposable Neon Target',
    });

    console.log('Ingestion Report #1:');
    console.log(` - Processed: ${report1.totalProcessed}`);
    console.log(` - Inserted:  ${report1.inserted}`);
    console.log(` - Updated:   ${report1.updated}`);
    console.log(` - Skipped:   ${report1.skipped}`);
    console.log(` - Rejected:  ${report1.rejected}`);

    if (report1.inserted !== 12 || report1.rejected !== 0) {
      throw new Error(`Expected 12 inserted and 0 rejected, got inserted=${report1.inserted}, rejected=${report1.rejected}`);
    }

    const postFacilityCount1 = await client.healthcareFacility.count();
    console.log(`Current HealthcareFacility count: ${postFacilityCount1} (Expected: 12)`);
    if (postFacilityCount1 !== 12) throw new Error('Facility count mismatch!');
    console.log('✅ Audited sample dataset cleanly ingested.\n');

    // -------------------------------------------------------------------------
    // TEST 5: False-Positive Merge Prevention in Dense Hospital Clusters
    // -------------------------------------------------------------------------
    console.log('[Test 5/7] Testing false-positive merge prevention in dense medical clusters...');
    // In Srinagar Karan Nagar, Government Dental College is within 150m of SMHS Hospital.
    // Ensure that Government Dental College Hospital is NOT merged into SMHS Hospital!
    const adjacentHospital: RawFacilityInput = {
      name: 'Government Dental College & Hospital Srinagar',
      facilityType: 'HOSPITAL',
      category: 'Public / Government',
      district: 'Srinagar',
      division: 'Kashmir',
      address: 'Karan Nagar, Shireen Bagh, Srinagar, Jammu and Kashmir',
      city: 'Srinagar',
      pincode: '190010',
      latitude: 34.0898, // ~140m from SMHS
      longitude: 74.8005,
      contactNumber: '0194-2504811',
      emergencyServices: true,
      operationalStatus: 'ACTIVE',
      operationalVerified: true,
      locationVerified: true,
      sourceVerified: true,
      sourceReference: 'https://srinagar.nic.in/hospitals/',
      sourceAttribution: 'Government Dental College Srinagar, J&K H&ME Department',
    };

    const falsePositiveReport = await ingestFacilities([adjacentHospital], client, {
      dryRun: false,
      targetName: 'Disposable Neon Target',
    });

    console.log('False-Positive Test Report:');
    console.log(` - Inserted: ${falsePositiveReport.inserted} (Must be 1, NOT skipped as duplicate!)`);
    console.log(` - Skipped:  ${falsePositiveReport.skipped} (Must be 0)`);

    if (falsePositiveReport.inserted !== 1 || falsePositiveReport.skipped !== 0) {
      throw new Error('FALSE-POSITIVE MERGE DETECTED! Government Dental College was wrongly merged with SMHS Hospital!');
    }
    console.log('✅ Confirmed: Distinct adjacent facilities in the same cluster are NOT falsely merged.\n');

    // Clean up the test adjacent hospital to maintain exactly 12 facilities
    await client.healthcareFacility.deleteMany({
      where: { name: 'Government Dental College & Hospital Srinagar' },
    });

    // -------------------------------------------------------------------------
    // TEST 6: Idempotency & Duplicate Re-run Check
    // -------------------------------------------------------------------------
    console.log('[Test 6/7] Testing idempotency: Re-running ingestion of the exact same 12 records...');
    const report2 = await ingestFacilities(sampleRecords, client, {
      dryRun: false,
      targetName: 'Disposable Neon Target',
    });

    console.log('Ingestion Report #2 (Idempotency Re-run):');
    console.log(` - Processed: ${report2.totalProcessed}`);
    console.log(` - Inserted:  ${report2.inserted}`);
    console.log(` - Updated:   ${report2.updated}`);
    console.log(` - Skipped:   ${report2.skipped}`);
    console.log(` - Rejected:  ${report2.rejected}`);

    if (report2.inserted !== 0 || report2.skipped !== 12) {
      throw new Error(`Idempotency failure! Expected 0 inserted and 12 skipped, got inserted=${report2.inserted}, skipped=${report2.skipped}`);
    }

    const postFacilityCount2 = await client.healthcareFacility.count();
    console.log(`Post re-run HealthcareFacility count: ${postFacilityCount2} (Expected: 12)`);
    if (postFacilityCount2 !== 12) throw new Error('Duplicate facilities were created!');
    console.log('✅ Idempotency confirmed: 0 duplicates created, all 12 duplicate records safely skipped.\n');

    // -------------------------------------------------------------------------
    // TEST 7: Quality-Preserving Enrichment & Monotonicity Test
    // -------------------------------------------------------------------------
    console.log('[Test 7/7] Testing quality-preserving enrichment and monotonicity...');
    // Part A: Higher-quality candidate enriches SDH Akhnoor with verified coordinates
    const enrichmentRecord: RawFacilityInput = {
      name: 'Sub-District Hospital Akhnoor',
      facilityType: 'CHC',
      category: 'Public / Government',
      district: 'Jammu',
      division: 'Jammu',
      address: 'Akhnoor, Jammu, Jammu and Kashmir',
      city: 'Akhnoor',
      pincode: '181201',
      latitude: 32.8969, // Simulated post-survey GPS coordinates for disposable test only
      longitude: 74.7355,
      locationVerified: true,
      operationalStatus: 'ACTIVE',
      operationalVerified: true,
      sourceVerified: true,
      sourceReference: 'https://dhsjammu.jk.gov.in/pdf/hsffgddfd.pdf',
      sourceAttribution: 'Directorate of Health Services Jammu (Disposable Test Enrichment)',
    };

    const report3 = await ingestFacilities([enrichmentRecord], client, {
      dryRun: false,
      targetName: 'Disposable Neon Target',
    });

    console.log('Ingestion Report #3 (Enrichment):');
    console.log(` - Inserted: ${report3.inserted}`);
    console.log(` - Updated:  ${report3.updated}`);
    console.log(` - Skipped:  ${report3.skipped}`);

    if (report3.updated !== 1) {
      throw new Error(`Enrichment failed! Expected 1 updated, got ${report3.updated}`);
    }

    const updatedAkhnoor = await client.healthcareFacility.findFirst({
      where: { district: 'Jammu', name: { contains: 'Akhnoor' } },
    });
    if (updatedAkhnoor?.latitude !== 32.8969 || updatedAkhnoor?.locationVerified !== true) {
      throw new Error('Enrichment coordinates were not updated properly!');
    }
    console.log(' ✅ Quality-preserving enrichment confirmed (missing coordinates added).');

    // Part B: Lower-quality candidate must NOT overwrite verified coordinates with null or unverified status
    const lowerQualityRecord: RawFacilityInput = {
      name: 'Sub-District Hospital Akhnoor',
      facilityType: 'CHC',
      district: 'Jammu',
      division: 'Jammu',
      address: 'Akhnoor, Jammu',
      latitude: null, // Attempting to downgrade coordinates
      longitude: null,
      locationVerified: false,
      operationalStatus: 'UNKNOWN', // Attempting to downgrade status
      operationalVerified: false,
      sourceVerified: false,
      sourceReference: 'https://example.com/unverified',
      sourceAttribution: 'Unverified Blog',
    };

    const report4 = await ingestFacilities([lowerQualityRecord], client, {
      dryRun: false,
      targetName: 'Disposable Neon Target',
    });

    if (report4.updated !== 0 || report4.skipped !== 1) {
      throw new Error('MONOTONICITY VIOLATION: Lower-quality candidate was allowed to modify verified record!');
    }

    const checkAkhnoorAgain = await client.healthcareFacility.findFirst({
      where: { district: 'Jammu', name: { contains: 'Akhnoor' } },
    });
    if (checkAkhnoorAgain?.latitude !== 32.8969 || checkAkhnoorAgain?.locationVerified !== true) {
      throw new Error('CRITICAL BUG: Verified coordinates were destroyed by unverified candidate!');
    }
    console.log(' ✅ Monotonicity confirmed: Lower-quality candidate was safely rejected/skipped.\n');

    // -------------------------------------------------------------------------
    // Final Baseline Integrity Audit (89 records intact)
    // -------------------------------------------------------------------------
    console.log('Performing final baseline integrity audit across all 11 original tables...');
    const postBaselineCount = await client.user.count() +
      await client.patientProfile.count() +
      await client.doctorProfile.count() +
      await client.workingHours.count() +
      await client.appointment.count() +
      await client.medicalRecord.count() +
      await client.prescription.count() +
      await client.doctorPatientAccess.count() +
      await client.appointmentSlot.count() +
      await client.reportedAccount.count() +
      await client.review.count();

    console.log(`Original 11 tables post-test records: ${postBaselineCount} (Expected: 89)`);
    if (postBaselineCount !== 89) {
      throw new Error(`Data loss detected in original tables! Count: ${postBaselineCount}`);
    }
    console.log('✅ All 89 original records remain 100% intact.\n');

    console.log('================================================================');
    console.log('🎉 ALL STAGE 3 AUDITED TESTS PASSED ON DISPOSABLE TARGET');
    console.log('Validation Filters:      5 / 5 edge cases correctly rejected');
    console.log('Sample Import:           12 / 12 facilities cleanly inserted');
    console.log('False-Positive Check:    Adjacent hospital in same cluster NOT merged');
    console.log('Idempotent Re-Run:       0 duplicates, 12 / 12 skipped');
    console.log('Monotonic Enrichment:    Verified (upgrades allowed, downgrades blocked)');
    console.log('Original Baseline:       89 / 89 records intact');
    console.log('================================================================\n');

  } finally {
    await client.$disconnect();
  }
}

runDisposableIngestionTest().catch(err => {
  console.error('\n❌ DISPOSABLE INGESTION TEST FAILED:');
  console.error(err);
  process.exit(1);
});
