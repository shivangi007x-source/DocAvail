/**
 * DocAvail - Comprehensive Stage 2 Disposable Migration & Integrity Test
 * 
 * Strict Guarantees:
 * 1. Strictly asserts RESTORE_TEST_DATABASE_URL is NOT production.
 * 2. Verifies pre-migration baseline (89 records, 11 tables).
 * 3. Applies the revised migration SQL from prisma/migrations/20261117_add_healthcare_facility/migration.sql.
 * 4. Verifies post-migration baseline (89 records, 11 tables intact).
 * 5. Verifies existing doctor profiles have null geographic defaults.
 * 6. Verifies 18 foreign keys in pg_constraint catalog.
 * 7. Tests ON DELETE CASCADE behaviour thoroughly in both directions:
 *    - Deleting HealthcareFacility cascades to DoctorFacilityAffiliation, leaving DoctorProfile intact.
 *    - Deleting DoctorProfile cascades to DoctorFacilityAffiliation, leaving HealthcareFacility intact.
 * 8. Tests nullable coordinates and JSONB metadata insertion & roundtrip.
 * 9. Leaves database in clean post-migration state (89 original records, 0 facilities, 0 affiliations).
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const restoreUrl = process.env.RESTORE_TEST_DATABASE_URL;
const prodUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!restoreUrl || !prodUrl) {
  console.error('FATAL: Missing database URLs in .env');
  process.exit(1);
}

const testObj = new URL(restoreUrl);
const prodObj = new URL(prodUrl);

if (testObj.hostname === prodObj.hostname) {
  console.error('FATAL SAFETY VIOLATION: Target matches production host! Aborting.');
  process.exit(1);
}

const migrationSqlPath = path.join(
  __dirname,
  '..',
  'prisma',
  'migrations',
  '20261117_add_healthcare_facility',
  'migration.sql'
);
if (!fs.existsSync(migrationSqlPath)) {
  console.error(`FATAL: Migration file not found at ${migrationSqlPath}`);
  process.exit(1);
}
const migrationSql = fs.readFileSync(migrationSqlPath, 'utf8');

const EXPECTED_FOREIGN_KEYS_POST_MIGRATION = [
  { name: 'PatientProfile_userId_fkey', srcTbl: 'PatientProfile', srcCol: 'userId', refTbl: 'User', refCol: 'id' },
  { name: 'DoctorProfile_userId_fkey', srcTbl: 'DoctorProfile', srcCol: 'userId', refTbl: 'User', refCol: 'id' },
  { name: 'MedicalRecord_patientId_fkey', srcTbl: 'MedicalRecord', srcCol: 'patientId', refTbl: 'PatientProfile', refCol: 'id' },
  { name: 'MedicalRecord_doctorId_fkey', srcTbl: 'MedicalRecord', srcCol: 'doctorId', refTbl: 'DoctorProfile', refCol: 'id' },
  { name: 'Prescription_patientId_fkey', srcTbl: 'Prescription', srcCol: 'patientId', refTbl: 'PatientProfile', refCol: 'id' },
  { name: 'Prescription_doctorId_fkey', srcTbl: 'Prescription', srcCol: 'doctorId', refTbl: 'DoctorProfile', refCol: 'id' },
  { name: 'DoctorPatientAccess_patientId_fkey', srcTbl: 'DoctorPatientAccess', srcCol: 'patientId', refTbl: 'PatientProfile', refCol: 'id' },
  { name: 'DoctorPatientAccess_doctorId_fkey', srcTbl: 'DoctorPatientAccess', srcCol: 'doctorId', refTbl: 'DoctorProfile', refCol: 'id' },
  { name: 'WorkingHours_doctorId_fkey', srcTbl: 'WorkingHours', srcCol: 'doctorId', refTbl: 'DoctorProfile', refCol: 'id' },
  { name: 'AppointmentSlot_doctorId_fkey', srcTbl: 'AppointmentSlot', srcCol: 'doctorId', refTbl: 'DoctorProfile', refCol: 'id' },
  { name: 'Appointment_patientId_fkey', srcTbl: 'Appointment', srcCol: 'patientId', refTbl: 'User', refCol: 'id' },
  { name: 'Appointment_doctorId_fkey', srcTbl: 'Appointment', srcCol: 'doctorId', refTbl: 'DoctorProfile', refCol: 'id' },
  { name: 'ReportedAccount_reporterId_fkey', srcTbl: 'ReportedAccount', srcCol: 'reporterId', refTbl: 'User', refCol: 'id' },
  { name: 'ReportedAccount_reportedUserId_fkey', srcTbl: 'ReportedAccount', srcCol: 'reportedUserId', refTbl: 'User', refCol: 'id' },
  { name: 'Review_patientId_fkey', srcTbl: 'Review', srcCol: 'patientId', refTbl: 'User', refCol: 'id' },
  { name: 'Review_doctorId_fkey', srcTbl: 'Review', srcCol: 'doctorId', refTbl: 'DoctorProfile', refCol: 'id' },
  { name: 'DoctorFacilityAffiliation_doctorId_fkey', srcTbl: 'DoctorFacilityAffiliation', srcCol: 'doctorId', refTbl: 'DoctorProfile', refCol: 'id' },
  { name: 'DoctorFacilityAffiliation_facilityId_fkey', srcTbl: 'DoctorFacilityAffiliation', srcCol: 'facilityId', refTbl: 'HealthcareFacility', refCol: 'id' },
];

async function verifyAllForeignKeys(client) {
  const query = `
    SELECT
        c.conname AS constraint_name,
        src_ns.nspname AS constraint_schema,
        src_tbl.relname AS source_table,
        src_col.attname AS source_column,
        ref_tbl.relname AS referenced_table,
        ref_col.attname AS referenced_column,
        c.contype AS constraint_type,
        c.convalidated AS is_validated,
        k.ord AS column_ordinal
    FROM pg_constraint c
    JOIN pg_class src_tbl ON c.conrelid = src_tbl.oid
    JOIN pg_namespace src_ns ON src_tbl.relnamespace = src_ns.oid
    JOIN pg_class ref_tbl ON c.confrelid = ref_tbl.oid
    CROSS JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord)
    CROSS JOIN LATERAL unnest(c.confkey) WITH ORDINALITY AS fk(attnum, ord)
    JOIN pg_attribute src_col ON src_col.attrelid = c.conrelid AND src_col.attnum = k.attnum
    JOIN pg_attribute ref_col ON ref_col.attrelid = c.confrelid AND ref_col.attnum = fk.attnum
    WHERE c.contype = 'f'
      AND k.ord = fk.ord
      AND src_ns.nspname = 'public';
  `;

  const rows = await client.$queryRawUnsafe(query);
  const discoveredMap = new Map();
  for (const r of rows) {
    if (!discoveredMap.has(r.constraint_name)) discoveredMap.set(r.constraint_name, []);
    discoveredMap.get(r.constraint_name).push(r);
  }

  const expectedMap = new Map();
  for (const exp of EXPECTED_FOREIGN_KEYS_POST_MIGRATION) expectedMap.set(exp.name, exp);

  const discrepancies = [];

  for (const [name, exp] of expectedMap.entries()) {
    if (!discoveredMap.has(name)) {
      discrepancies.push(`MISSING CONSTRAINT: '${name}' (${exp.srcTbl}.${exp.srcCol} -> ${exp.refTbl}.${exp.refCol})`);
    }
  }

  for (const [name, rowList] of discoveredMap.entries()) {
    if (!expectedMap.has(name)) {
      discrepancies.push(`UNEXPECTED CONSTRAINT: '${name}' on table '${rowList[0].source_table}'`);
    }
  }

  for (const [name, exp] of expectedMap.entries()) {
    const rowList = discoveredMap.get(name);
    if (!rowList) continue;
    for (const act of rowList) {
      if (act.constraint_type !== 'f') discrepancies.push(`INVALID CONSTRAINT TYPE: '${name}'`);
      if (!act.is_validated) discrepancies.push(`UNVALIDATED CONSTRAINT: '${name}'`);
      if (act.source_table !== exp.srcTbl) discrepancies.push(`TABLE MISMATCH on '${name}': source '${act.source_table}', expected '${exp.srcTbl}'`);
      if (act.referenced_table !== exp.refTbl) discrepancies.push(`TABLE MISMATCH on '${name}': referenced '${act.referenced_table}', expected '${exp.refTbl}'`);
      if (act.source_column !== exp.srcCol) discrepancies.push(`COLUMN MISMATCH on '${name}': source '${act.source_column}', expected '${exp.srcCol}'`);
      if (act.referenced_column !== exp.refCol) discrepancies.push(`COLUMN MISMATCH on '${name}': referenced '${act.referenced_column}', expected '${exp.refCol}'`);
    }
  }

  if (discoveredMap.size !== expectedMap.size) {
    discrepancies.push(`COUNT MISMATCH: Discovered ${discoveredMap.size} constraints, expected ${expectedMap.size}.`);
  }

  if (discrepancies.length > 0) {
    throw new Error(`Foreign-key catalog verification failed:\n - ${discrepancies.join('\n - ')}`);
  }

  return discoveredMap.size;
}

async function runStage2DisposableValidation() {
  console.log('================================================================');
  console.log('DocAvail — Stage 2 Disposable Migration & Integrity Validation');
  console.log('================================================================\n');

  console.log(`Target database: ${testObj.hostname} (Confirmed NOT production)`);
  const client = new PrismaClient({ datasources: { db: { url: restoreUrl } } });

  try {
    // Step 1: Pre-migration verification
    console.log('\n[1/8] Verifying pre-migration database baseline (Expected: 89 records across 11 tables)...');
    const preCounts = {
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
    const preTotal = Object.values(preCounts).reduce((a, b) => a + b, 0);
    console.log(`Pre-migration total records: ${preTotal} (Match: ${preTotal === 89})`);
    if (preTotal !== 89) throw new Error(`Pre-migration count mismatch: ${preTotal}`);
    console.log('✅ Pre-migration baseline verified.');

    // Step 2: Apply migration SQL
    console.log('\n[2/8] Applying revised migration SQL to disposable database...');
    const statements = migrationSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const preview = stmt.replace(/\s+/g, ' ').slice(0, 70);
      console.log(` [SQL ${i + 1}/${statements.length}] ${preview}...`);
      await client.$executeRawUnsafe(stmt);
    }
    console.log('✅ All migration SQL statements applied successfully.');

    // Step 3: Post-migration count parity
    console.log('\n[3/8] Verifying post-migration record preservation across all 11 original tables...');
    const postCounts = {
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
    const postTotal = Object.values(postCounts).reduce((a, b) => a + b, 0);
    console.log(`Post-migration total records in original 11 tables: ${postTotal} (Match: ${postTotal === 89})`);
    if (postTotal !== 89) throw new Error('Post-migration count mismatch in original tables!');

    for (const [tbl, count] of Object.entries(preCounts)) {
      if (postCounts[tbl] !== count) {
        throw new Error(`Record count mismatch in table ${tbl}: pre=${count}, post=${postCounts[tbl]}`);
      }
    }
    console.log('✅ 100% record parity preserved: All 89 records intact across all 11 original tables.');

    // Step 4: Verify DoctorProfile nullable geographic columns
    console.log('\n[4/8] Auditing existing DoctorProfile records for clean null defaults...');
    const existingDoctors = await client.doctorProfile.findMany();
    if (existingDoctors.length !== 5) {
      throw new Error(`Expected 5 existing doctors, found ${existingDoctors.length}`);
    }
    for (const doc of existingDoctors) {
      console.log(`Doctor ID: ${doc.id} | district: ${doc.district} | division: ${doc.division} | lat: ${doc.latitude} | lng: ${doc.longitude}`);
      if (doc.district !== null || doc.division !== null || doc.latitude !== null || doc.longitude !== null) {
        throw new Error(`Doctor ${doc.id} has unexpected non-null values in new columns!`);
      }
    }
    console.log('✅ All 5 existing doctor profiles verified with clean NULL geographic defaults.');

    // Step 5: Verify new tables are accessible and initially empty
    console.log('\n[5/8] Verifying new tables exist and are initially empty...');
    const initialFacilityCount = await client.healthcareFacility.count();
    const initialAffiliationCount = await client.doctorFacilityAffiliation.count();
    console.log(`HealthcareFacility initial count: ${initialFacilityCount}`);
    console.log(`DoctorFacilityAffiliation initial count: ${initialAffiliationCount}`);
    if (initialFacilityCount !== 0 || initialAffiliationCount !== 0) {
      throw new Error('New tables are not empty!');
    }
    console.log('✅ Both new tables exist and are empty.');

    // Step 6: Verify all 18 foreign keys in pg_constraint catalog
    console.log('\n[6/8] Auditing PostgreSQL catalog pg_constraint for all 18 foreign keys...');
    const fkCount = await verifyAllForeignKeys(client);
    console.log(`✅ All ${fkCount} foreign-key constraints verified in pg_constraint (16 original + 2 new).`);

    // Step 7: Comprehensive ON DELETE CASCADE Behavior & Nullable Coordinates / JSONB Test
    console.log('\n[7/8] Executing live functional test of ON DELETE CASCADE & JSONB metadata...');

    // 7A: Nullable coordinates + JSONB test
    console.log(' [Test 7A] Testing HealthcareFacility with NULL coordinates & structured JSONB metadata...');
    const facilityWithNullCoords = await client.healthcareFacility.create({
      data: {
        name: 'Community Health Centre Ganderbal (Pending Geocoding)',
        facilityType: 'CHC',
        category: 'Public / Government',
        district: 'Ganderbal',
        division: 'Kashmir',
        tehsil: 'Ganderbal',
        address: 'Main Town Ganderbal',
        city: 'Ganderbal',
        pincode: '191201',
        latitude: null, // Nullable coordinate support verified!
        longitude: null, // Nullable coordinate support verified!
        contactNumber: '0194-2416000',
        emergencyServices: true,
        operationalStatus: 'ACTIVE',
        operationalVerified: true,
        locationVerified: false,
        sourceVerified: true,
        sourceReference: 'NHM Jammu & Kashmir Directory 2024, Page 42',
        sourceAttribution: 'National Health Mission, Department of Health and Medical Education, J&K',
        metadata: {
          bedCapacity: 50,
          specialties: ['General Medicine', 'Pediatrics', 'Obstetrics & Gynecology'],
          facilities: ['X-Ray', '24x7 Ambulance', 'Emergency Ward'],
        },
      },
    });
    console.log(` Created facility ${facilityWithNullCoords.id} with NULL coordinates.`);
    if (facilityWithNullCoords.latitude !== null || facilityWithNullCoords.longitude !== null) {
      throw new Error('Failed to persist null coordinates!');
    }
    if (!facilityWithNullCoords.metadata || facilityWithNullCoords.metadata.bedCapacity !== 50) {
      throw new Error('Failed to persist or deserialize JSONB metadata!');
    }
    console.log(' ✅ Nullable coordinates and native JSONB metadata successfully verified.');

    // 7B: Facility deletion cascades to affiliation, leaving DoctorProfile untouched
    console.log('\n [Test 7B] Testing ON DELETE CASCADE: Facility Deletion -> Affiliation deletion...');
    const targetDoctor = existingDoctors[0];
    const testAffiliation1 = await client.doctorFacilityAffiliation.create({
      data: {
        doctorId: targetDoctor.id,
        facilityId: facilityWithNullCoords.id,
        role: 'Visiting Consultant',
        isPrimary: false,
        consultationFee: 300.0,
        visitingSchedule: 'Mon, Wed 10:00 - 14:00',
      },
    });
    console.log(` Created affiliation ${testAffiliation1.id} linking doctor ${targetDoctor.id} to facility ${facilityWithNullCoords.id}.`);

    let affilCheck1 = await client.doctorFacilityAffiliation.findUnique({
      where: { id: testAffiliation1.id },
    });
    if (!affilCheck1) throw new Error('Affiliation record creation failed.');

    console.log(` Deleting HealthcareFacility ${facilityWithNullCoords.id}...`);
    await client.healthcareFacility.delete({
      where: { id: facilityWithNullCoords.id },
    });

    affilCheck1 = await client.doctorFacilityAffiliation.findUnique({
      where: { id: testAffiliation1.id },
    });
    if (affilCheck1 !== null) {
      throw new Error('CASCADE FAILURE: Affiliation was NOT deleted when facility was deleted!');
    }
    console.log(' ✅ CASCADE CONFIRMED: Affiliation was automatically deleted on facility deletion.');

    const doctorCheck1 = await client.doctorProfile.findUnique({
      where: { id: targetDoctor.id },
    });
    if (!doctorCheck1) {
      throw new Error('FATAL CASCADE SIDE-EFFECT: DoctorProfile was deleted when facility was deleted!');
    }
    console.log(` ✅ TARGET DOCTOR PRESERVED: DoctorProfile ${targetDoctor.id} remains intact.`);

    // 7C: Doctor deletion cascades to affiliation, leaving HealthcareFacility untouched
    console.log('\n [Test 7C] Testing ON DELETE CASCADE: Doctor Deletion -> Affiliation deletion...');
    // Create an isolated temporary user and doctor to test doctor deletion cascade without modifying original doctors
    const tempUser = await client.user.create({
      data: {
        email: `test_cascade_temp_${Date.now()}@docavail.test`,
        passwordHash: 'dummy_hash_for_test',
        name: 'Temporary Cascade Test Doctor',
        role: 'DOCTOR',
      },
    });
    const tempDoctor = await client.doctorProfile.create({
      data: {
        userId: tempUser.id,
        specialization: 'Emergency Medicine',
        qualification: 'MBBS, MD',
        experience: 5,
        licenseNumber: `TEMP-LIC-${Date.now()}`,
        clinicName: 'Temporary Test Clinic',
        clinicAddress: 'Batwara, Srinagar',
        city: 'Srinagar',
        district: 'Srinagar',
        division: 'Kashmir',
        latitude: 34.07,
        longitude: 74.83,
      },
    });

    const persistentFacility = await client.healthcareFacility.create({
      data: {
        name: 'Associated Hospital GMC Baramulla (Test Facility)',
        facilityType: 'HOSPITAL',
        category: 'Public / Government',
        district: 'Baramulla',
        division: 'Kashmir',
        address: 'Kanthbagh, Baramulla',
        city: 'Baramulla',
        pincode: '193101',
        latitude: 34.2056,
        longitude: 74.3499,
        emergencyServices: true,
        operationalStatus: 'ACTIVE',
        operationalVerified: true,
        locationVerified: true,
        sourceVerified: true,
        sourceReference: 'PM-JAY AB-HWC Empanelled List 2024, Serial #18',
        sourceAttribution: 'State Health Agency (SHA), J&K',
        metadata: { totalBeds: 300, icuBeds: 20 },
      },
    });

    const testAffiliation2 = await client.doctorFacilityAffiliation.create({
      data: {
        doctorId: tempDoctor.id,
        facilityId: persistentFacility.id,
        role: 'Chief Medical Officer',
        isPrimary: true,
      },
    });
    console.log(` Created affiliation ${testAffiliation2.id} linking temp doctor ${tempDoctor.id} to facility ${persistentFacility.id}.`);

    console.log(` Deleting temporary User & DoctorProfile ${tempDoctor.id}...`);
    // Deleting User cascades to DoctorProfile, which should cascade to DoctorFacilityAffiliation
    await client.user.delete({
      where: { id: tempUser.id },
    });

    const affilCheck2 = await client.doctorFacilityAffiliation.findUnique({
      where: { id: testAffiliation2.id },
    });
    if (affilCheck2 !== null) {
      throw new Error('CASCADE FAILURE: Affiliation was NOT deleted when doctor was deleted!');
    }
    console.log(' ✅ CASCADE CONFIRMED: Affiliation was automatically deleted on doctor deletion.');

    const facilityCheck2 = await client.healthcareFacility.findUnique({
      where: { id: persistentFacility.id },
    });
    if (!facilityCheck2) {
      throw new Error('FATAL CASCADE SIDE-EFFECT: HealthcareFacility was deleted when doctor was deleted!');
    }
    console.log(` ✅ FACILITY PRESERVED: HealthcareFacility ${persistentFacility.id} remains intact.`);

    // Clean up persistent facility
    await client.healthcareFacility.delete({
      where: { id: persistentFacility.id },
    });
    console.log(' ✅ Temporary test records cleanly removed.');

    // Step 8: Final state sanity check
    console.log('\n[8/8] Performing final state sanity check...');
    const finalCounts = {
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
      HealthcareFacility: await client.healthcareFacility.count(),
      DoctorFacilityAffiliation: await client.doctorFacilityAffiliation.count(),
    };
    const finalOriginalTotal = Object.entries(finalCounts)
      .filter(([k]) => k !== 'HealthcareFacility' && k !== 'DoctorFacilityAffiliation')
      .reduce((sum, [, c]) => sum + c, 0);

    console.log(`Final total records across original 11 tables: ${finalOriginalTotal} (Expected: 89)`);
    console.log(`Final HealthcareFacility records: ${finalCounts.HealthcareFacility} (Expected: 0)`);
    console.log(`Final DoctorFacilityAffiliation records: ${finalCounts.DoctorFacilityAffiliation} (Expected: 0)`);

    if (finalOriginalTotal !== 89) {
      throw new Error(`Final count mismatch: ${finalOriginalTotal} != 89`);
    }
    if (finalCounts.HealthcareFacility !== 0 || finalCounts.DoctorFacilityAffiliation !== 0) {
      throw new Error('Test tables still contain test records!');
    }

    console.log('\n================================================================');
    console.log('🎉 ALL STAGE 2 MIGRATION AND INTEGRITY TESTS PASSED ON DISPOSABLE TARGET');
    console.log('Original Records:          89 / 89 (100% intact across all 11 tables)');
    console.log('New Tables Created:        HealthcareFacility, DoctorFacilityAffiliation');
    console.log('Foreign-Key Constraints:   18 / 18 verified in pg_constraint catalog');
    console.log('CASCADE Deletion:          Verified in both directions (no side effects)');
    console.log('Nullable Coordinates:     Verified (lat/lng null supported)');
    console.log('JSONB Metadata:            Verified (native JSONB serialization/deserialization)');
    console.log('================================================================\n');

  } finally {
    await client.$disconnect();
  }
}

runStage2DisposableValidation().catch((err) => {
  console.error('\n❌ STAGE 2 VALIDATION FAILED:');
  console.error(err);
  process.exit(1);
});
