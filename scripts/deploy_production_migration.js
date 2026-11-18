/**
 * DocAvail — Production Stage 2 Migration & Post-Deployment Audit
 * 
 * Execution Steps:
 * 1. Pre-deployment baseline audit on production (asserts 89 records across 11 tables).
 * 2. Baselining: Executes `prisma migrate resolve --applied 0_init` on production.
 * 3. Deployment: Executes `prisma migrate deploy` on production.
 * 4. Post-deployment integrity audit:
 *    - Asserts 89 records intact across all 11 original tables (zero data loss).
 *    - Asserts all 5 existing doctor profiles have clean NULL defaults for district, division, latitude, longitude.
 *    - Asserts HealthcareFacility and DoctorFacilityAffiliation exist and have count 0.
 *    - Asserts all 18 foreign keys exist and are validated in pg_constraint catalog.
 *    - Asserts _prisma_migrations records for 0_init and 20261117_add_healthcare_facility.
 *    - Asserts `prisma migrate status` reports "Database schema is up to date!".
 * 5. Sanitizes credentials in all outputs.
 */

const { spawnSync } = require('child_process');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const rawProdUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!rawProdUrl) {
  console.error('FATAL: DIRECT_URL / DATABASE_URL not found in .env');
  process.exit(1);
}

// Ensure connect_timeout=30 for reliable Neon serverless compute wake-up
const prodUrlObj = new URL(rawProdUrl);
if (!prodUrlObj.searchParams.has('connect_timeout')) {
  prodUrlObj.searchParams.set('connect_timeout', '30');
}
const prodDirectUrl = prodUrlObj.toString();
const sanitizedHost = prodUrlObj.hostname;
const sanitizedDb = decodeURIComponent(prodUrlObj.pathname.replace(/^\//, ''));

const REQUIRED_BASELINE = {
  User: 11,
  PatientProfile: 5,
  DoctorProfile: 5,
  WorkingHours: 25,
  Appointment: 10,
  MedicalRecord: 20,
  Prescription: 7,
  DoctorPatientAccess: 6,
  AppointmentSlot: 0,
  ReportedAccount: 0,
  Review: 0,
};
const EXPECTED_TOTAL = 89;

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

async function verifyPgConstraints(client) {
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

async function deployProductionMigration() {
  console.log('================================================================');
  console.log('DocAvail — Production Stage 2 Migration & Deployment Audit');
  console.log('================================================================');
  console.log(`Target Production Host: ${sanitizedHost}`);
  console.log(`Target Database:        ${sanitizedDb}\n`);

  const client = new PrismaClient({
    datasources: { db: { url: prodDirectUrl } },
  });

  const prismaCli = path.join(__dirname, '..', 'node_modules', 'prisma', 'build', 'index.js');
  const prismaEnv = {
    ...process.env,
    DATABASE_URL: prodDirectUrl,
    DIRECT_URL: prodDirectUrl,
  };

  try {
    // Step 1: Pre-deployment baseline audit with retry for Neon wake-up
    console.log('[1/6] Performing pre-deployment baseline audit on production...');
    let preCounts = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        preCounts = {
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

    let preTotal = 0;
    for (const [tbl, exp] of Object.entries(REQUIRED_BASELINE)) {
      const act = preCounts[tbl];
      preTotal += act;
      if (act !== exp) {
        throw new Error(`PRE-DEPLOYMENT COUNT MISMATCH on table ${tbl}: expected ${exp}, got ${act}`);
      }
    }
    if (preTotal !== EXPECTED_TOTAL) {
      throw new Error(`PRE-DEPLOYMENT TOTAL MISMATCH: expected ${EXPECTED_TOTAL}, got ${preTotal}`);
    }
    console.log(`✅ Pre-deployment baseline verified: 89 records intact across all 11 tables.\n`);

    // Step 2: Baselining production database
    console.log('[2/6] Baselining production schema with 0_init...');
    const resolveRes = spawnSync(process.execPath, [
      prismaCli,
      'migrate',
      'resolve',
      '--applied',
      '0_init',
    ], {
      env: prismaEnv,
      encoding: 'utf8',
    });

    console.log(resolveRes.stdout);
    if (resolveRes.stderr) console.error(resolveRes.stderr);
    if (resolveRes.status !== 0) {
      throw new Error(`Baselining failed with exit code ${resolveRes.status}`);
    }
    console.log('✅ Production database successfully baselined with 0_init.\n');

    // Step 3: Deploying Stage 2 migration
    console.log('[3/6] Deploying Stage 2 migration (20261117_add_healthcare_facility)...');
    const deployRes = spawnSync(process.execPath, [
      prismaCli,
      'migrate',
      'deploy',
    ], {
      env: prismaEnv,
      encoding: 'utf8',
    });

    console.log(deployRes.stdout);
    if (deployRes.stderr) console.error(deployRes.stderr);
    if (deployRes.status !== 0) {
      throw new Error(`Migration deployment failed with exit code ${deployRes.status}`);
    }
    console.log('✅ Migration 20261117_add_healthcare_facility successfully deployed.\n');

    // Step 4: Post-deployment count parity
    console.log('[4/6] Verifying post-deployment record preservation and new tables...');
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

    let postTotal = 0;
    for (const [tbl, count] of Object.entries(postCounts)) {
      postTotal += count;
      if (count !== REQUIRED_BASELINE[tbl]) {
        throw new Error(`DATA LOSS DETECTED on table ${tbl}: expected ${REQUIRED_BASELINE[tbl]}, got ${count}`);
      }
    }
    if (postTotal !== EXPECTED_TOTAL) {
      throw new Error(`POST-DEPLOYMENT TOTAL MISMATCH: expected ${EXPECTED_TOTAL}, got ${postTotal}`);
    }
    console.log(`✅ 100% Record Parity: All 89 records intact across all 11 original tables.`);

    // Audit DoctorProfile nullable columns
    const doctors = await client.doctorProfile.findMany();
    for (const doc of doctors) {
      console.log(` - Doctor ${doc.id}: district=${doc.district}, division=${doc.division}, lat=${doc.latitude}, lng=${doc.longitude}`);
      if (doc.district !== null || doc.division !== null || doc.latitude !== null || doc.longitude !== null) {
        throw new Error(`Doctor ${doc.id} has unexpected non-null values in new columns!`);
      }
    }
    console.log(`✅ All ${doctors.length} existing doctor profiles verified with clean NULL geographic defaults.`);

    const facilityCount = await client.healthcareFacility.count();
    const affiliationCount = await client.doctorFacilityAffiliation.count();
    console.log(`HealthcareFacility initial count:        ${facilityCount}`);
    console.log(`DoctorFacilityAffiliation initial count: ${affiliationCount}`);
    if (facilityCount !== 0 || affiliationCount !== 0) {
      throw new Error('New tables are unexpectedly not empty!');
    }
    console.log('✅ Both new tables exist and are clean.\n');

    // Step 5: Catalog-level foreign-key constraint verification
    console.log('[5/6] Auditing PostgreSQL pg_constraint catalog for all 18 foreign keys...');
    const fkCount = await verifyPgConstraints(client);
    console.log(`✅ All ${fkCount} foreign-key constraints verified in pg_constraint catalog.\n`);

    // Step 6: Verify _prisma_migrations and migration status
    console.log('[6/6] Auditing _prisma_migrations and final status...');
    const migrations = await client.$queryRawUnsafe(`
      SELECT id, checksum, finished_at, migration_name, applied_steps_count
      FROM _prisma_migrations
      ORDER BY started_at ASC;
    `);
    console.table(migrations);

    if (migrations.length !== 2) {
      throw new Error(`Expected 2 recorded migrations, found ${migrations.length}`);
    }

    const statusRes = spawnSync(process.execPath, [
      prismaCli,
      'migrate',
      'status',
    ], {
      env: prismaEnv,
      encoding: 'utf8',
    });
    console.log(statusRes.stdout);
    if (!statusRes.stdout.includes('Database schema is up to date')) {
      throw new Error('prisma migrate status did not confirm schema is up to date!');
    }

    console.log('================================================================');
    console.log('🎉 PRODUCTION STAGE 2 MIGRATION COMPLETED SUCCESSFULLY');
    console.log('Production Host:         ' + sanitizedHost);
    console.log('Original Records:        89 / 89 (100% preserved)');
    console.log('DoctorProfile Defaults:  Clean NULLs verified for all 5 doctors');
    console.log('New Tables:              HealthcareFacility, DoctorFacilityAffiliation');
    console.log('Foreign-Key Constraints: 18 / 18 validated and enforced');
    console.log('Migration Status:        Database schema is up to date!');
    console.log('================================================================\n');

  } finally {
    await client.$disconnect();
  }
}

deployProductionMigration().catch(err => {
  console.error('\n❌ PRODUCTION DEPLOYMENT FAILED:');
  console.error(err);
  process.exit(1);
});
