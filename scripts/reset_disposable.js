/**
 * Reset disposable test database by dropping test tables if they exist,
 * ensuring clean restore test baseline.
 * STRICT SAFETY: Ensures endpoint is NOT production.
 */
const { PrismaClient } = require('@prisma/client');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const restoreUrl = process.env.RESTORE_TEST_DATABASE_URL;
const prodUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!restoreUrl || !prodUrl) {
  console.error('Missing database URLs in .env');
  process.exit(1);
}

const testObj = new URL(restoreUrl);
const prodObj = new URL(prodUrl);

if (testObj.hostname === prodObj.hostname) {
  console.error('FATAL SAFETY VIOLATION: Target matches production host! Aborting.');
  process.exit(1);
}

const client = new PrismaClient({ datasources: { db: { url: restoreUrl } } });

async function resetDisposable() {
  console.log(`Connecting to disposable database ${testObj.hostname} to clean test objects...`);
  try {
    await client.$executeRawUnsafe(`DROP TABLE IF EXISTS "DoctorFacilityAffiliation" CASCADE;`);
    await client.$executeRawUnsafe(`DROP TABLE IF EXISTS "HealthcareFacility" CASCADE;`);
    await client.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='DoctorProfile' AND column_name='district') THEN
          ALTER TABLE "DoctorProfile" DROP COLUMN "district";
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='DoctorProfile' AND column_name='division') THEN
          ALTER TABLE "DoctorProfile" DROP COLUMN "division";
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='DoctorProfile' AND column_name='latitude') THEN
          ALTER TABLE "DoctorProfile" DROP COLUMN "latitude";
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='DoctorProfile' AND column_name='longitude') THEN
          ALTER TABLE "DoctorProfile" DROP COLUMN "longitude";
        END IF;
      END $$;
    `);
    console.log('✅ Disposable database cleaned of Stage 2 test additions.');
  } finally {
    await client.$disconnect();
  }
}

resetDisposable().catch(err => {
  console.error('Failed to reset disposable:', err);
  process.exit(1);
});
