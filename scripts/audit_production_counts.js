/**
 * DocAvail - Read-Only Production Parity & State Audit
 *
 * Strict Guarantees:
 * 1. Sets connection session to TRANSACTION READ ONLY.
 * 2. Uses BEGIN READ ONLY transaction with explicit ROLLBACK.
 * 3. Never executes DDL, DML, or any write query.
 * 4. Sanitizes credentials from all outputs.
 */

const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const prodUrlStr = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!prodUrlStr) {
  console.error('FATAL: Production database URL not found in .env');
  process.exit(1);
}

const prodUrl = new URL(prodUrlStr);
const sanitizedHost = prodUrl.hostname;
const sanitizedDb = decodeURIComponent(prodUrl.pathname.replace(/^\//, ''));

async function auditProductionCounts() {
  console.log('================================================================');
  console.log('DocAvail — Read-Only Production Table Parity Audit');
  console.log('================================================================');
  console.log(`Connecting to: ${sanitizedHost} / ${sanitizedDb}`);
  console.log('Enforcing STRICT READ-ONLY transaction mode...\n');

  const client = new Client({
    connectionString: prodUrlStr,
    ssl: { rejectUnauthorized: false },
    statement_timeout: 10000,
  });

  try {
    await client.connect();
    await client.query('SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY;');
    await client.query('BEGIN READ ONLY;');

    const baselineTables = [
      'User',
      'PatientProfile',
      'DoctorProfile',
      'WorkingHours',
      'Appointment',
      'MedicalRecord',
      'Prescription',
      'DoctorPatientAccess',
      'AppointmentSlot',
      'ReportedAccount',
      'Review'
    ];

    let baselineTotal = 0;
    console.log('Baseline Tables:');
    for (const t of baselineTables) {
      const res = await client.query(`SELECT count(*)::int AS cnt FROM "${t}";`);
      const count = res.rows[0].cnt;
      baselineTotal += count;
      console.log(` - ${t.padEnd(22)}: ${count}`);
    }
    console.log(`\nTotal Baseline Records: ${baselineTotal} (Expected: 89)`);

    console.log('\nNew Stage 2 Tables:');
    const hfRes = await client.query('SELECT count(*)::int AS cnt FROM "HealthcareFacility";');
    const dfaRes = await client.query('SELECT count(*)::int AS cnt FROM "DoctorFacilityAffiliation";');
    console.log(` - HealthcareFacility       : ${hfRes.rows[0].cnt} (Expected: 12 after Stage 3 import)`);
    console.log(` - DoctorFacilityAffiliation: ${dfaRes.rows[0].cnt} (Expected: 0)`);

    const usersRes = await client.query('SELECT role, "createdAt" FROM "User" ORDER BY "createdAt" ASC;');
    console.log('\nProduction Users Summary (PII Redacted):');
    usersRes.rows.forEach((u, idx) => console.log(` - Account #${String(idx + 1).padStart(2, '0')} | Role: ${u.role.padEnd(8)} | CreatedAt: ${u.createdAt.toISOString()}`));

    await client.query('ROLLBACK;');
    console.log('\nRead-only transaction rolled back cleanly.');
  } finally {
    await client.end();
  }
}

auditProductionCounts().catch(err => {
  console.error('Audit failed:', err.message);
  process.exit(1);
});
