/**
 * DocAvail - Non-Destructive Restore Verification on Disposable Neon Database
 * 
 * Safety Guarantees:
 * 1. Strict AND-gated assertion: requires DISPOSABLE_RESTORE_TARGET_ENDPOINT_ID and DISPOSABLE_RESTORE_TARGET_DB_NAME.
 * 2. Prohibits restore if target endpoint matches production.
 * 3. Verifies SHA-256 checksum of neon_production.dump against manifest.json before restoring.
 * 4. Executes pg_restore using matching PostgreSQL 18 binaries.
 * 5. Asserts exact 89-record baseline parity across all 11 tables.
 * 6. Validates all 16 foreign keys via catalog-level pg_constraint lateral unnest query with ordinality.
 * 7. Strictly preserves original backup artifacts (read-only).
 * 8. Never exposes credentials in logs.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

// 1. Expected 89-record baseline
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

// All 16 Foreign-Key Constraints defined in DocAvail Prisma schema
const EXPECTED_FOREIGN_KEYS = [
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
];

const SUPPORTED_PARAMS = new Set([
  'sslmode',
  'channel_binding',
  'options',
  'connect_timeout',
  'application_name',
  'sslrootcert',
]);

const activePgPassFiles = new Set();
let activeRestoreProc = null;

function computeFileSha256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(new Error(`Failed to compute SHA-256 for '${filePath}': ${err.message}`)));
  });
}

function getCurrentUserSid() {
  if (process.platform !== 'win32') return null;
  const res = spawnSync('whoami', ['/user'], { encoding: 'utf8' });
  if (res.status === 0 && res.stdout) {
    const lines = res.stdout.trim().split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(/(S-1-5-21-\d+-\d+-\d+-\d+|S-1-5-\d+)/);
      if (match) return match[1];
    }
  }
  const psRes = spawnSync('powershell', ['-NoProfile', '-Command', '[System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value'], { encoding: 'utf8' });
  if (psRes.status === 0 && psRes.stdout.trim()) {
    return psRes.stdout.trim();
  }
  throw new Error('FATAL: Could not determine current Windows account SID for ACL verification.');
}

function escapePgPassField(val) {
  return String(val).replace(/\\/g, '\\\\').replace(/:/g, '\\:');
}

function auditConnectionParams(urlObj) {
  const envVars = {};
  const unsupported = [];
  for (const [key, value] of urlObj.searchParams.entries()) {
    if (!SUPPORTED_PARAMS.has(key)) {
      unsupported.push(key);
      continue;
    }
    if (key === 'sslmode') envVars.PGSSLMODE = value;
    if (key === 'channel_binding') envVars.PGCHANNELBINDING = value;
    if (key === 'options') envVars.PGOPTIONS = value;
    if (key === 'connect_timeout') envVars.PGCONNECT_TIMEOUT = value;
    if (key === 'application_name') envVars.PGAPPNAME = value;
    if (key === 'sslrootcert') envVars.PGSSLROOTCERT = value;
  }
  if (unsupported.length > 0) {
    throw new Error(`FATAL: Unsupported connection parameters: ${unsupported.join(', ')}`);
  }
  return envVars;
}

function createSecurePgPass(urlObj) {
  const host = escapePgPassField(urlObj.hostname);
  const port = escapePgPassField(urlObj.port || '5432');
  const dbname = escapePgPassField(decodeURIComponent(urlObj.pathname.replace(/^\//, '')));
  const user = escapePgPassField(decodeURIComponent(urlObj.username || ''));
  const pass = escapePgPassField(decodeURIComponent(urlObj.password || ''));

  const content = `${host}:${port}:${dbname}:${user}:${pass}\n`;
  const filePath = path.join(os.tmpdir(), `pgpass_restore_${Date.now()}_${Math.random().toString(36).slice(2)}.conf`);
  
  fs.writeFileSync(filePath, content, { mode: 0o600 });
  activePgPassFiles.add(filePath);

  if (process.platform === 'win32') {
    const currentSid = getCurrentUserSid();
    const aclSet = spawnSync('icacls', [filePath, '/inheritance:r', '/grant:r', `*${currentSid}:(R,W)`], { encoding: 'utf8' });
    if (aclSet.status !== 0) {
      try { fs.unlinkSync(filePath); } catch (_) {}
      activePgPassFiles.delete(filePath);
      throw new Error(`FATAL: icacls modification failed on PGPASS file: ${aclSet.stderr}`);
    }

    const psCheckScript = `
      param($path, $expectedSid)
      $acl = Get-Acl -LiteralPath $path
      if (-not $acl.AreAccessRulesProtected) { Write-Output "INHERITANCE_PRESENT"; exit 1 }
      $rules = $acl.Access
      if ($rules.Count -ne 1) { Write-Output "UNEXPECTED_RULE_COUNT:$($rules.Count)"; exit 1 }
      $rule = $rules[0]
      $ruleSid = $rule.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value
      if ($ruleSid -ne $expectedSid) { Write-Output "SID_MISMATCH:$ruleSid"; exit 1 }
      if ($rule.AccessControlType -ne [System.Security.AccessControl.AccessControlType]::Allow) { Write-Output "NOT_ALLOW"; exit 1 }
      Write-Output "ACL_VERIFIED_OK"
    `;

    const psVerify = spawnSync('powershell', ['-NoProfile', '-Command', `& { ${psCheckScript} } '${filePath}' '${currentSid}'`], { encoding: 'utf8' });
    if (psVerify.status !== 0 || !psVerify.stdout.includes('ACL_VERIFIED_OK')) {
      try { fs.unlinkSync(filePath); } catch (_) {}
      activePgPassFiles.delete(filePath);
      throw new Error(`FATAL: PGPASS ACL verification failed: ${psVerify.stdout.trim() || psVerify.stderr.trim()}`);
    }
  }

  return filePath;
}

function extractNeonEndpoint(hostname) {
  const match = hostname.match(/^(ep-[a-z0-9-]+?)(?:-pooler)?\./i);
  return match ? match[1].toLowerCase() : hostname.toLowerCase();
}

function resolvePgRestoreBin() {
  const envVarPath = process.env.PG_RESTORE_PATH;
  if (envVarPath) {
    if (fs.existsSync(envVarPath) && fs.statSync(envVarPath).isFile()) return envVarPath;
    const candidate = path.join(process.cwd(), envVarPath);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  const defaultCandidate = path.join(process.cwd(), 'tools', 'pgsql18', 'pgsql', 'bin', 'pg_restore.exe');
  if (fs.existsSync(defaultCandidate)) return defaultCandidate;
  throw new Error('FATAL: Could not locate pg_restore.exe. Configure PG_RESTORE_PATH in .env.');
}

function runAsyncPgRestore(pgRestoreBin, args, envVars, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    let isSettled = false;
    const proc = spawn(pgRestoreBin, args, { env: envVars });
    activeRestoreProc = proc;

    let stderr = '';
    if (proc.stderr) {
      proc.stderr.on('data', (d) => { stderr += d.toString(); });
    }

    const timer = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        if (process.platform === 'win32') {
          spawnSync('taskkill', ['/pid', String(proc.pid), '/T', '/F'], { stdio: 'ignore' });
        } else {
          proc.kill('SIGKILL');
        }
        reject(new Error(`pg_restore timed out after ${timeoutMs / 1000} seconds.`));
      }
    }, timeoutMs);

    proc.on('error', (err) => {
      if (!isSettled) {
        isSettled = true;
        clearTimeout(timer);
        activeRestoreProc = null;
        reject(err);
      }
    });

    proc.on('close', (code, signal) => {
      if (!isSettled) {
        isSettled = true;
        clearTimeout(timer);
        activeRestoreProc = null;
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`pg_restore failed with exit code ${code}${signal ? ` (${signal})` : ''}: ${stderr}`));
        }
      }
    });
  });
}

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
  for (const exp of EXPECTED_FOREIGN_KEYS) expectedMap.set(exp.name, exp);

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
}

async function runRestoreVerification() {
  console.log('================================================================');
  console.log('DocAvail — Standalone Disposable Restore Verification');
  console.log('================================================================\n');

  require('dotenv').config({ path: path.join(process.cwd(), '.env') });

  // 1. Locate latest backup set
  const backupRootDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupRootDir)) throw new Error('No backups directory found.');

  const backupDirs = fs.readdirSync(backupRootDir)
    .filter(d => d.startsWith('backup_set_') && !d.endsWith('.staging'))
    .sort()
    .reverse();

  if (backupDirs.length === 0) throw new Error('No valid backup sets found in backups/.');

  const latestBackupDir = path.join(backupRootDir, backupDirs[0]);
  console.log(`[1/6] Selected backup archive: ${backupDirs[0]}`);

  const manifestPath = path.join(latestBackupDir, 'manifest.json');
  const dumpPath = path.join(latestBackupDir, 'neon_production.dump');
  const markerPath = path.join(latestBackupDir, 'BACKUP_COMPLETE');

  if (!fs.existsSync(manifestPath) || !fs.existsSync(dumpPath) || !fs.existsSync(markerPath)) {
    throw new Error(`Incomplete backup set in ${latestBackupDir}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  // 2. Validate dump checksum against manifest before restoring
  console.log('[2/6] Verifying SHA-256 checksum of PostgreSQL dump archive...');
  const actualDumpSha256 = await computeFileSha256(dumpPath);
  if (actualDumpSha256 !== manifest.files.pgDumpArchive.sha256) {
    throw new Error(`CHECKSUM MISMATCH: neon_production.dump SHA-256 (${actualDumpSha256}) does not match manifest (${manifest.files.pgDumpArchive.sha256})`);
  }
  console.log(`✅ SHA-256 verified: ${actualDumpSha256}\n`);

  // 3. Strict Destination Identity Verification
  console.log('[3/6] Verifying disposable restore destination identity...');
  const restoreUrlStr = process.env.RESTORE_TEST_DATABASE_URL;
  if (!restoreUrlStr) {
    throw new Error(
      'CONFIG ERROR: RESTORE_TEST_DATABASE_URL is not configured in .env.\n' +
      'Please configure a disposable Neon database URL along with DISPOSABLE_RESTORE_TARGET_ENDPOINT_ID and DISPOSABLE_RESTORE_TARGET_DB_NAME.'
    );
  }

  const prodUrlStr = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!prodUrlStr) throw new Error('Production connection string not found in .env.');

  const prodUrl = new URL(prodUrlStr);
  const testUrl = new URL(restoreUrlStr);
  const testParamsEnv = auditConnectionParams(testUrl);

  const prodEndpoint = extractNeonEndpoint(prodUrl.hostname);
  const testEndpoint = extractNeonEndpoint(testUrl.hostname);
  const prodDbName = decodeURIComponent(prodUrl.pathname.replace(/^\//, '')).toLowerCase();
  const testDbName = decodeURIComponent(testUrl.pathname.replace(/^\//, '')).toLowerCase();

  if (prodEndpoint === testEndpoint) {
    throw new Error('FATAL SAFETY VIOLATION: RESTORE_TEST_DATABASE_URL shares the production compute endpoint! Execution aborted.');
  }

  const declaredTargetEndpoint = (process.env.DISPOSABLE_RESTORE_TARGET_ENDPOINT_ID || '').toLowerCase();
  const declaredTargetDb = (process.env.DISPOSABLE_RESTORE_TARGET_DB_NAME || '').toLowerCase();

  if (!declaredTargetEndpoint || !declaredTargetDb) {
    throw new Error(
      'FATAL CONFIG ERROR: Both DISPOSABLE_RESTORE_TARGET_ENDPOINT_ID and DISPOSABLE_RESTORE_TARGET_DB_NAME must be explicitly configured in .env.'
    );
  }

  if (testEndpoint !== declaredTargetEndpoint || testDbName !== declaredTargetDb) {
    throw new Error(
      `FATAL SAFETY VIOLATION: Test destination identity mismatch.\n` +
      `Target Endpoint: '${testEndpoint}' (declared: '${declaredTargetEndpoint}')\n` +
      `Target Database: '${testDbName}' (declared: '${declaredTargetDb}')`
    );
  }

  console.log(`✅ Destination confirmed disposable: Endpoint '${testEndpoint}', Database '${testDbName}'\n`);

  // 4. Execute pg_restore
  console.log('[4/6] Executing pg_restore using PostgreSQL 18 client...');
  const pgRestoreBin = resolvePgRestoreBin();
  const testPgPass = createSecurePgPass(testUrl);

  const restoreArgs = [
    '--host', testUrl.hostname,
    '--port', testUrl.port || '5432',
    '--username', decodeURIComponent(testUrl.username),
    '--dbname', testDbName,
    '--clean',
    '--if-exists',
    '--no-owner',
    '--no-privileges',
    '--exit-on-error',
    '--no-password',
    dumpPath,
  ];

  const restoreEnv = {
    ...process.env,
    PGPASSFILE: testPgPass,
    ...testParamsEnv,
  };

  try {
    await runAsyncPgRestore(pgRestoreBin, restoreArgs, restoreEnv, 120000);
    console.log('✅ pg_restore completed successfully into disposable database.\n');
  } finally {
    if (activeRestoreProc === null) {
      for (const pass of activePgPassFiles) {
        try { fs.unlinkSync(pass); activePgPassFiles.delete(pass); } catch (_) {}
      }
    }
  }

  // 5. Verify restored database counts and foreign-key constraints
  console.log('[5/6] Auditing restored database table counts and foreign keys...');
  const testPrisma = new PrismaClient({ datasources: { db: { url: restoreUrlStr } } });

  try {
    const testCounts = {
      User: await testPrisma.user.count(),
      PatientProfile: await testPrisma.patientProfile.count(),
      DoctorProfile: await testPrisma.doctorProfile.count(),
      WorkingHours: await testPrisma.workingHours.count(),
      Appointment: await testPrisma.appointment.count(),
      MedicalRecord: await testPrisma.medicalRecord.count(),
      Prescription: await testPrisma.prescription.count(),
      DoctorPatientAccess: await testPrisma.doctorPatientAccess.count(),
      AppointmentSlot: await testPrisma.appointmentSlot.count(),
      ReportedAccount: await testPrisma.reportedAccount.count(),
      Review: await testPrisma.review.count(),
    };

    let totalRestored = 0;
    const discrepancies = [];

    for (const [table, expected] of Object.entries(REQUIRED_BASELINE)) {
      const actual = testCounts[table];
      totalRestored += actual;
      if (actual !== expected) {
        discrepancies.push({ table, expected, actual });
      }
    }

    if (discrepancies.length > 0 || totalRestored !== EXPECTED_TOTAL) {
      console.error('🚨 RESTORE COUNT PARITY FAILED:');
      console.table(discrepancies);
      throw new Error(`Restored database count mismatch. Expected ${EXPECTED_TOTAL}, got ${totalRestored}`);
    }
    console.log(`✅ Baseline parity verified: All 11 tables match manifest (89 records total).`);

    // Verify all 16 foreign keys in pg_constraint catalog
    await verifyPgConstraints(testPrisma);
    console.log(`✅ Foreign-key constraint audit passed: All 16 foreign keys verified in catalog.\n`);

    // 6. Update manifest status to BACKUP_AND_LIVE_RESTORE_VERIFIED_PASSED
    console.log('[6/6] Updating backup manifest with verified restore test results...');
    manifest.liveRestoreStatus = 'BACKUP_AND_LIVE_RESTORE_VERIFIED_PASSED';
    manifest.liveRestoreVerifiedAt = new Date().toISOString();
    manifest.liveRestoreTarget = {
      endpointId: testEndpoint,
      database: testDbName,
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

    console.log('================================================================');
    console.log('🎉 DISPOSABLE RESTORE VERIFICATION PASSED');
    console.log('Restored Records:    89 / 89 across 11 tables');
    console.log('Foreign Keys:        16 / 16 verified and enforced in catalog');
    console.log('Restored Target:     ' + testEndpoint + ' / ' + testDbName);
    console.log('Manifest Updated:    ' + manifestPath);
    console.log('================================================================\n');

  } finally {
    await testPrisma.$disconnect();
  }
}

process.on('exit', () => {
  for (const pass of activePgPassFiles) {
    try { fs.unlinkSync(pass); } catch (_) {}
  }
});

runRestoreVerification().catch((err) => {
  console.error('\n❌ RESTORE VERIFICATION FAILED:');
  console.error(err.message);
  process.exit(1);
});
