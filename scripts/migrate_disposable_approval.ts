/**
 * DocAvail — Disposable Database Migration Runner for Approval Workflow
 *
 * Applies prisma/migrations/20261119_add_user_approval_workflow/migration.sql
 * ONLY to RESTORE_TEST_DATABASE_URL (idempotent check via information_schema).
 * Aborts immediately if RESTORE_TEST_DATABASE_URL host matches production.
 */

import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const restoreUrl = process.env.RESTORE_TEST_DATABASE_URL;
const prodUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!restoreUrl || !prodUrl) {
  console.error('FATAL: Missing database URLs in .env');
  process.exit(1);
}

const restoreObj = new URL(restoreUrl);
const prodObj = new URL(prodUrl);

if (restoreObj.hostname === prodObj.hostname) {
  console.error('FATAL SAFETY VIOLATION: Target matches production host! Aborting.');
  process.exit(1);
}

const migrationSqlPath = path.join(
  __dirname,
  '..',
  'prisma',
  'migrations',
  '20261119_add_user_approval_workflow',
  'migration.sql'
);

async function main() {
  if (!fs.existsSync(migrationSqlPath)) {
    throw new Error(`Migration SQL not found at ${migrationSqlPath}`);
  }

  const sql = fs.readFileSync(migrationSqlPath, 'utf8');
  const prisma = new PrismaClient({
    datasources: { db: { url: restoreUrl } },
  });

  try {
    console.log(`Connected to disposable host: ${restoreObj.hostname}`);

    const existingCols = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'approvalStatus'`
    );

    if (existingCols.length > 0) {
      console.log('Column User.approvalStatus already exists on disposable DB. Skipping SQL execution.');
    } else {
      console.log('Applying migration SQL statements inside transaction...');
      const statements = sql
        .split(';')
        .map((s) =>
          s
            .split('\n')
            .filter((line) => !line.trim().startsWith('--'))
            .join('\n')
            .trim()
        )
        .filter(Boolean);

      await prisma.$transaction(async (tx) => {
        for (const stmt of statements) {
          await tx.$executeRawUnsafe(stmt);
        }
      });
      console.log(`Applied ${statements.length} migration SQL statements successfully.`);
    }

    const users = await prisma.$queryRawUnsafe<Array<{ email: string; role: string; approvalStatus: string }>>(
      `SELECT "email", "role", "approvalStatus" FROM "User" ORDER BY "createdAt" ASC`
    );
    console.log(`Post-migration disposable User count: ${users.length}`);
    for (const u of users) {
      console.log(`  - ${u.email} (${u.role}) -> ${u.approvalStatus}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Disposable migration failed:', err);
  process.exit(1);
});
