/**
 * DocAvail — Phase 6 End-to-End Registration & Admin Approval Workflow Test Suite
 *
 * Runs against a live Next.js server bound strictly to RESTORE_TEST_DATABASE_URL.
 * Exercises real HTTP endpoints, PostgreSQL persistence, Edge middleware RBAC/approval,
 * and Admin review actions across all 10 required workflow scenarios.
 */

import assert from 'node:assert/strict';
import * as path from 'path';
import { spawn } from 'child_process';
import * as dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';

function ok(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const rawRestoreUrl = process.env.RESTORE_TEST_DATABASE_URL;
const rawProdUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
const jwtSecretStr = process.env.JWT_SECRET || 'docavail-secret-key-change-in-production-2026';

if (!rawRestoreUrl || !rawProdUrl) {
  console.error('FATAL: Missing database URLs in .env');
  process.exit(1);
}

const restoreObj = new URL(rawRestoreUrl);
const prodObj = new URL(rawProdUrl);
if (restoreObj.hostname === prodObj.hostname) {
  console.error('FATAL SAFETY VIOLATION: Target matches production host! Aborting.');
  process.exit(1);
}

const PORT = 3198;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const TEST_PASS = 'ApprovalTest#2026!';

async function waitForServerReady(timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/me`);
      if (res.ok) return;
    } catch {
      // Server still starting
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Next.js server did not become ready within ${timeoutMs}ms`);
}

function extractCookie(res: Response, name: string): string | null {
  const raw = res.headers.get('set-cookie');
  if (!raw) return null;
  const match = raw.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : null;
}

async function signForgedOrStaleToken(payload: {
  userId: string;
  email: string;
  role: 'PATIENT' | 'DOCTOR' | 'ADMIN';
  name: string;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
}) {
  const secret = new TextEncoder().encode(jwtSecretStr);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}

