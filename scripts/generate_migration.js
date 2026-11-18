const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env') });

const restoreUrl = process.env.RESTORE_TEST_DATABASE_URL;
if (!restoreUrl) {
  console.error('RESTORE_TEST_DATABASE_URL not found in .env');
  process.exit(1);
}

const outDir = path.join(process.cwd(), 'prisma', 'migrations', '20261117_add_healthcare_facility');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const outFile = path.join(outDir, 'migration.sql');

console.log('Generating migration diff between disposable restore target and prisma/schema.prisma...');

const prismaCli = path.join(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js');

const result = spawnSync(process.execPath, [
  prismaCli,
  'migrate',
  'diff',
  '--from-url', restoreUrl,
  '--to-schema-datamodel', path.join(process.cwd(), 'prisma', 'schema.prisma'),
  '--script',
], {
  encoding: 'utf8',
});

if (result.status !== 0 || result.error) {
  console.error('Failed to generate migration:', result.error || result.stderr || result.stdout);
  process.exit(1);
}

fs.writeFileSync(outFile, result.stdout, 'utf8');
console.log(`✅ Migration SQL written to ${outFile}`);
console.log('\n--- Generated SQL ---\n' + result.stdout);
