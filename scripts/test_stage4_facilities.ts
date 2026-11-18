/**
 * DocAvail — Stage 4 Healthcare Facility Verification & Service Test Suite
 *
 * Covers:
 * - Search and filters (name, division, district, facilityType, operationalStatus, validation errors)
 * - Pagination (pages, boundaries, limit clamping, out-of-range pages)
 * - Missing coordinates and contact information (null-safe handling)
 * - Expired operational evidence & missing expiry date enforcement
 * - Truthful OSM non-government coordinate labelling & emergency capability vs availability
 * - Unverified and partially verified facilities
 * - Empty database results (both empty query and empty table)
 *
 * Safety: Executes ONLY against RESTORE_TEST_DATABASE_URL (asserts host !== production).
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { ingestFacilities, RawFacilityInput } from '../src/lib/facilityIngestion';
import {
  evaluateFacilityVerification,
  RawFacilityRecordLike,
  resolveUiOperationalState,
} from '../src/lib/facilityVerification';
import {
  FacilityQueryValidationError,
  getFacilityById,
  queryFacilities,
} from '../src/lib/facilityService';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const rawRestoreUrl = process.env.RESTORE_TEST_DATABASE_URL;
const rawProdUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!rawRestoreUrl || !rawProdUrl) {
  console.error('FATAL: Missing database URLs in .env');
  process.exit(1);
}

const restoreObj = new URL(rawRestoreUrl);
if (!restoreObj.searchParams.has('connect_timeout')) restoreObj.searchParams.set('connect_timeout', '30');
if (!restoreObj.searchParams.has('pool_timeout')) restoreObj.searchParams.set('pool_timeout', '30');
const restoreUrl = restoreObj.toString();
const prodObj = new URL(rawProdUrl);

if (restoreObj.hostname === prodObj.hostname) {
  console.error('FATAL SAFETY VIOLATION: Target matches production host! Aborting.');
  process.exit(1);
}

const samplePath = path.join(__dirname, '..', 'src', 'data', 'sample_facilities.json');
const sampleRecords: RawFacilityInput[] = JSON.parse(fs.readFileSync(samplePath, 'utf8'));

async function main() {
  console.log('================================================================');
  console.log('DocAvail — Stage 4 Service, Verification & Disposable DB Tests');
  console.log('================================================================');
  console.log(`Disposable Target: ${restoreObj.hostname} (${restoreObj.pathname})\n`);

  const client = new PrismaClient({
    datasources: { db: { url: restoreUrl } },
  });

  try {
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        await client.$connect();
        break;
      } catch (err) {
        if (attempt === 4) throw err;
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    // -------------------------------------------------------------------------
    // TEST 1: Pure Verification Logic (OSM non-gov, Emergency, Expiry Enforcement)
    // -------------------------------------------------------------------------
    console.log('[Test 1/7] Verifying truthful verification & expiry enforcement rules...');
    const nowMidNov = new Date('2026-11-18T12:00:00Z');
    const afterKathuaExpiry = new Date('2026-12-29T12:00:00Z');

    // 1a. Record with missing expiry date even if raw operationalVerified = true
    const missingExpiryMock: RawFacilityRecordLike = {
      id: 'mock-missing-expiry',
      name: 'Test Missing Expiry Hospital',
      facilityType: 'HOSPITAL',
      category: 'Public / Government',
      district: 'Jammu',
      division: 'Jammu',
      tehsil: null,
      address: 'Test Address',
      city: 'Jammu',
      pincode: null,
      latitude: 32.72,
      longitude: 74.85,
      contactNumber: null,
      email: null,
      emergencyServices: null,
      operationalStatus: 'ACTIVE',
      operationalVerified: true,
      locationVerified: true,
      sourceVerified: true,
      sourceReference: 'https://jammu.nic.in/public-utility-category/hospitals/',
      sourceAttribution: 'District Administration Jammu & OpenStreetMap contributors',
      metadata: { osmObjectRef: 'https://www.openstreetmap.org/node/1', governmentGisVerified: false },
      createdAt: nowMidNov,
      updatedAt: nowMidNov,
    };
    const missingEval = evaluateFacilityVerification(missingExpiryMock, nowMidNov);
    assert.strictEqual(missingEval.operationalVerified, false, 'Missing expiry date must not be presented as verified');
    assert.strictEqual(missingEval.effectiveOperationalStatus, 'UNKNOWN');
    assert.strictEqual(missingEval.governmentGisVerified, false, 'OSM coordinate must never be marked gov verified');
    assert.strictEqual(missingEval.coordinateSourceTier, 'COMMUNITY_SOURCED_OSM');
    assert.ok(missingEval.locationLabel.includes('Not Government Verified'));

    // 1b. Record with operationalVerified=true & ACTIVE in DB, but expired expiry date
    const expiredActiveMock: RawFacilityRecordLike = {
      ...missingExpiryMock,
      id: 'mock-expired-active',
      metadata: {
        operationalReportingPeriod: 'Q1 2026',
        operationalVerificationExpiresAt: '2026-06-30',
        operationalReviewPeriodDays: 180,
      },
    };
    const expiredEval = evaluateFacilityVerification(expiredActiveMock, nowMidNov);
    assert.strictEqual(expiredEval.operationalVerified, false);
    assert.strictEqual(expiredEval.operationalFreshness, 'EXPIRED');
    assert.strictEqual(expiredEval.effectiveOperationalStatus, 'UNKNOWN');
    assert.ok(expiredEval.operationalLabel.includes('Expired'));
    const expiredUiState = resolveUiOperationalState(expiredEval, nowMidNov);
    assert.strictEqual(expiredUiState.isCurrentlyVerified, false);
    assert.strictEqual(expiredUiState.freshness, 'EXPIRED');

    // Verify no internal/private fields exist on API DTOs
    const serializedCheck = JSON.stringify(await queryFacilities(client, { limit: 1 }, nowMidNov));
    for (const forbidden of ['rawOperationalVerified', 'rawOperationalStatus', 'unverifiedFields', 'passwordHash', 'licenseNumber', 'patientProfile']) {
      assert.ok(!serializedCheck.includes(forbidden), `Public API must not expose '${forbidden}'`);
    }

    // 1c. Partially verified / unverified record
    const unverifiedMock: RawFacilityRecordLike = {
      ...missingExpiryMock,
      id: 'mock-unverified',
      latitude: null,
      longitude: null,
      locationVerified: false,
      sourceVerified: false,
      operationalVerified: false,
      operationalStatus: 'UNKNOWN',
      emergencyServices: true,
      metadata: {},
    };
    const unverifiedEval = evaluateFacilityVerification(unverifiedMock, nowMidNov);
    assert.strictEqual(unverifiedEval.sourceVerified, false);
    assert.strictEqual(unverifiedEval.locationVerified, false);
    assert.strictEqual(unverifiedEval.coordinateSourceTier, 'UNVERIFIED');
    assert.strictEqual(unverifiedEval.emergencyCapabilityStatus, 'DOCUMENTED');
    assert.ok(unverifiedEval.emergencyAvailabilityDisclaimer.includes('NOT monitored live'));
    console.log(' ✅ Verification, OSM labelling, emergency disclaimer, and expiry unit checks passed.\n');

    // -------------------------------------------------------------------------
    // TEST 2: Empty Database Results
    // -------------------------------------------------------------------------
    console.log('[Test 2/7] Testing empty HealthcareFacility table handling...');
    await client.doctorFacilityAffiliation.deleteMany({});
    await client.healthcareFacility.deleteMany({});

    const emptyResult = await queryFacilities(client, { page: 1, limit: 12 }, nowMidNov);
    assert.strictEqual(emptyResult.facilities.length, 0);
    assert.strictEqual(emptyResult.pagination.total, 0);
    assert.strictEqual(emptyResult.pagination.totalPages, 0);
    assert.strictEqual(emptyResult.pagination.hasNextPage, false);
    assert.strictEqual(emptyResult.pagination.hasPrevPage, false);
    console.log(' ✅ Empty database results handled cleanly without errors.\n');

    // -------------------------------------------------------------------------
    // TEST 3: Populate Disposable DB with Audited 12 Sample Records
    // -------------------------------------------------------------------------
    console.log('[Test 3/7] Seeding disposable DB with 12 audited facilities...');
    const seedReport = await ingestFacilities(sampleRecords, client, {
      dryRun: false,
      targetName: 'Disposable Stage 4 Target',
    });
    assert.strictEqual(seedReport.inserted, 12);
    console.log(' ✅ 12 facilities seeded on disposable target.\n');

    // -------------------------------------------------------------------------
    // TEST 4: Search & Filters + Validation Error Handling
    // -------------------------------------------------------------------------
    console.log('[Test 4/7] Testing search, division/district/type/status filters & validation...');
    const smhsSearch = await queryFacilities(client, { search: 'SMHS' }, nowMidNov);
    assert.strictEqual(smhsSearch.pagination.total, 1);
    assert.strictEqual(smhsSearch.facilities[0].district, 'Srinagar');
    assert.strictEqual(smhsSearch.facilities[0].verification.operationalFreshness, 'EXPIRED');
    assert.strictEqual(smhsSearch.facilities[0].verification.operationalVerified, false);

    const jammuRes = await queryFacilities(client, { division: 'jammu' }, nowMidNov);
    assert.strictEqual(jammuRes.pagination.total, 6);

    const kashmirChcRes = await queryFacilities(
      client,
      { division: 'Kashmir', facilityType: 'CHC' },
      nowMidNov
    );
    assert.strictEqual(kashmirChcRes.pagination.total, 2); // Tangmarg & Hazratbal

    const activeBeforeExpiry = await queryFacilities(
      client,
      { operationalStatus: 'ACTIVE' },
      nowMidNov
    );
    assert.strictEqual(activeBeforeExpiry.pagination.total, 1); // Only GMC Kathua valid on 2026-11-18
    assert.ok(activeBeforeExpiry.facilities[0].name.includes('Kathua'));

    // Check dynamic expiry enforcement past 2026-12-27!
    const activeAfterExpiry = await queryFacilities(
      client,
      { operationalStatus: 'ACTIVE' },
      afterKathuaExpiry
    );
    assert.strictEqual(activeAfterExpiry.pagination.total, 0, 'Expired Kathua must drop out of ACTIVE filter');

    const noMatchSearch = await queryFacilities(client, { search: 'NonExistentHospitalXYZ' }, nowMidNov);
    assert.strictEqual(noMatchSearch.facilities.length, 0);
    assert.strictEqual(noMatchSearch.pagination.total, 0);

    await assert.rejects(
      () => queryFacilities(client, { division: 'Mars' }),
      FacilityQueryValidationError
    );
    await assert.rejects(
      () => queryFacilities(client, { facilityType: 'INVALID_TYPE' }),
      FacilityQueryValidationError
    );
    await assert.rejects(
      () => queryFacilities(client, { operationalStatus: 'BAD_STATUS' }),
      FacilityQueryValidationError
    );
    console.log(' ✅ Search, filters, dynamic expiry filtering, and invalid enum rejection passed.\n');

    // -------------------------------------------------------------------------
    // TEST 5: Pagination & Limit Clamping
    // -------------------------------------------------------------------------
    console.log('[Test 5/7] Testing pagination and limit clamping...');
    const p1 = await queryFacilities(client, { page: '1', limit: '5' }, nowMidNov);
    assert.strictEqual(p1.facilities.length, 5);
    assert.strictEqual(p1.pagination.total, 12);
    assert.strictEqual(p1.pagination.totalPages, 3);
    assert.strictEqual(p1.pagination.hasNextPage, true);
    assert.strictEqual(p1.pagination.hasPrevPage, false);

    const p2 = await queryFacilities(client, { page: '2', limit: '5' }, nowMidNov);
    assert.strictEqual(p2.facilities.length, 5);
    assert.strictEqual(p2.pagination.hasNextPage, true);
    assert.strictEqual(p2.pagination.hasPrevPage, true);

    const p3 = await queryFacilities(client, { page: '3', limit: '5' }, nowMidNov);
    assert.strictEqual(p3.facilities.length, 2);
    assert.strictEqual(p3.pagination.hasNextPage, false);
    assert.strictEqual(p3.pagination.hasPrevPage, true);

    const pOverflow = await queryFacilities(client, { page: '99', limit: '5' }, nowMidNov);
    assert.strictEqual(pOverflow.facilities.length, 0);
    assert.strictEqual(pOverflow.pagination.hasNextPage, false);

    const clampedLimit = await queryFacilities(client, { page: '-2', limit: '999' }, nowMidNov);
    assert.strictEqual(clampedLimit.pagination.page, 1);
    assert.strictEqual(clampedLimit.pagination.limit, 50);
    console.log(' ✅ Pagination boundaries and clamping passed.\n');

    // -------------------------------------------------------------------------
    // TEST 6: Missing Coordinates, Missing Contacts, & Facility Detail Lookup
    // -------------------------------------------------------------------------
    console.log('[Test 6/7] Testing null coordinates/contacts & detail lookup by ID...');
    const baramullaList = await queryFacilities(client, { search: 'Baramulla' }, nowMidNov);
    const baramullaSummary = baramullaList.facilities.find((f) => f.name.includes('Medical College'));
    assert.ok(baramullaSummary, 'GMC Baramulla should be present');
    assert.strictEqual(baramullaSummary.latitude, null);
    assert.strictEqual(baramullaSummary.longitude, null);
    assert.strictEqual(baramullaSummary.mapLinks, null);
    assert.strictEqual(baramullaSummary.contactNumber, null);
    assert.strictEqual(baramullaSummary.email, null);
    assert.strictEqual(baramullaSummary.verification.locationVerified, false);

    const detail = await getFacilityById(client, baramullaSummary.id, nowMidNov);
    assert.ok(detail);
    assert.strictEqual(detail.id, baramullaSummary.id);
    assert.deepStrictEqual(detail.affiliatedDoctors, []);

    const missingDetail = await getFacilityById(client, '00000000-0000-0000-0000-000000000000', nowMidNov);
    assert.strictEqual(missingDetail, null);
    console.log(' ✅ Null fields and facility detail retrieval verified.\n');

    // -------------------------------------------------------------------------
    // TEST 7: Partially Verified Record on Disposable DB (Expiry & Non-Gov Check)
    // -------------------------------------------------------------------------
    console.log('[Test 7/7] Verifying dynamic DB query against an expired ACTIVE test record...');
    const tempRow = await client.healthcareFacility.create({
      data: {
        name: 'Disposable Test Expiry Clinic',
        facilityType: 'CLINIC',
        category: 'Public / Government',
        district: 'Samba',
        division: 'Jammu',
        address: 'Main Samba Road',
        latitude: null,
        longitude: null,
        contactNumber: null,
        email: null,
        emergencyServices: null,
        operationalStatus: 'ACTIVE', // Intentionally ACTIVE with expired metadata!
        operationalVerified: true,
        locationVerified: false,
        sourceVerified: false,
        sourceReference: 'https://samba.nic.in/',
        sourceAttribution: 'Disposable Test Fixture',
        metadata: {
          operationalReportingPeriod: 'Jan 2026',
          operationalVerificationExpiresAt: '2026-07-01', // Expired relative to 2026-11-18
          operationalReviewPeriodDays: 180,
        },
      },
    });

    const fetchedExpired = await getFacilityById(client, tempRow.id, nowMidNov);
    assert.ok(fetchedExpired);
    assert.strictEqual(fetchedExpired.operationalStatus, 'UNKNOWN');
    assert.strictEqual(fetchedExpired.verification.operationalVerified, false);
    assert.strictEqual(fetchedExpired.verification.operationalFreshness, 'EXPIRED');
    assert.strictEqual(fetchedExpired.verification.sourceVerified, false);
    assert.strictEqual(fetchedExpired.verification.locationVerified, false);

    // Clean up temporary test row from disposable DB
    await client.healthcareFacility.delete({ where: { id: tempRow.id } });
    console.log(' ✅ Expired ACTIVE DB row truthfully downgraded to UNKNOWN/unverified.\n');

    console.log('================================================================');
    console.log('🎉 ALL STAGE 4 SERVICE & DISPOSABLE DB TESTS PASSED (7/7)');
    console.log('================================================================');
  } finally {
    await client.$disconnect();
  }
}

main().catch((err) => {
  console.error('\n❌ STAGE 4 TEST FAILED:', err);
  process.exit(1);
});
