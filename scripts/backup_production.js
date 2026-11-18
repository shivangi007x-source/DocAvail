/**
 * DocAvail - Production Pre-Migration Backup & Exhaustive Relational Audit (Revision 17 - Surgical Fix)
 * 
 * Safety Guarantees:
 * 1. Read-only RepeatableRead PostgreSQL snapshot on production.
 * 2. Mandatory shared PostgreSQL snapshot (no drift between JSON and pg_dump).
 * 3. Asynchronous child process management with guaranteed process-tree termination.
 * 4. PGPASSFILE credential isolation with verified Windows account SID NTFS ACLs.
 * 5. Credential and staging-directory preservation if child-process termination cannot be confirmed.
 * 6. Streaming SHA-256 checksum computation for all backup artifacts.
 * 7. Non-locking SQLite online backup via Python standard library with baseline verification.
 * 8. Complete bidirectional foreign-key set verification (missing, unexpected, invalid, mismatch) via pg_constraint.
 * 9. Bounded unwinding policy for SIGINT, SIGTERM, and uncaughtException during active database operations.
 * 10. Single coordinated shutdown path preventing racing cleanup or premature Prisma disconnection.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');
const { PrismaClient, Prisma } = require('@prisma/client');

// 1. Mandatory Baseline Counts (Zero-tolerance assertion)
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

// Supported libpq connection parameters
const SUPPORTED_PARAMS = new Set([
  'sslmode',
  'channel_binding',
  'options',
  'connect_timeout',
  'application_name',
  'sslrootcert',
]);

// 2. Global Resource Tracking & Coordinated Shutdown State
const trackedStagingDirs = new Set();
const activePgPassFiles = new Set();

let activePgDumpProc = null;
let pgDumpClosePromise = null;
let pgDumpResolveClose = null;
let activePgDumpCancelPromise = null;

let activePgRestoreProc = null;
let pgRestoreClosePromise = null;
let pgRestoreResolveClose = null;
let activePgRestoreCancelPromise = null;

let globalPrisma = null;
let isBackupRunning = false;
let shutdownRequested = false;
let shutdownSignal = null;
let shutdownReason = null;
let cleanupPromise = null;
let shutdownCoordinatorPromise = null;
let unwindSafetyTimer = null;

let pgDumpBin = null;
let pgRestoreBin = null;

// Streaming SHA-256 Checksum Computation
function computeFileSha256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(new Error(`Failed to compute SHA-256 for '${filePath}': ${err.message}`)));
  });
}

// Retrieve current Windows Account SID
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

// Deduplicated pg_dump cancellation routine
function cancelActivePgDump() {
  if (activePgDumpCancelPromise) {
    return activePgDumpCancelPromise;
  }
  if (!activePgDumpProc) {
    return Promise.resolve();
  }

  activePgDumpCancelPromise = (async () => {
    const proc = activePgDumpProc;
    const pid = proc.pid;
    if (!pid) {
      activePgDumpProc = null;
      activePgDumpCancelPromise = null;
      return;
    }

    console.warn(`Initiating cancellation of pg_dump (PID ${pid})...`);

    try {
      if (process.platform === 'win32') {
        spawnSync('taskkill', ['/pid', String(pid), '/T'], { stdio: 'ignore' });
      } else {
        proc.kill('SIGTERM');
      }
    } catch (err) {
      console.error(`Warning: Initial termination signal to PID ${pid} failed: ${err.message}`);
    }

    let graceTimer = null;
    const graceTimeout = new Promise((res) => { graceTimer = setTimeout(() => res(false), 3000); });
    const closedGracefully = await Promise.race([
      pgDumpClosePromise ? pgDumpClosePromise.then(() => true) : Promise.resolve(true),
      graceTimeout,
    ]);
    clearTimeout(graceTimer);

    if (closedGracefully) {
      activePgDumpProc = null;
      activePgDumpCancelPromise = null;
      console.log(`✅ pg_dump (PID ${pid}) exited gracefully.`);
      return;
    }

    console.warn(`pg_dump (PID ${pid}) did not exit within grace period. Escalating to forced termination...`);
    try {
      if (process.platform === 'win32') {
        spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore' });
      } else {
        proc.kill('SIGKILL');
      }
    } catch (err) {
      console.error(`Warning: Forced termination of PID ${pid} failed: ${err.message}`);
    }

    let hardTimer = null;
    const hardTimeout = new Promise((res) => { hardTimer = setTimeout(() => res(false), 5000); });
    const closedForced = await Promise.race([
      pgDumpClosePromise ? pgDumpClosePromise.then(() => true) : Promise.resolve(true),
      hardTimeout,
    ]);
    clearTimeout(hardTimer);

    if (!closedForced) {
      activePgDumpCancelPromise = null;
      throw new Error(`CRITICAL PROCESS LEAK: pg_dump (PID ${pid}) could not be confirmed terminated after forced termination. Reference retained.`);
    }

    activePgDumpProc = null;
    activePgDumpCancelPromise = null;
    console.log(`✅ pg_dump (PID ${pid}) confirmed terminated.`);
  })();

  return activePgDumpCancelPromise;
}

// Deduplicated pg_restore cancellation routine
function cancelActivePgRestore() {
  if (activePgRestoreCancelPromise) {
    return activePgRestoreCancelPromise;
  }
  if (!activePgRestoreProc) {
    return Promise.resolve();
  }

  activePgRestoreCancelPromise = (async () => {
    const proc = activePgRestoreProc;
    const pid = proc.pid;
    if (!pid) {
      activePgRestoreProc = null;
      activePgRestoreCancelPromise = null;
      return;
    }

    console.warn(`Initiating cancellation of pg_restore (PID ${pid})...`);
    try {
      if (process.platform === 'win32') {
        spawnSync('taskkill', ['/pid', String(pid), '/T'], { stdio: 'ignore' });
      } else {
        proc.kill('SIGTERM');
      }
    } catch (err) {
      console.error(`Warning: Initial termination to restore PID ${pid} failed: ${err.message}`);
    }

    let graceTimer = null;
    const graceTimeout = new Promise((res) => { graceTimer = setTimeout(() => res(false), 3000); });
    const closedGracefully = await Promise.race([
      pgRestoreClosePromise ? pgRestoreClosePromise.then(() => true) : Promise.resolve(true),
      graceTimeout,
    ]);
    clearTimeout(graceTimer);

    if (closedGracefully) {
      activePgRestoreProc = null;
      activePgRestoreCancelPromise = null;
      console.log(`✅ pg_restore (PID ${pid}) exited gracefully.`);
      return;
    }

    console.warn(`pg_restore (PID ${pid}) did not exit within grace period. Forcing termination...`);
    try {
      if (process.platform === 'win32') {
        spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore' });
      } else {
        proc.kill('SIGKILL');
      }
    } catch (err) {
      console.error(`Warning: Forced termination of restore PID ${pid} failed: ${err.message}`);
    }

    let hardTimer = null;
    const hardTimeout = new Promise((res) => { hardTimer = setTimeout(() => res(false), 5000); });
    const closedForced = await Promise.race([
      pgRestoreClosePromise ? pgRestoreClosePromise.then(() => true) : Promise.resolve(true),
      hardTimeout,
    ]);
    clearTimeout(hardTimer);

    if (!closedForced) {
      activePgRestoreCancelPromise = null;
      throw new Error(`CRITICAL PROCESS LEAK: pg_restore (PID ${pid}) could not be confirmed terminated.`);
    }

    activePgRestoreProc = null;
    activePgRestoreCancelPromise = null;
    console.log(`✅ pg_restore (PID ${pid}) confirmed terminated.`);
  })();

  return activePgRestoreCancelPromise;
}

// Single Coordinated Cleanup Routine with Credential Preservation
function performCleanup() {
  if (cleanupPromise) {
    return cleanupPromise;
  }

  cleanupPromise = (async () => {
    const cleanupErrors = [];

    try {
      await cancelActivePgDump();
    } catch (err) {
      cleanupErrors.push(`pg_dump cancellation error: ${err.message}`);
    }

    try {
      await cancelActivePgRestore();
    } catch (err) {
      cleanupErrors.push(`pg_restore cancellation error: ${err.message}`);
    }

    const anyProcAlive = (activePgDumpProc !== null) || (activePgRestoreProc !== null);

    // Preserve credentials and staging files if process termination is unconfirmed
    if (anyProcAlive) {
      cleanupErrors.push('CREDENTIALS PRESERVED: Temporary PGPASS files were not removed because a child process may still be active.');
      cleanupErrors.push('STAGING DIRECTORY PRESERVED: Staging files were not removed because a child process may still be active or writing.');
    } else {
      // Confirmed termination: remove all credentials idempotently
      for (const passFile of activePgPassFiles) {
        if (fs.existsSync(passFile)) {
          try {
            fs.unlinkSync(passFile);
            activePgPassFiles.delete(passFile);
          } catch (err) {
            cleanupErrors.push(`Failed to remove credential file '${passFile}': ${err.message}`);
          }
        } else {
          activePgPassFiles.delete(passFile);
        }
      }

      // Remove staging directories safely
      for (const stagingDir of trackedStagingDirs) {
        if (fs.existsSync(stagingDir)) {
          try {
            fs.rmSync(stagingDir, { recursive: true, force: true });
            trackedStagingDirs.delete(stagingDir);
          } catch (err) {
            cleanupErrors.push(`Failed to remove staging directory '${stagingDir}': ${err.message}`);
          }
        } else {
          trackedStagingDirs.delete(stagingDir);
        }
      }
    }

    if (cleanupErrors.length > 0) {
      const errorMsg = cleanupErrors.join('\n - ');
      console.error(`\n🚨 CLEANUP ISSUES DETECTED:\n - ${errorMsg}`);
      const cleanErr = new Error(`Cleanup encountered errors:\n - ${errorMsg}`);
      cleanErr.details = cleanupErrors;
      throw cleanErr;
    }
  })();

  return cleanupPromise;
}

// Single Shutdown Coordinator: Executes ONLY after active operations unwind
async function executeUnifiedShutdown(primaryError) {
  if (shutdownCoordinatorPromise) {
    return shutdownCoordinatorPromise;
  }

  shutdownCoordinatorPromise = (async () => {
    let cleanupError = null;
    let disconnectError = null;

    try {
      await cancelActivePgDump();
    } catch (err) {
      cleanupError = err;
    }

    try {
      await cancelActivePgRestore();
    } catch (err) {
      cleanupError = cleanupError || err;
    }

    try {
      await performCleanup();
    } catch (cErr) {
      cleanupError = cleanupError ? new Error(`${cleanupError.message}; ${cErr.message}`) : cErr;
    }

    try {
      if (globalPrisma) {
        await globalPrisma.$disconnect();
        globalPrisma = null;
      }
    } catch (dErr) {
      disconnectError = dErr;
      console.error('Failed to disconnect Prisma client during shutdown:', dErr.message);
    }

    const effectiveError = primaryError || shutdownReason;

    if (effectiveError || cleanupError || disconnectError) {
      if (effectiveError) {
        console.error('\n❌ BACKUP OPERATION FAILED / ABORTED:');
        console.error(effectiveError.message);
        if (effectiveError.stack && !effectiveError.message.includes('aborted by signal')) {
          console.error(effectiveError.stack);
        }
      }
      if (cleanupError) {
        console.error('\n🚨 CLEANUP REPORT (Reported Separately):');
        console.error(cleanupError.message);
      }
      if (disconnectError) {
        console.error('\n🚨 PRISMA DISCONNECT ERROR:');
        console.error(disconnectError.message);
      }
      process.exit(1);
    }
  })();

  return shutdownCoordinatorPromise;
}

// Unified Shutdown Request Handler with Bounded Unwinding Policy
function requestShutdown(source, err) {
  if (shutdownRequested) {
    console.warn(`[${source}] Shutdown already in progress. Ignoring duplicate signal/request.`);
    return;
  }
  shutdownRequested = true;
  shutdownSignal = source;
  shutdownReason = err || new Error(`Process aborted by signal ${source}`);

  if (source === 'uncaughtException') {
    console.error('\n💥 UNCAUGHT EXCEPTION:', shutdownReason.message);
  } else {
    console.error(`\n🛑 SHUTDOWN REQUESTED (${source}). Interrupting child processes and awaiting operation unwinding...`);
  }

  // Interrupt active child processes immediately
  if (activePgDumpProc) {
    cancelActivePgDump().catch((e) => console.error(`Error terminating pg_dump on ${source}:`, e.message));
  }
  if (activePgRestoreProc) {
    cancelActivePgRestore().catch((e) => console.error(`Error terminating pg_restore on ${source}:`, e.message));
  }

  // Bounded unwinding policy for active database operations
  if (isBackupRunning) {
    unwindSafetyTimer = setTimeout(() => {
      if (isBackupRunning) {
        console.error(`\n🚨 FATAL UNWIND TIMEOUT: Pending database operation failed to unwind after ${source} within 30-second limit.`);
        console.error('Terminating process immediately WITHOUT disconnecting Prisma or deleting staging directory to preserve database and staging state.');
        process.exit(1);
      }
    }, 30000);
    unwindSafetyTimer.unref();
  } else {
    // If runBackup has not started or has already completed, execute the coordinator directly
    executeUnifiedShutdown(shutdownReason).catch(() => process.exit(1));
  }
}

function handleTerminationSignal(sig) {
  requestShutdown(sig, null);
}

process.on('SIGINT', () => handleTerminationSignal('SIGINT'));
process.on('SIGTERM', () => handleTerminationSignal('SIGTERM'));
process.on('uncaughtException', (err) => {
  requestShutdown('uncaughtException', err);
});

process.on('exit', () => {
  // Synchronous fallback scrub only if child processes were confirmed dead
  if (activePgDumpProc === null && activePgRestoreProc === null) {
    for (const passFile of activePgPassFiles) {
      try { fs.unlinkSync(passFile); } catch (_) {}
    }
  }
});

// 3. Environment Loading
function loadEnvironment() {
  let dotenv;
  try {
    dotenv = require('dotenv');
  } catch (_) {
    try {
      dotenv = require(path.join(process.cwd(), 'node_modules', 'dotenv'));
    } catch (err) {
      throw new Error(`FATAL: Could not load dotenv package: ${err.message}`);
    }
  }
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

// 4. Independent PostgreSQL Binary Path Resolution
function resolvePgBinary(binaryName) {
  let envVarName = null;
  if (binaryName === 'pg_dump') {
    envVarName = 'PG_DUMP_PATH';
  } else if (binaryName === 'pg_restore') {
    envVarName = 'PG_RESTORE_PATH';
  }

  const explicitPath = envVarName ? process.env[envVarName] : null;

  if (explicitPath) {
    if (fs.existsSync(explicitPath) && fs.statSync(explicitPath).isFile()) {
      return explicitPath;
    }

    const ext = process.platform === 'win32' ? '.exe' : '';
    let candidate = path.join(explicitPath, `${binaryName}${ext}`);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }

    candidate = path.join(explicitPath, binaryName);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }

    throw new Error(
      `FATAL: Configured ${envVarName} ('${explicitPath}') does not contain a valid '${binaryName}' executable.`
    );
  }

  const lookupCmd = process.platform === 'win32' ? 'where' : 'which';
  const check = spawnSync(lookupCmd, [binaryName], { encoding: 'utf8' });
  if (check.status === 0 && check.stdout.trim()) {
    const found = check.stdout.trim().split(/\r?\n/)[0];
    if (fs.existsSync(found)) return found;
  }

  if (process.platform === 'win32') {
    const baseDir = 'C:\\Program Files\\PostgreSQL';
    if (fs.existsSync(baseDir)) {
      const versions = fs.readdirSync(baseDir);
      for (const v of versions) {
        const candidate = path.join(baseDir, v, 'bin', `${binaryName}.exe`);
        if (fs.existsSync(candidate)) return candidate;
      }
    }
  }

  return null;
}

// Escape colons (:) and backslashes (\) per PostgreSQL .pgpass specifications
function escapePgPassField(val) {
  return String(val).replace(/\\/g, '\\\\').replace(/:/g, '\\:');
}

// Audit connection parameters
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
    throw new Error(`FATAL: Unsupported or ambiguous connection parameters detected: ${unsupported.join(', ')}`);
  }

  return envVars;
}

// Secure PGPASSFILE Creation with Windows Account SID Verification
function createSecurePgPass(urlObj) {
  const host = escapePgPassField(urlObj.hostname);
  const port = escapePgPassField(urlObj.port || '5432');
  const dbname = escapePgPassField(decodeURIComponent(urlObj.pathname.replace(/^\//, '')));
  const user = escapePgPassField(decodeURIComponent(urlObj.username || ''));
  const pass = escapePgPassField(decodeURIComponent(urlObj.password || ''));

  const content = `${host}:${port}:${dbname}:${user}:${pass}\n`;
  const filePath = path.join(os.tmpdir(), `pgpass_${Date.now()}_${Math.random().toString(36).slice(2)}.conf`);
  
  fs.writeFileSync(filePath, content, { mode: 0o600 });
  activePgPassFiles.add(filePath);

  if (process.platform === 'win32') {
    const currentSid = getCurrentUserSid();

    const aclSet = spawnSync('icacls', [filePath, '/inheritance:r', '/grant:r', `*${currentSid}:(R,W)`], { encoding: 'utf8' });
    if (aclSet.status !== 0) {
      try { fs.unlinkSync(filePath); } catch (_) {}
      activePgPassFiles.delete(filePath);
      throw new Error(`FATAL: icacls modification failed on PGPASS file (exit code ${aclSet.status}): ${aclSet.stderr}`);
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

// Asynchronous pg_dump runner with coordinated lifecycle
function runAsyncPgDump(args, envVars) {
  return new Promise((resolve, reject) => {
    let isSettled = false;
    const proc = spawn(pgDumpBin, args, { env: envVars });

    activePgDumpProc = proc;
    pgDumpClosePromise = new Promise((res) => { pgDumpResolveClose = res; });

    let stderr = '';
    if (proc.stderr) {
      proc.stderr.on('data', (d) => { stderr += d.toString(); });
    }

    proc.on('error', (err) => {
      if (!proc.pid) {
        activePgDumpProc = null;
        if (pgDumpResolveClose) pgDumpResolveClose({ code: null, signal: null });
        if (!isSettled) {
          isSettled = true;
          reject(new Error(`Failed to spawn pg_dump (no process created): ${err.message}`));
        }
      } else {
        if (!isSettled) {
          isSettled = true;
          reject(new Error(`pg_dump process error (PID ${proc.pid}): ${err.message}`));
        }
      }
    });

    proc.on('close', (code, signal) => {
      activePgDumpProc = null;
      if (pgDumpResolveClose) pgDumpResolveClose({ code, signal });
      if (!isSettled) {
        isSettled = true;
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`pg_dump failed with exit code ${code}${signal ? ` (signal ${signal})` : ''}: ${stderr}`));
        }
      }
    });
  });
}

// Asynchronous pg_restore runner with bounded timeout and verified process termination
function runAsyncPgRestore(args, envVars, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    let isSettled = false;
    let timeoutTimer = null;

    const proc = spawn(pgRestoreBin, args, { env: envVars });
    activePgRestoreProc = proc;
    pgRestoreClosePromise = new Promise((res) => { pgRestoreResolveClose = res; });

    let stderr = '';
    if (proc.stderr) {
      proc.stderr.on('data', (d) => { stderr += d.toString(); });
    }

    timeoutTimer = setTimeout(async () => {
      if (!isSettled) {
        isSettled = true;
        console.error(`\n🚨 pg_restore exceeded ${timeoutMs / 1000}s limit. Enforcing process-tree termination...`);
        let terminationError = null;
        try {
          await cancelActivePgRestore();
        } catch (termErr) {
          terminationError = termErr;
          console.error('Failed to confirm termination of timed-out pg_restore process:', termErr.message);
        }

        if (terminationError) {
          reject(new Error(`pg_restore timed out after ${timeoutMs / 1000}s, but process termination COULD NOT BE CONFIRMED (PID ${proc.pid || 'unknown'} may still be running). Reference retained to preserve staging artifacts.`));
        } else {
          reject(new Error(`pg_restore timed out after ${timeoutMs / 1000} seconds and was successfully terminated.`));
        }
      }
    }, timeoutMs);

    proc.on('error', (err) => {
      if (!proc.pid) {
        activePgRestoreProc = null;
        if (timeoutTimer) clearTimeout(timeoutTimer);
        if (pgRestoreResolveClose) pgRestoreResolveClose({ code: null, signal: null });
        if (!isSettled) {
          isSettled = true;
          reject(new Error(`Failed to spawn pg_restore (no process created): ${err.message}`));
        }
      } else {
        if (!isSettled) {
          isSettled = true;
          if (timeoutTimer) clearTimeout(timeoutTimer);
          reject(new Error(`pg_restore process error (PID ${proc.pid}): ${err.message}`));
        }
      }
    });

    proc.on('close', (code, signal) => {
      activePgRestoreProc = null;
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (pgRestoreResolveClose) pgRestoreResolveClose({ code, signal });
      if (!isSettled) {
        isSettled = true;
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`pg_restore failed with exit code ${code}${signal ? ` (signal ${signal})` : ''}: ${stderr}`));
        }
      }
    });
  });
}

// Extract endpoint identifier from Neon hostname
function extractNeonEndpoint(hostname) {
  const match = hostname.match(/^(ep-[a-z0-9-]+?)(?:-pooler)?\./i);
  return match ? match[1].toLowerCase() : hostname.toLowerCase();
}

// Complete Bidirectional Foreign-Key Set Verification
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
    if (!discoveredMap.has(r.constraint_name)) {
      discoveredMap.set(r.constraint_name, []);
    }
    discoveredMap.get(r.constraint_name).push(r);
  }

  const expectedMap = new Map();
  for (const exp of EXPECTED_FOREIGN_KEYS) {
    expectedMap.set(exp.name, exp);
  }

  const discrepancies = [];

  // 1. Detect missing constraints
  for (const [name, exp] of expectedMap.entries()) {
    if (!discoveredMap.has(name)) {
      discrepancies.push(`MISSING CONSTRAINT: '${name}' (${exp.srcTbl}.${exp.srcCol} -> ${exp.refTbl}.${exp.refCol}) not found in database catalog.`);
    }
  }

  // 2. Detect unexpected constraints in public schema
  for (const [name, rowList] of discoveredMap.entries()) {
    if (!expectedMap.has(name)) {
      const sample = rowList[0];
      discrepancies.push(`UNEXPECTED CONSTRAINT: '${name}' on table '${sample.source_table}' was discovered in database catalog but is not in expected schema.`);
    }
  }

  // 3. Detect invalid, unvalidated, or mismatched constraints
  for (const [name, exp] of expectedMap.entries()) {
    const rowList = discoveredMap.get(name);
    if (!rowList) continue;

    for (const act of rowList) {
      if (act.constraint_type !== 'f') {
        discrepancies.push(`INVALID CONSTRAINT TYPE: '${name}' has type '${act.constraint_type}', expected 'f'.`);
      }
      if (!act.is_validated) {
        discrepancies.push(`UNVALIDATED CONSTRAINT: '${name}' has convalidated = false.`);
      }
      if (act.source_table !== exp.srcTbl) {
        discrepancies.push(`TABLE MISMATCH on '${name}': source table is '${act.source_table}', expected '${exp.srcTbl}'.`);
      }
      if (act.referenced_table !== exp.refTbl) {
        discrepancies.push(`TABLE MISMATCH on '${name}': referenced table is '${act.referenced_table}', expected '${exp.refTbl}'.`);
      }
      if (act.source_column !== exp.srcCol) {
        discrepancies.push(`COLUMN MISMATCH on '${name}': source column is '${act.source_column}', expected '${exp.srcCol}'.`);
      }
      if (act.referenced_column !== exp.refCol) {
        discrepancies.push(`COLUMN MISMATCH on '${name}': referenced column is '${act.referenced_column}', expected '${exp.refCol}'.`);
      }
    }
  }

  // 4. Verify total constraint counts match
  if (discoveredMap.size !== expectedMap.size) {
    discrepancies.push(`COUNT MISMATCH: Discovered ${discoveredMap.size} foreign-key constraints in public schema, expected exactly ${expectedMap.size}.`);
  }

  if (discrepancies.length > 0) {
    throw new Error(`Comprehensive foreign-key catalog verification failed:\n - ${discrepancies.join('\n - ')}`);
  }
}

async function runBackup() {
  isBackupRunning = true;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  console.log('================================================================');
  console.log('DocAvail — Production Database Pre-Migration Backup & Audit');
  console.log('Timestamp:', timestamp);
  console.log('================================================================\n');

  let backupError = null;

  try {
    if (shutdownRequested) throw shutdownReason;

    // -------------------------------------------------------------------------
    // STEP 1: Environment Loading & Independent Binary Resolution
    // -------------------------------------------------------------------------
    console.log('[Step 1/8] Loading environment and verifying system prerequisites...');
    loadEnvironment();

    pgDumpBin = resolvePgBinary('pg_dump');
    pgRestoreBin = resolvePgBinary('pg_restore');

    if (!pgDumpBin || !pgRestoreBin) {
      const missing = [];
      if (!pgDumpBin) missing.push('pg_dump');
      if (!pgRestoreBin) missing.push('pg_restore');
      throw new Error(`FATAL PREREQUISITE MISSING: ${missing.join(', ')} not found. Configure PG_DUMP_PATH / PG_RESTORE_PATH in .env or add to PATH.`);
    }

    const pyCheck = spawnSync('python', ['--version'], { encoding: 'utf8' });
    if (pyCheck.status !== 0) {
      throw new Error('FATAL PREREQUISITE MISSING: Python 3 is required for non-locking SQLite online backup.');
    }

    const localDevDb = path.join(process.cwd(), 'prisma', 'dev.db');
    const allowPgOnly = process.env.ALLOW_POSTGRES_ONLY_BACKUP === 'true';
    if (!fs.existsSync(localDevDb) && !allowPgOnly) {
      throw new Error(`FATAL: Mandatory SQLite database '${localDevDb}' not found. Set ALLOW_POSTGRES_ONLY_BACKUP=true only if intentional.`);
    }

    const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('FATAL: Neither DIRECT_URL nor DATABASE_URL found in .env.');
    }

    const prodUrl = new URL(connectionString);
    const prodParamsEnv = auditConnectionParams(prodUrl);

    console.log(`✅ Located pg_dump: ${pgDumpBin}`);
    console.log(`✅ Located pg_restore: ${pgRestoreBin}`);
    console.log(`✅ Located Python: ${pyCheck.stdout.trim() || pyCheck.stderr.trim()}`);
    console.log(`✅ Local SQLite store confirmed: ${fs.existsSync(localDevDb) ? 'Present' : 'Bypassed via opt-in'}\n`);

    if (shutdownRequested) throw shutdownReason;

    // -------------------------------------------------------------------------
    // STEP 2: Staging Lifecycle Setup
    // -------------------------------------------------------------------------
    const backupRootDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupRootDir)) fs.mkdirSync(backupRootDir, { recursive: true });

    const stagingDir = path.join(backupRootDir, `backup_set_${timestamp}.staging`);
    const finalDir = path.join(backupRootDir, `backup_set_${timestamp}`);

    if (fs.existsSync(stagingDir)) {
      throw new Error(`FATAL: Staging directory '${stagingDir}' already exists. Aborting.`);
    }
    if (fs.existsSync(finalDir)) {
      throw new Error(`FATAL: Destination directory '${finalDir}' already exists. Aborting.`);
    }

    fs.mkdirSync(stagingDir);
    trackedStagingDirs.add(stagingDir);

    const jsonPath = path.join(stagingDir, 'neon_production.json');
    const dumpPath = path.join(stagingDir, 'neon_production.dump');
    const sqlitePath = path.join(stagingDir, 'sqlite_dev_consistent.db');
    const manifestPath = path.join(stagingDir, 'manifest.json');
    const markerPath = path.join(stagingDir, 'BACKUP_COMPLETE');

    const securePgPass = createSecurePgPass(prodUrl);

    globalPrisma = new PrismaClient({
      datasources: { db: { url: connectionString } },
    });

    if (shutdownRequested) throw shutdownReason;

    // -------------------------------------------------------------------------
    // STEP 3: Mandatory Shared PostgreSQL Snapshot Export
    // -------------------------------------------------------------------------
    console.log('[Step 2/8] Establishing mandatory shared RepeatableRead snapshot on Neon PostgreSQL...');
    
    let snapshotData = null;
    let baselineCounts = null;
    let sharedSnapshotId = null;

    await globalPrisma.$transaction(async (tx) => {
      if (shutdownRequested) throw shutdownReason;

      const snapResult = await tx.$queryRawUnsafe('SELECT pg_export_snapshot() as snap_id;');
      if (!snapResult || !snapResult[0] || !snapResult[0].snap_id) {
        throw new Error('FATAL: pg_export_snapshot() did not return a valid snapshot identifier. Aborting backup.');
      }
      sharedSnapshotId = snapResult[0].snap_id;
      console.log(`✅ Shared PostgreSQL Snapshot exported: ${sharedSnapshotId}`);

      baselineCounts = {
        User: await tx.user.count(),
        PatientProfile: await tx.patientProfile.count(),
        DoctorProfile: await tx.doctorProfile.count(),
        WorkingHours: await tx.workingHours.count(),
        Appointment: await tx.appointment.count(),
        MedicalRecord: await tx.medicalRecord.count(),
        Prescription: await tx.prescription.count(),
        DoctorPatientAccess: await tx.doctorPatientAccess.count(),
        AppointmentSlot: await tx.appointmentSlot.count(),
        ReportedAccount: await tx.reportedAccount.count(),
        Review: await tx.review.count(),
      };

      snapshotData = {
        User: await tx.user.findMany(),
        PatientProfile: await tx.patientProfile.findMany(),
        DoctorProfile: await tx.doctorProfile.findMany(),
        WorkingHours: await tx.workingHours.findMany(),
        AppointmentSlot: await tx.appointmentSlot.findMany(),
        Appointment: await tx.appointment.findMany(),
        MedicalRecord: await tx.medicalRecord.findMany(),
        Prescription: await tx.prescription.findMany(),
        DoctorPatientAccess: await tx.doctorPatientAccess.findMany(),
        ReportedAccount: await tx.reportedAccount.findMany(),
        Review: await tx.review.findMany(),
      };

      if (shutdownRequested) throw shutdownReason;

      // -----------------------------------------------------------------------
      // STEP 4: Asynchronous pg_dump Execution within Active Snapshot
      // -----------------------------------------------------------------------
      console.log('[Step 3/8] Executing asynchronous pg_dump (-Fc) using shared snapshot...');
      
      const decodedDbName = decodeURIComponent(prodUrl.pathname.replace(/^\//, ''));
      const decodedUsername = decodeURIComponent(prodUrl.username);

      const dumpArgs = [
        '--host', prodUrl.hostname,
        '--port', prodUrl.port || '5432',
        '--username', decodedUsername,
        '--dbname', decodedDbName,
        '--format=c',
        '--no-password',
        `--snapshot=${sharedSnapshotId}`,
        '--file', dumpPath,
      ];

      const pgEnv = {
        ...process.env,
        PGPASSFILE: securePgPass,
        ...prodParamsEnv,
      };

      try {
        await runAsyncPgDump(dumpArgs, pgEnv);
      } catch (dumpErr) {
        await cancelActivePgDump();
        throw dumpErr;
      }
      console.log('✅ Coordinated pg_dump completed successfully within shared snapshot.');
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      timeout: 120000,
    });

    const dumpSize = fs.statSync(dumpPath).size;
    if (dumpSize === 0) throw new Error('pg_dump produced a 0-byte archive.');
    console.log(`✅ pg_dump binary archive validated: ${(dumpSize / 1024).toFixed(2)} KB.`);

    if (shutdownRequested) throw shutdownReason;

    // -------------------------------------------------------------------------
    // STEP 5: Strict Baseline Verification (Zero Tolerance)
    // -------------------------------------------------------------------------
    console.log('\n[Step 4/8] Asserting baseline count parity (Expected: 89 records)...');
    let hasDiscrepancy = false;
    const discrepancies = [];
    let actualTotal = 0;

    for (const [table, expected] of Object.entries(REQUIRED_BASELINE)) {
      const actual = baselineCounts[table];
      actualTotal += actual;
      if (actual !== expected) {
        hasDiscrepancy = true;
        discrepancies.push({ table, expected, actual, delta: actual - expected });
      }
    }

    if (hasDiscrepancy || actualTotal !== EXPECTED_TOTAL) {
      console.error('\n🚨 BASELINE VERIFICATION FAILED: Live database counts deviate from baseline:');
      console.table(discrepancies);
      throw new Error(`Live database baseline mismatch. Expected ${EXPECTED_TOTAL}, got ${actualTotal}`);
    }
    console.log('✅ Baseline count parity verified across all 11 tables.\n');

    fs.writeFileSync(jsonPath, JSON.stringify(snapshotData, null, 2), 'utf8');

    const restoreToc = spawnSync(pgRestoreBin, ['--list', dumpPath], { encoding: 'utf8' });
    if (restoreToc.status !== 0 || !restoreToc.stdout.includes('TABLE DATA')) {
      throw new Error(`pg_restore TOC validation failed: ${restoreToc.stderr}`);
    }
    console.log('✅ pg_restore archive TOC verified successfully.\n');

    if (shutdownRequested) throw shutdownReason;

    // -------------------------------------------------------------------------
    // STEP 6: In-Memory JSON Verification & Comprehensive pg_constraint Audit
    // -------------------------------------------------------------------------
    console.log('[Step 5/8] Auditing relational foreign-key integrity in data and pg_constraint catalog...');
    const reParsed = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    for (const [table, expected] of Object.entries(REQUIRED_BASELINE)) {
      if (reParsed[table].length !== expected) {
        throw new Error(`Re-parse count mismatch on ${table}: expected ${expected}, got ${reParsed[table].length}`);
      }
    }

    const userIds = new Set(reParsed.User.map(u => u.id));
    const patientIds = new Set(reParsed.PatientProfile.map(p => p.id));
    const doctorIds = new Set(reParsed.DoctorProfile.map(d => d.id));

    for (const p of reParsed.PatientProfile) {
      if (!userIds.has(p.userId)) throw new Error(`Orphaned PatientProfile ${p.id} -> User ${p.userId}`);
    }
    for (const d of reParsed.DoctorProfile) {
      if (!userIds.has(d.userId)) throw new Error(`Orphaned DoctorProfile ${d.id} -> User ${d.userId}`);
    }
    for (const m of reParsed.MedicalRecord) {
      if (!patientIds.has(m.patientId)) throw new Error(`Orphaned MedicalRecord ${m.id} -> Patient ${m.patientId}`);
      if (m.doctorId && !doctorIds.has(m.doctorId)) throw new Error(`Orphaned MedicalRecord ${m.id} -> Doctor ${m.doctorId}`);
    }
    for (const rx of reParsed.Prescription) {
      if (!patientIds.has(rx.patientId)) throw new Error(`Orphaned Prescription ${rx.id} -> Patient ${rx.patientId}`);
      if (!doctorIds.has(rx.doctorId)) throw new Error(`Orphaned Prescription ${rx.id} -> Doctor ${rx.doctorId}`);
    }
    for (const acc of reParsed.DoctorPatientAccess) {
      if (!patientIds.has(acc.patientId)) throw new Error(`Orphaned Access grant ${acc.id} -> Patient ${acc.patientId}`);
      if (!doctorIds.has(acc.doctorId)) throw new Error(`Orphaned Access grant ${acc.id} -> Doctor ${acc.doctorId}`);
    }
    for (const a of reParsed.Appointment) {
      if (!userIds.has(a.patientId)) throw new Error(`Orphaned Appointment ${a.id} -> Patient User ${a.patientId}`);
      if (!doctorIds.has(a.doctorId)) throw new Error(`Orphaned Appointment ${a.id} -> Doctor ${a.doctorId}`);
    }
    for (const w of reParsed.WorkingHours) {
      if (!doctorIds.has(w.doctorId)) throw new Error(`Orphaned WorkingHours ${w.id} -> Doctor ${w.doctorId}`);
    }
    for (const s of reParsed.AppointmentSlot) {
      if (!doctorIds.has(s.doctorId)) throw new Error(`Orphaned Slot ${s.id} -> Doctor ${s.doctorId}`);
    }
    for (const r of reParsed.ReportedAccount) {
      if (!userIds.has(r.reporterId)) throw new Error(`Orphaned Report ${r.id} -> Reporter ${r.reporterId}`);
      if (!userIds.has(r.reportedUserId)) throw new Error(`Orphaned Report ${r.id} -> Target ${r.reportedUserId}`);
    }
    for (const rev of reParsed.Review) {
      if (!userIds.has(rev.patientId)) throw new Error(`Orphaned Review ${rev.id} -> Patient ${rev.patientId}`);
      if (!doctorIds.has(rev.doctorId)) throw new Error(`Orphaned Review ${rev.id} -> Doctor ${rev.doctorId}`);
    }
    console.log('✅ In-memory relational integrity audit passed (16/16 relationship paths valid in data).');

    await verifyPgConstraints(globalPrisma);
    console.log('✅ Live PostgreSQL pg_constraint audit passed (all 16 foreign keys verified; no missing, unexpected, or invalid constraints).\n');

    if (shutdownRequested) throw shutdownReason;

    // -------------------------------------------------------------------------
    // STEP 7: Non-Locking SQLite Online Backup & 11-Table Baseline Audit
    // -------------------------------------------------------------------------
    console.log('[Step 6/8] Executing SQLite read-only baseline audit and online backup...');
    let sqliteCreated = false;

    if (fs.existsSync(localDevDb)) {
      const pythonScript = `
import sqlite3, sys, pathlib

REQUIRED_BASELINE = {
    'User': 11, 'PatientProfile': 5, 'DoctorProfile': 5,
    'WorkingHours': 25, 'Appointment': 10, 'MedicalRecord': 20,
    'Prescription': 7, 'DoctorPatientAccess': 6,
    'AppointmentSlot': 0, 'ReportedAccount': 0, 'Review': 0
}

src_path = sys.argv[1]
dst_path = sys.argv[2]

src_uri = pathlib.Path(src_path).resolve().as_uri() + "?mode=ro"
src = sqlite3.connect(src_uri, uri=True)

cur = src.cursor()
cur.execute('PRAGMA integrity_check;')
res = cur.fetchone()[0]
if res != 'ok':
    sys.exit(f'SQLite source integrity check failed: {res}')

discrepancies = []
for tbl, exp in REQUIRED_BASELINE.items():
    cur.execute(f'SELECT count(*) FROM "{tbl}"')
    act = cur.fetchone()[0]
    if act != exp:
        discrepancies.append(f"{tbl}: expected {exp}, got {act}")

if discrepancies:
    sys.exit("SQLite baseline mismatch: " + "; ".join(discrepancies))

dst = sqlite3.connect(dst_path)
src.backup(dst)
dst.close()
src.close()

verify = sqlite3.connect(dst_path)
cur2 = verify.cursor()
cur2.execute('PRAGMA integrity_check;')
res2 = cur2.fetchone()[0]
verify.close()

if res2 != 'ok':
    sys.exit(f'SQLite backup integrity check failed: {res2}')
`;
      const pyResult = spawnSync('python', ['-c', pythonScript, localDevDb, sqlitePath], { encoding: 'utf8' });
      if (pyResult.status !== 0) {
        throw new Error(`FATAL: SQLite baseline audit or backup failed:\n${pyResult.stderr || pyResult.stdout}`);
      }

      const sqliteSize = fs.statSync(sqlitePath).size;
      if (sqliteSize === 0) {
        throw new Error('FATAL: SQLite online backup produced a 0-byte file.');
      }
      sqliteCreated = true;
      console.log(`✅ SQLite read-only baseline audit passed (all 11 tables match baseline).`);
      console.log(`✅ SQLite consistent snapshot verified: ${(sqliteSize / 1024).toFixed(2)} KB (PRAGMA integrity_check: ok).\n`);
    } else {
      console.log('ℹ️ SQLite database skipped per explicit opt-in (ALLOW_POSTGRES_ONLY_BACKUP=true).\n');
    }

    if (shutdownRequested) throw shutdownReason;

    // -------------------------------------------------------------------------
    // STEP 8: Strict Restore-Target Isolation & Post-Restore Verification
    // -------------------------------------------------------------------------
    console.log('[Step 7/8] Evaluating live restore test requirements...');
    let restoreManifestStatus = 'BACKUP_VERIFIED_RESTORE_TEST_PENDING';

    if (process.env.RESTORE_TEST_DATABASE_URL) {
      console.log('Validating RESTORE_TEST_DATABASE_URL destination identity...');
      const testUrl = new URL(process.env.RESTORE_TEST_DATABASE_URL);
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
          'FATAL CONFIGURATION ERROR: Live restore test requires BOTH DISPOSABLE_RESTORE_TARGET_ENDPOINT_ID ' +
          'and DISPOSABLE_RESTORE_TARGET_DB_NAME to be explicitly configured in .env.'
        );
      }

      if (testEndpoint !== declaredTargetEndpoint || testDbName !== declaredTargetDb) {
        throw new Error(
          `FATAL SAFETY VIOLATION: Test destination identity mismatch. The target endpoint and database ` +
          `must strictly match DISPOSABLE_RESTORE_TARGET_ENDPOINT_ID and DISPOSABLE_RESTORE_TARGET_DB_NAME.`
        );
      }

      console.log(`Verified designated disposable target: Endpoint '${testEndpoint}', DB '${testDbName}'`);
      
      // Surgical Correction: testPgPass remains registered in activePgPassFiles;
      // unlinking is strictly delegated to central performCleanup() after process termination.
      const testPgPass = createSecurePgPass(testUrl);

      const restoreArgs = [
        '--host', testUrl.hostname,
        '--port', testUrl.port || '5432',
        '--username', decodeURIComponent(testUrl.username),
        '--dbname', testDbName,
        '--clean',
        '--if-exists',
        '--exit-on-error',
        '--no-password',
        dumpPath,
      ];

      const testPgEnv = {
        ...process.env,
        PGPASSFILE: testPgPass,
        ...testParamsEnv,
      };

      await runAsyncPgRestore(restoreArgs, testPgEnv, 120000);

      const testPrisma = new PrismaClient({ datasources: { db: { url: process.env.RESTORE_TEST_DATABASE_URL } } });
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

        for (const [table, expected] of Object.entries(REQUIRED_BASELINE)) {
          if (testCounts[table] !== expected) {
            throw new Error(`Restored test database count mismatch on ${table}: expected ${expected}, got ${testCounts[table]}`);
          }
        }

        await verifyPgConstraints(testPrisma);

        restoreManifestStatus = 'BACKUP_AND_LIVE_RESTORE_VERIFIED_PASSED';
        console.log(`✅ Live restoration verified: All 11 tables match baseline (89 records) and all 16 foreign-key constraints validated in catalog.`);
      } finally {
        await testPrisma.$disconnect();
      }
    } else {
      console.log('ℹ️ RESTORE_TEST_DATABASE_URL not configured. Recording status: BACKUP_VERIFIED_RESTORE_TEST_PENDING.');
    }

    if (shutdownRequested) throw shutdownReason;

    // -------------------------------------------------------------------------
    // STEP 9: Streaming SHA-256 Checksum Computation & Directory Promotion
    // -------------------------------------------------------------------------
    console.log('\n[Step 8/8] Computing streaming SHA-256 checksums, validating artifacts, and promoting staging directory...');

    if (fs.existsSync(finalDir)) {
      throw new Error(`FATAL: Destination backup directory '${finalDir}' already exists. Overwrite strictly prevented.`);
    }

    const jsonSha256 = await computeFileSha256(jsonPath);
    const dumpSha256 = await computeFileSha256(dumpPath);
    const sqliteSha256 = sqliteCreated ? await computeFileSha256(sqlitePath) : null;

    const manifestContent = {
      status: restoreManifestStatus,
      timestamp,
      baselineTotal: EXPECTED_TOTAL,
      actualTotal,
      tableCounts: baselineCounts,
      sharedSnapshotId,
      files: {
        jsonExport: {
          filename: 'neon_production.json',
          sizeBytes: fs.statSync(jsonPath).size,
          sha256: jsonSha256,
        },
        pgDumpArchive: {
          filename: 'neon_production.dump',
          sizeBytes: fs.statSync(dumpPath).size,
          sha256: dumpSha256,
        },
        sqliteSnapshot: sqliteCreated ? {
          filename: 'sqlite_dev_consistent.db',
          sizeBytes: fs.statSync(sqlitePath).size,
          sha256: sqliteSha256,
        } : null,
      },
      foreignKeyAudit: 'ALL_16_CONSTRAINTS_VALIDATED_IN_PG_CATALOG_VIA_ORDINALITY',
      sqliteIntegrityCheck: sqliteCreated ? 'PRAGMA_OK_AND_BASELINE_VERIFIED' : 'SKIPPED_OPT_IN',
      liveRestoreStatus: restoreManifestStatus,
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifestContent, null, 2), 'utf8');
    fs.writeFileSync(markerPath, `BACKUP_COMPLETED_AT=${new Date().toISOString()}\nSTATUS=${restoreManifestStatus}\n`, 'utf8');

    fs.renameSync(stagingDir, finalDir);
    trackedStagingDirs.delete(stagingDir);

    console.log('================================================================');
    console.log('🎉 PRE-MIGRATION BACKUP & AUDIT COMPLETED');
    console.log(`Manifest Status:      ${restoreManifestStatus}`);
    console.log(`Shared Snapshot ID:   ${sharedSnapshotId}`);
    console.log(`Backup Directory:     ${path.basename(finalDir)}`);
    console.log(`Completion Marker:    ${path.join(finalDir, 'BACKUP_COMPLETE')}`);
    console.log(`JSON SHA-256:         ${jsonSha256}`);
    console.log(`Dump SHA-256:         ${dumpSha256}`);
    if (sqliteSha256) console.log(`SQLite SHA-256:       ${sqliteSha256}`);
    console.log('================================================================\n');

  } catch (err) {
    backupError = err;
  } finally {
    isBackupRunning = false;
    if (unwindSafetyTimer) {
      clearTimeout(unwindSafetyTimer);
      unwindSafetyTimer = null;
    }
    await executeUnifiedShutdown(backupError);
  }
}

runBackup();