async function main() {
  console.log('====================================================================');
  console.log('DocAvail — Phase 6 End-to-End Approval Workflow Tests (Disposable DB)');
  console.log('====================================================================');
  console.log(`Target host: ${restoreObj.hostname}\n`);

  const prisma = new PrismaClient({
    datasources: { db: { url: rawRestoreUrl } },
  });

  const ts = Date.now();
  const patientEmail = `e2e.patient.${ts}@example.com`;
  const doctorEmail = `e2e.doctor.${ts}@example.com`;
  const rejectPatientEmail = `e2e.reject.${ts}@example.com`;
  const createdEmails = [patientEmail, doctorEmail, rejectPatientEmail];

  const nextBin = path.join(__dirname, '..', 'node_modules', 'next', 'dist', 'bin', 'next');
  const childEnv: NodeJS.ProcessEnv = {
    ...process.env,
    DATABASE_URL: rawRestoreUrl,
    DIRECT_URL: rawRestoreUrl,
    PORT: String(PORT),
  };

  const serverProc = spawn(process.execPath, [nextBin, 'start', '-p', String(PORT), '-H', '127.0.0.1'], {
    cwd: path.join(__dirname, '..'),
    env: childEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stderrBuf = '';
  serverProc.stderr?.on('data', (d) => {
    stderrBuf += d.toString();
  });

  try {
    await waitForServerReady(35000);
    console.log('[OK] Next.js production build started on disposable DB');

    // Locate an existing ADMIN on disposable DB (or ensure admin exists for test)
    const adminRow = await prisma.user.findFirst({
      where: { role: 'ADMIN', approvalStatus: 'APPROVED' },
      select: { id: true, email: true, name: true },
    });
    ok(adminRow, 'Expected an existing ADMIN user on disposable DB for admin tests');

    // Provision a dedicated temporary E2E admin via bcrypt ONLY in disposable DB and delete it in finally!
    const e2eAdminEmail = `e2e.admin.${ts}@docavail.com`;
    const e2eAdminPass = 'E2eAdminPass#2026!';
    createdEmails.push(e2eAdminEmail);
    const e2eAdmin = await prisma.user.create({
      data: {
        email: e2eAdminEmail,
        name: 'E2E Test Admin',
        passwordHash: await bcrypt.hash(e2eAdminPass, 10),
        role: 'ADMIN',
        approvalStatus: 'APPROVED',
        approvedAt: new Date(),
        reviewedAt: new Date(),
      },
    });

    // 1. Register a new patient -> PENDING, real DB record, hashed password, NO session cookie
    const regPatRes = await fetch(`${BASE_URL}/api/auth/register/patient`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'E2E Test Patient',
        email: patientEmail,
        password: TEST_PASS,
        phone: '+91 9999900001',
        location: 'Jammu',
      }),
    });
    const regPatJson = await regPatRes.json();
    assert.strictEqual(regPatRes.status, 201, `Patient register failed: ${JSON.stringify(regPatJson)}`);
    assert.strictEqual(regPatJson.requiresApproval, true);
    assert.strictEqual(regPatJson.user.approvalStatus, 'PENDING');
    assert.strictEqual(extractCookie(regPatRes, 'docavail_token'), null, 'Pending patient must NOT receive active session cookie');

    const dbPatient = await prisma.user.findUnique({ where: { email: patientEmail } });
    ok(dbPatient, 'Patient must exist in PostgreSQL');
    assert.strictEqual(dbPatient.role, 'PATIENT');
    assert.strictEqual(dbPatient.approvalStatus, 'PENDING');
    assert.notStrictEqual(dbPatient.passwordHash, TEST_PASS, 'Password must be hashed');
    ok(await bcrypt.compare(TEST_PASS, dbPatient.passwordHash), 'Password hash must match bcrypt');
    console.log('[1/10] Patient registered -> PostgreSQL PENDING record verified with hashed password & no auth cookie');

    // 1b. Security checks: duplicate email rejected (400) & ADMIN elevation via signup rejected (403)
    const dupRes = await fetch(`${BASE_URL}/api/auth/register/patient`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Dup Patient', email: patientEmail, password: TEST_PASS }),
    });
    assert.strictEqual(dupRes.status, 400, 'Duplicate email must fail with 400');

    const adminSignupRes = await fetch(`${BASE_URL}/api/auth/register/patient`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Attacker', email: `attacker.${ts}@example.com`, password: TEST_PASS, role: 'ADMIN' }),
    });
    assert.strictEqual(adminSignupRes.status, 403, 'Public registration must reject role=ADMIN with 403');
    console.log('[2/10] Duplicate email (400) & public ADMIN registration attempt (403) blocked');

    // 2. Register a new doctor -> PENDING + DoctorProfile verificationStatus PENDING, hidden from public /api/doctors
    const regDocRes = await fetch(`${BASE_URL}/api/auth/register/doctor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Dr. E2E Pending Clinician',
        email: doctorEmail,
        password: TEST_PASS,
        specialization: 'Cardiology',
        qualification: 'MBBS, MD',
        experience: 8,
        licenseNumber: `JK-MED-${ts}`,
        consultationFee: 500,
        clinicName: 'Test Clinic Jammu',
        clinicAddress: '10 Residency Road',
        city: 'Jammu',
        consultationType: 'BOTH',
      }),
    });
    const regDocJson = await regDocRes.json();
    assert.strictEqual(regDocRes.status, 201, `Doctor register failed: ${JSON.stringify(regDocJson)}`);
    assert.strictEqual(regDocJson.user.approvalStatus, 'PENDING');
    assert.strictEqual(regDocJson.user.doctorProfile.verificationStatus, 'PENDING');
    assert.strictEqual(extractCookie(regDocRes, 'docavail_token'), null);

    const pubDocsRes = await fetch(`${BASE_URL}/api/doctors?search=${encodeURIComponent('Dr. E2E Pending Clinician')}`);
    const pubDocsJson = await pubDocsRes.json();
    assert.strictEqual(
      (pubDocsJson.doctors || []).some((d: { email?: string; name?: string }) => d.name === 'Dr. E2E Pending Clinician'),
      false,
      'Unapproved doctor must NOT appear in public /api/doctors directory'
    );
    console.log('[3/10] Doctor registered as PENDING & hidden from public directory');

    // 3. Pending patient & pending doctor CANNOT login (403) and CANNOT call protected APIs even with a forged/stale token claiming APPROVED
    const pendLoginPat = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: patientEmail, password: TEST_PASS }),
    });
    const pendLoginPatJson = await pendLoginPat.json();
    assert.strictEqual(pendLoginPat.status, 403);
    assert.strictEqual(pendLoginPatJson.code, 'ACCOUNT_PENDING');

    const stalePendingPatientJwt = await signForgedOrStaleToken({
      userId: dbPatient.id,
      email: patientEmail,
      role: 'PATIENT',
      name: 'E2E Test Patient',
      approvalStatus: 'APPROVED', // Even if a stale JWT claims APPROVED, live DB check must block it!
    });
    const blockedPatApi = await fetch(`${BASE_URL}/api/patient/me/profile`, {
      headers: { Cookie: `docavail_token=${stalePendingPatientJwt}` },
    });
    assert.strictEqual(blockedPatApi.status, 403, 'Pending patient API call must return 403');
    const blockedPatApiJson = await blockedPatApi.json();
    assert.strictEqual(blockedPatApiJson.code, 'ACCOUNT_PENDING');

    const dbDoctor = await prisma.user.findUnique({ where: { email: doctorEmail } });
    ok(dbDoctor, 'Doctor must exist in PostgreSQL');
    const stalePendingDocJwt = await signForgedOrStaleToken({
      userId: dbDoctor.id,
      email: doctorEmail,
      role: 'DOCTOR',
      name: 'Dr. E2E Pending Clinician',
      approvalStatus: 'APPROVED',
    });
    const blockedDocApi = await fetch(`${BASE_URL}/api/doctor/me/profile`, {
      headers: { Cookie: `docavail_token=${stalePendingDocJwt}` },
    });
    assert.strictEqual(blockedDocApi.status, 403, 'Pending doctor API call must return 403');

    // Middleware check for a JWT with approvalStatus=PENDING trying to load /patient/dashboard
    const pendingTokenJwt = await signForgedOrStaleToken({
      userId: dbPatient.id,
      email: patientEmail,
      role: 'PATIENT',
      name: 'E2E Test Patient',
      approvalStatus: 'PENDING',
    });
    const blockedUiRes = await fetch(`${BASE_URL}/patient/dashboard`, {
      headers: { Cookie: `docavail_token=${pendingTokenJwt}` },
      redirect: 'manual',
    });
    assert.strictEqual(blockedUiRes.status, 307);
    ok(blockedUiRes.headers.get('location')?.includes('/unauthorized?status=pending'), 'Expected redirect to /unauthorized?status=pending');
    console.log('[4/10] Pending patient & doctor blocked on login (403), protected APIs (403), and Edge routes (307)');

    // 4. Register a third user to reject later
    const rejRegRes = await fetch(`${BASE_URL}/api/auth/register/patient`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Reject Candidate', email: rejectPatientEmail, password: TEST_PASS }),
    });
    assert.strictEqual(rejRegRes.status, 201);
    const dbRejectUser = await prisma.user.findUnique({ where: { email: rejectPatientEmail } });
    ok(dbRejectUser, 'Reject candidate user must exist');

    // 5. Login as ADMIN via POST /api/auth/login
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: e2eAdminEmail, password: e2eAdminPass }),
    });
    const adminLoginJson = await adminLoginRes.json();
    assert.strictEqual(adminLoginRes.status, 200, `Admin login failed: ${JSON.stringify(adminLoginJson)}`);
    const adminCookie = extractCookie(adminLoginRes, 'docavail_token');
    ok(adminCookie, 'Admin login must set auth cookie');

    // 6. Admin lists PENDING users -> sees our new applicants, never exposes passwordHash or clinical records
    const listPendingRes = await fetch(`${BASE_URL}/api/admin/users?status=PENDING`, {
      headers: { Cookie: `docavail_token=${adminCookie}` },
    });
    assert.strictEqual(listPendingRes.status, 200);
    const listPendingJson = await listPendingRes.json();
    const pendingEmails = listPendingJson.users.map((u: { email: string }) => u.email);
    ok(pendingEmails.includes(patientEmail), 'Admin PENDING list must include newly registered patient');
    ok(pendingEmails.includes(doctorEmail), 'Admin PENDING list must include newly registered doctor');
    for (const u of listPendingJson.users) {
      assert.strictEqual('passwordHash' in u, false, 'Admin listing must NEVER expose passwordHash');
      assert.strictEqual('medicalRecords' in u, false, 'Admin listing must NEVER expose medicalRecords');
    }

    // Applicant details endpoint check
    const detailRes = await fetch(`${BASE_URL}/api/admin/users/${dbDoctor.id}`, {
      headers: { Cookie: `docavail_token=${adminCookie}` },
    });
    assert.strictEqual(detailRes.status, 200);
    const detailJson = await detailRes.json();
    assert.strictEqual(detailJson.user.doctorProfile.licenseNumber, `JK-MED-${ts}`);
    assert.strictEqual('passwordHash' in detailJson.user, false);

    // Self-approval / self-rejection prevention check
    const selfReviewRes = await fetch(`${BASE_URL}/api/admin/users/${e2eAdmin.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: `docavail_token=${adminCookie}` },
      body: JSON.stringify({ action: 'APPROVE' }),
    });
    assert.strictEqual(selfReviewRes.status, 400, 'Admin self-approval must be rejected with 400');
    console.log('[5/10] Admin dashboard API lists PENDING users safely, loads detail, blocks self-approval');

    // 7. Non-admin cannot access admin endpoints
    const nonAdminUnauthRes = await fetch(`${BASE_URL}/api/admin/users`);
    assert.strictEqual(nonAdminUnauthRes.status, 401);
    const patientForbiddenAdminRes = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: { Cookie: `docavail_token=${stalePendingPatientJwt}` },
    });
    assert.strictEqual(patientForbiddenAdminRes.status, 403);
    console.log('[6/10] Unauthenticated (401) & non-admin (403) callers blocked from Admin API');

    // 8. Admin approves Patient & Doctor -> decision + timestamps persisted, doctor becomes publicly visible
    const approvePatRes = await fetch(`${BASE_URL}/api/admin/users/${dbPatient.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: `docavail_token=${adminCookie}` },
      body: JSON.stringify({ action: 'APPROVE' }),
    });
    assert.strictEqual(approvePatRes.status, 200);
    const approvePatJson = await approvePatRes.json();
    assert.strictEqual(approvePatJson.user.approvalStatus, 'APPROVED');
    ok(approvePatJson.user.approvedAt, 'approvedAt timestamp must be recorded');
    ok(approvePatJson.user.reviewedAt, 'reviewedAt timestamp must be recorded');
    assert.strictEqual(approvePatJson.user.reviewedById, e2eAdmin.id);

    const approveDocRes = await fetch(`${BASE_URL}/api/admin/users/${dbDoctor.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: `docavail_token=${adminCookie}` },
      body: JSON.stringify({ action: 'APPROVE' }),
    });
    assert.strictEqual(approveDocRes.status, 200);
    const approveDocJson = await approveDocRes.json();
    assert.strictEqual(approveDocJson.user.approvalStatus, 'APPROVED');
    assert.strictEqual(approveDocJson.user.doctorProfile.verificationStatus, 'APPROVED');

    // Approved doctor now visible in public directory
    const pubDocsAfterRes = await fetch(`${BASE_URL}/api/doctors?search=${encodeURIComponent('Dr. E2E Pending Clinician')}`);
    const pubDocsAfterJson = await pubDocsAfterRes.json();
    assert.strictEqual(
      (pubDocsAfterJson.doctors || []).some((d: { name?: string }) => d.name === 'Dr. E2E Pending Clinician'),
      true,
      'Approved doctor must now appear in public /api/doctors directory'
    );
    console.log('[7/10] Admin approval updates status, decision timestamps, and clinician visibility');

    // 9. Approved patient & doctor can now sign in AND access protected patient/doctor APIs & UI
    const patLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: patientEmail, password: TEST_PASS }),
    });
    assert.strictEqual(patLoginRes.status, 200, 'Approved patient must be able to log in');
    const patCookie = extractCookie(patLoginRes, 'docavail_token');
    ok(patCookie, 'Approved patient login must set auth cookie');

    const patProfileRes = await fetch(`${BASE_URL}/api/patient/me/profile`, {
      headers: { Cookie: `docavail_token=${patCookie}` },
    });
    assert.strictEqual(patProfileRes.status, 200, 'Approved patient must access /api/patient/me/profile');

    // Approved patient STILL cannot access admin or doctor portals
    const patToAdminApi = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: { Cookie: `docavail_token=${patCookie}` },
    });
    assert.strictEqual(patToAdminApi.status, 403, 'Approved patient must remain blocked from /api/admin/*');

    const docLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: doctorEmail, password: TEST_PASS }),
    });
    assert.strictEqual(docLoginRes.status, 200);
    const docCookie = extractCookie(docLoginRes, 'docavail_token');
    ok(docCookie, 'Approved doctor login must set auth cookie');
    const docProfileRes = await fetch(`${BASE_URL}/api/doctor/me/profile`, {
      headers: { Cookie: `docavail_token=${docCookie}` },
    });
    assert.strictEqual(docProfileRes.status, 200);
    console.log('[8/10] Approved patient & doctor gain access to their respective portals while remaining role-isolated');

    // 10. Rejection workflow + immediate revocation of an active session cookie
    const rejRes = await fetch(`${BASE_URL}/api/admin/users/${dbRejectUser.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: `docavail_token=${adminCookie}` },
      body: JSON.stringify({ action: 'REJECT', rejectionReason: 'Incomplete verification documents' }),
    });
    assert.strictEqual(rejRes.status, 200);
    const rejJson = await rejRes.json();
    assert.strictEqual(rejJson.user.approvalStatus, 'REJECTED');
    assert.strictEqual(rejJson.user.rejectionReason, 'Incomplete verification documents');
    ok(rejJson.user.rejectedAt, 'rejectedAt timestamp must be recorded');

    const rejLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: rejectPatientEmail, password: TEST_PASS }),
    });
    const rejLoginJson = await rejLoginRes.json();
    assert.strictEqual(rejLoginRes.status, 403);
    assert.strictEqual(rejLoginJson.code, 'ACCOUNT_REJECTED');
    assert.strictEqual(rejLoginJson.rejectionReason, 'Incomplete verification documents');

    // Revoke previously-approved patient -> existing valid JWT cookie must be immediately rejected on API calls!
    const revokeRes = await fetch(`${BASE_URL}/api/admin/users/${dbPatient.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: `docavail_token=${adminCookie}` },
      body: JSON.stringify({ action: 'REJECT', rejectionReason: 'Revoked during E2E test' }),
    });
    assert.strictEqual(revokeRes.status, 200);

    const stalePatAfterRevoke = await fetch(`${BASE_URL}/api/patient/me/profile`, {
      headers: { Cookie: `docavail_token=${patCookie}` },
    });
    assert.strictEqual(stalePatAfterRevoke.status, 403, 'Previously-approved patient cookie must be blocked immediately after rejection');
    const staleRevokeJson = await stalePatAfterRevoke.json();
    assert.strictEqual(staleRevokeJson.code, 'ACCOUNT_REJECTED');
    console.log('[9/10] Rejections block login, record reason + timestamp, and immediately revoke active JWT access');

    // Filtered Admin listing verification (APPROVED, REJECTED)
    const listRejectedRes = await fetch(`${BASE_URL}/api/admin/users?status=REJECTED`, {
      headers: { Cookie: `docavail_token=${adminCookie}` },
    });
    const listRejectedJson = await listRejectedRes.json();
    const rejectedEmails = listRejectedJson.users.map((u: { email: string }) => u.email);
    ok(rejectedEmails.includes(rejectPatientEmail), 'Rejected patient must appear under REJECTED filter');
    ok(rejectedEmails.includes(patientEmail), 'Revoked patient must appear under REJECTED filter');
    console.log('[10/10] Admin status filters (PENDING / APPROVED / REJECTED) accurately reflect PostgreSQL state');

    console.log('\nALL 10 END-TO-END APPROVAL WORKFLOW TESTS PASSED!');
  } finally {
    // Cleanup temporary E2E records from disposable DB
    await prisma.user.deleteMany({
      where: { email: { in: createdEmails } },
    });
    await prisma.$disconnect();

    serverProc.kill();
    if (stderrBuf.trim()) {
      console.log('\nServer stderr summary:', stderrBuf.trim().slice(0, 600));
    }
  }
}

main().catch((err) => {
  console.error('\nTEST FAILURE:', err);
  process.exit(1);
});
