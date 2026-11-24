/**
 * DocAvail Isolated Local PostgreSQL 18 Development Database Manager
 *
 * Uses the portable PostgreSQL 18 toolchain in `tools/pgsql18` on `127.0.0.1:54322`
 * storing data in `.local-pgdata/` (gitignored) so local manual testing NEVER writes to Neon production.
 *
 * Usage:
 *   node scripts/local_dev_db.mjs up      - Start (and initialize if new) the local PG 18 cluster
 *   node scripts/local_dev_db.mjs status  - Check cluster status and row counts
 *   node scripts/local_dev_db.mjs stop    - Stop the local PG 18 cluster cleanly
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const repoDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pgBinDir = path.join(repoDir, 'tools', 'pgsql18', 'pgsql', 'bin');
const dataDir = path.join(repoDir, '.local-pgdata');
const logFile = path.join(dataDir, 'postgresql.log');
const pwFile = path.join(repoDir, '.local-pgpass.tmp');

const PG_HOST = '127.0.0.1';
const PG_PORT = 54322;
const DB_NAME = 'docavail_local';
const LOCAL_DB_URL = `postgresql://postgres:docavail_local@${PG_HOST}:${PG_PORT}/${DB_NAME}`;

function assertLocalOnly(urlStr) {
  const host = new URL(urlStr).hostname;
  if (host !== '127.0.0.1' && host !== 'localhost') {
    throw new Error(`Refusing non-local database host: ${host}`);
  }
}

function runChecked(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { encoding: 'utf8', stdio: 'inherit', ...opts });
  if (res.status !== 0) {
    throw new Error(`Command failed (${res.status}): ${path.basename(cmd)} ${args.join(' ')}`);
  }
}

function isRunning() {
  if (!fs.existsSync(dataDir)) return false;
  const res = spawnSync(path.join(pgBinDir, 'pg_ctl.exe'), ['-D', dataDir, 'status'], {
    encoding: 'utf8',
  });
  return res.status === 0;
}

async function seedIfEmpty() {
  assertLocalOnly(LOCAL_DB_URL);
  const prisma = new PrismaClient({ datasources: { db: { url: LOCAL_DB_URL } } });
  try {
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      console.log(`[local-db] Existing local data preserved (${userCount} users).`);
      return;
    }

    const demoPassHash = await bcrypt.hash('password123', 10);

    await prisma.user.create({
      data: {
        email: 'admin@docavail.com',
        name: 'DocAvail System Admin',
        passwordHash: demoPassHash,
        role: 'ADMIN',
        approvalStatus: 'APPROVED',
        approvedAt: new Date(),
        reviewedAt: new Date(),
      },
    });

    const patients = [
      { name: 'Aanya Sharma', email: 'aanya.sharma@example.com', location: 'Gandhi Nagar, Jammu' },
      { name: 'Rohan Mehta', email: 'rohan.mehta@example.com', location: 'Karan Nagar, Srinagar' },
      { name: 'Priya Verma', email: 'priya.verma@example.com', location: 'Kathua, Jammu Division' },
      { name: 'Arjun Kapoor', email: 'arjun.kapoor@example.com', location: 'Udhampur, Jammu Division' },
      { name: 'Meera Singh', email: 'meera.singh@example.com', location: 'Baramulla, Kashmir Division' },
    ];

    for (const p of patients) {
      await prisma.user.create({
        data: {
          email: p.email,
          name: p.name,
          passwordHash: demoPassHash,
          role: 'PATIENT',
          approvalStatus: 'APPROVED',
          approvedAt: new Date(),
          patientProfile: { create: { location: p.location } },
        },
      });
    }

    const doctors = [
      {
        name: 'Dr. Ananya Rao',
        email: 'dr.ananya.rao@docavail.com',
        specialization: 'Endocrinology',
        qualification: 'MBBS, MD, DM',
        experience: 12,
        licenseNumber: 'JKMC-2014-8821',
        fee: 600,
        clinicName: 'Jammu Endocrine Care',
        clinicAddress: 'Gandhi Nagar, Jammu',
        city: 'Jammu',
        district: 'Jammu',
        division: 'Jammu',
        conditions: 'Type 2 Diabetes, Thyroid disorders',
      },
      {
        name: 'Dr. Rahul Khanna',
        email: 'dr.rahul.khanna@docavail.com',
        specialization: 'Pulmonology',
        qualification: 'MBBS, MD (Pulmonary Medicine)',
        experience: 10,
        licenseNumber: 'JKMC-2016-3104',
        fee: 550,
        clinicName: 'Srinagar Chest & Asthma Clinic',
        clinicAddress: 'Karan Nagar, Srinagar',
        city: 'Srinagar',
        district: 'Srinagar',
        division: 'Kashmir',
        conditions: 'Asthma, COPD, Respiratory allergies',
      },
      {
        name: 'Dr. Neha Kapoor',
        email: 'dr.neha.kapoor@docavail.com',
        specialization: 'Obstetrics and Gynaecology',
        qualification: 'MBBS, MS (OBG)',
        experience: 9,
        licenseNumber: 'JKMC-2017-5520',
        fee: 500,
        clinicName: 'Trikuta Women Care',
        clinicAddress: 'Channi Himmat, Jammu',
        city: 'Jammu',
        district: 'Jammu',
        division: 'Jammu',
        conditions: 'PCOS, Prenatal care',
      },
      {
        name: 'Dr. Arjun Malhotra',
        email: 'dr.arjun.malhotra@docavail.com',
        specialization: 'Neurology',
        qualification: 'MBBS, MD, DM (Neurology)',
        experience: 14,
        licenseNumber: 'JKMC-2012-1940',
        fee: 800,
        clinicName: 'Dal Lake Neuro Centre',
        clinicAddress: 'Residency Road, Srinagar',
        city: 'Srinagar',
        district: 'Srinagar',
        division: 'Kashmir',
        conditions: 'Migraine, Epilepsy, Neuropathy',
      },
      {
        name: 'Dr. Kavita Sharma',
        email: 'dr.kavita.sharma@docavail.com',
        specialization: 'Internal Medicine',
        qualification: 'MBBS, MD (Medicine)',
        experience: 11,
        licenseNumber: 'JKMC-2015-7743',
        fee: 450,
        clinicName: 'Udhampur City Clinic',
        clinicAddress: 'Court Road, Udhampur',
        city: 'Udhampur',
        district: 'Udhampur',
        division: 'Jammu',
        conditions: 'Iron-Deficiency Anaemia, Hypertension, Fever',
      },
    ];

    for (const d of doctors) {
      await prisma.user.create({
        data: {
          email: d.email,
          name: d.name,
          passwordHash: demoPassHash,
          role: 'DOCTOR',
          approvalStatus: 'APPROVED',
          approvedAt: new Date(),
          doctorProfile: {
            create: {
              specialization: d.specialization,
              qualification: d.qualification,
              experience: d.experience,
              licenseNumber: d.licenseNumber,
              verificationStatus: 'APPROVED',
              consultationFee: d.fee,
              clinicName: d.clinicName,
              clinicAddress: d.clinicAddress,
              city: d.city,
              district: d.district,
              division: d.division,
              treatedConditions: d.conditions,
            },
          },
        },
      });
    }

    console.log('[local-db] Seeded isolated demo accounts (admin, 5 patients, 5 doctors).');
  } finally {
    await prisma.$disconnect();
  }
}

async function cmdUp() {
  assertLocalOnly(LOCAL_DB_URL);
  const firstInit = !fs.existsSync(path.join(dataDir, 'PG_VERSION'));

  if (firstInit) {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(pwFile, 'docavail_local\n', 'utf8');
    try {
      runChecked(path.join(pgBinDir, 'initdb.exe'), [
        '-D',
        dataDir,
        '-U',
        'postgres',
        '--auth=scram-sha-256',
        `--pwfile=${pwFile}`,
        '-E',
        'UTF8',
      ]);
    } finally {
      if (fs.existsSync(pwFile)) fs.unlinkSync(pwFile);
    }
  }

  if (!isRunning()) {
    runChecked(path.join(pgBinDir, 'pg_ctl.exe'), [
      '-D',
      dataDir,
      '-l',
      logFile,
      '-o',
      `-p ${PG_PORT} -h ${PG_HOST}`,
      'start',
    ]);
  } else {
    console.log(`[local-db] PostgreSQL 18 already running on ${PG_HOST}:${PG_PORT}.`);
  }

  const pgEnv = { ...process.env, PGPASSWORD: 'docavail_local' };
  const dbCheck = spawnSync(
    path.join(pgBinDir, 'psql.exe'),
    ['-h', PG_HOST, '-p', String(PG_PORT), '-U', 'postgres', '-lqt'],
    { encoding: 'utf8', env: pgEnv }
  );

  if (!dbCheck.stdout || !dbCheck.stdout.includes(DB_NAME)) {
    runChecked(
      path.join(pgBinDir, 'createdb.exe'),
      ['-h', PG_HOST, '-p', String(PG_PORT), '-U', 'postgres', DB_NAME],
      { env: pgEnv }
    );
  }

  // Apply Prisma migrations idempotently to local DB only
  runChecked('npx', ['prisma', 'migrate', 'deploy'], {
    cwd: repoDir,
    env: {
      ...process.env,
      DATABASE_URL: LOCAL_DB_URL,
      DIRECT_URL: LOCAL_DB_URL,
    },
    shell: true,
  });

  const prismaCheck = new PrismaClient({ datasources: { db: { url: LOCAL_DB_URL } } });
  let existingFacilities = 0;
  try {
    existingFacilities = await prismaCheck.healthcareFacility.count();
  } finally {
    await prismaCheck.$disconnect();
  }

  if (existingFacilities === 0) {
    runChecked('npx', ['tsx', 'scripts/ingest_production_facilities.ts'], {
      cwd: repoDir,
      env: {
        ...process.env,
        DATABASE_URL: LOCAL_DB_URL,
        DIRECT_URL: LOCAL_DB_URL,
      },
      shell: true,
    });
  } else {
    console.log(`[local-db] Existing local facilities preserved (${existingFacilities} records).`);
  }

  await seedIfEmpty();
  console.log(`[local-db] Ready at ${PG_HOST}:${PG_PORT}/${DB_NAME} (isolated from production Neon).`);
}

function cmdStop() {
  if (!isRunning()) {
    console.log('[local-db] Local PostgreSQL 18 is already stopped.');
    return;
  }
  runChecked(path.join(pgBinDir, 'pg_ctl.exe'), ['-D', dataDir, 'stop', '-m', 'fast']);
}

async function cmdStatus() {
  const running = isRunning();
  console.log(`[local-db] Status: ${running ? 'RUNNING' : 'STOPPED'} (${PG_HOST}:${PG_PORT}/${DB_NAME})`);
  if (!running) return;
  const prisma = new PrismaClient({ datasources: { db: { url: LOCAL_DB_URL } } });
  try {
    const [users, facilities, appointments] = await Promise.all([
      prisma.user.count(),
      prisma.healthcareFacility.count(),
      prisma.appointment.count(),
    ]);
    console.log(`[local-db] Counts -> User: ${users}, HealthcareFacility: ${facilities}, Appointment: ${appointments}`);
  } finally {
    await prisma.$disconnect();
  }
}

const action = (process.argv[2] || 'status').toLowerCase();
if (action === 'up' || action === 'start') {
  await cmdUp();
} else if (action === 'stop') {
  cmdStop();
} else if (action === 'status') {
  await cmdStatus();
} else {
  console.error(`Unknown action: ${action}. Expected up | stop | status`);
  process.exit(1);
}
