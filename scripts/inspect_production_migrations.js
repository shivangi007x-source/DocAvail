/**
 * DocAvail - Read-Only Production Migration History Inspection
 * 
 * Strict Guarantees:
 * 1. Sets connection session to TRANSACTION READ ONLY.
 * 2. Uses BEGIN READ ONLY transaction with explicit ROLLBACK.
 * 3. Never executes DDL, DML, or any write query.
 * 4. Never modifies _prisma_migrations or production tables.
 * 5. Sanitizes credentials from all outputs.
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

async function inspectProductionMigrationHistory() {
  console.log('================================================================');
  console.log('DocAvail — Read-Only Production Migration History Inspection');
  console.log('================================================================');
  console.log(`Connecting to: ${sanitizedHost} / ${sanitizedDb}`);
  console.log('Enforcing STRICT READ-ONLY transaction mode...\n');

  // Enforce read-only at client config and session level
  const client = new Client({
    connectionString: prodUrlStr,
    ssl: { rejectUnauthorized: false },
    statement_timeout: 10000,
  });

  try {
    await client.connect();

    // 1. Enforce read-only transaction mode
    await client.query('SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY;');
    await client.query('BEGIN READ ONLY;');

    // 2. Inspect database version and current connection context
    const contextRes = await client.query(`
      SELECT current_database() AS db_name, current_user AS user_name, version() AS pg_version;
    `);
    console.log('[1/4] Connection Context:');
    console.log(`  Database: ${contextRes.rows[0].db_name}`);
    console.log(`  User:     ${contextRes.rows[0].user_name}`);
    console.log(`  Version:  ${contextRes.rows[0].pg_version.split('\n')[0]}`);

    // 3. Check for Prisma migration or shadow tables
    console.log('\n[2/4] Checking for migration-related tables in catalog...');
    const tablesRes = await client.query(`
      SELECT table_schema, table_name, table_type
      FROM information_schema.tables
      WHERE table_name ILIKE '%prisma%' OR table_name ILIKE '%migration%'
      ORDER BY table_schema, table_name;
    `);

    if (tablesRes.rows.length === 0) {
      console.log('  👉 NO Prisma migration tables found in catalog (table "_prisma_migrations" DOES NOT EXIST).');
    } else {
      console.log(`  Found ${tablesRes.rows.length} migration-related table(s):`);
      for (const t of tablesRes.rows) {
        console.log(`   - ${t.table_schema}.${t.table_name} (${t.table_type})`);
      }
    }

    // 4. Query _prisma_migrations if it exists
    console.log('\n[3/4] Inspecting _prisma_migrations contents...');
    const hasMigrationTable = tablesRes.rows.some(r => r.table_name === '_prisma_migrations');
    if (hasMigrationTable) {
      const migRes = await client.query(`
        SELECT id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count
        FROM _prisma_migrations
        ORDER BY started_at ASC;
      `);
      console.log(`  Total recorded migrations: ${migRes.rows.length}`);
      for (const row of migRes.rows) {
        console.log(`   * Migration: ${row.migration_name}`);
        console.log(`     Checksum:  ${row.checksum}`);
        console.log(`     Finished:  ${row.finished_at}`);
        console.log(`     Steps:     ${row.applied_steps_count}`);
        console.log(`     RolledBack:${row.rolled_back_at}`);
      }
    } else {
      console.log('  👉 Table "_prisma_migrations" is completely absent.');
      console.log('  👉 Conclusive evidence: Production schema was NOT deployed using "prisma migrate".');
    }

    // 5. Inspect existing user-defined tables in public schema
    console.log('\n[4/4] Existing user-defined tables in public schema:');
    const userTablesRes = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    console.log(`  Found ${userTablesRes.rows.length} tables in public schema:`);
    for (const ut of userTablesRes.rows) {
      console.log(`   - ${ut.table_name}`);
    }

    // 6. Rollback read-only transaction
    await client.query('ROLLBACK;');
    console.log('\n✅ Read-only session completed and rolled back cleanly.');

  } finally {
    await client.end();
  }
}

inspectProductionMigrationHistory().catch(err => {
  console.error('\n❌ INSPECTION FAILED:');
  console.error(err);
  process.exit(1);
});
