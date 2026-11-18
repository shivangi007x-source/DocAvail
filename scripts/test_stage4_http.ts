/**
 * DocAvail — Stage 4 Live HTTP API, UI SSR, and Auth/RBAC Test Runner
 *
 * Starts the built Next.js server temporarily against RESTORE_TEST_DATABASE_URL,
 * probes all public facility APIs, UI pages, existing doctor APIs, write rejections (405),
 * and authentication/authorization guards (401 / 403 / redirects), then terminates cleanly.
 *
 * Safety: Strictly sets DATABASE_URL and DIRECT_URL of the child Next.js process
 * to RESTORE_TEST_DATABASE_URL (never touches production!).
 */

import * as assert from 'assert';
import * as path from 'path';
import { spawn } from 'child_process';
import * as dotenv from 'dotenv';
import { SignJWT } from 'jose';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const rawRestoreUrl = process.env.RESTORE_TEST_DATABASE_URL;
const rawProdUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
const jwtSecretStr = process.env.JWT_SECRET || 'docavail_dev_secret_key_2025_secure';

if (!rawRestoreUrl || !rawProdUrl) {
  console.error('FATAL: Missing database URLs in .env');
  process.exit(1);
}

const restoreObj = new URL(rawRestoreUrl);
const prodObj = new URL(rawProdUrl);
if (restoreObj.hostname === prodObj.hostname) {
  console.error('FATAL: Restore URL matches production host!');
  process.exit(1);
}

const PORT = 3199;
const BASE_URL = `http://127.0.0.1:${PORT}`;

async function waitForServerReady(timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE_URL}/api/facilities?limit=1`);
      if (res.ok) return;
    } catch {
      // ignore until ready
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Next.js test server did not become ready within ${timeoutMs}ms`);
}

async function signTestToken(role: 'PATIENT' | 'DOCTOR' | 'ADMIN', userId: string) {
  const secret = new TextEncoder().encode(jwtSecretStr);
  return new SignJWT({ userId, email: `test-${role.toLowerCase()}@example.com`, role, name: `Test ${role}` })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}

async function main() {
  console.log('================================================================');
  console.log('DocAvail — Stage 4 Live HTTP, Auth & RBAC Integration Tests');
  console.log('================================================================');
  console.log(`Binding Next.js child server to disposable target: ${restoreObj.hostname}\n`);

  const nextBin = path.join(__dirname, '..', 'node_modules', 'next', 'dist', 'bin', 'next');
  const childEnv: NodeJS.ProcessEnv = {
    ...process.env,
    DATABASE_URL: rawRestoreUrl,
    DIRECT_URL: rawRestoreUrl,
    PORT: String(PORT),
    NODE_ENV: 'production',
  };

  const server = spawn(process.execPath, [nextBin, 'start', '-p', String(PORT), '-H', '127.0.0.1'], {
    cwd: path.join(__dirname, '..'),
    env: childEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let serverLogs = '';
  server.stdout.on('data', (d) => (serverLogs += d.toString()));
  server.stderr.on('data', (d) => (serverLogs += d.toString()));

  try {
    await waitForServerReady();
    console.log('[1/6] Next.js production server ready on http://127.0.0.1:3199 (disposable DB).\n');

    // 1. Public Facility List & Filters
    console.log('[2/6] Testing GET /api/facilities search, filters & pagination...');
    const listRes = await fetch(`${BASE_URL}/api/facilities?division=Kashmir&limit=4&page=1`);
    assert.strictEqual(listRes.status, 200);
    const listJson: any = await listRes.json();
    assert.strictEqual(listJson.facilities.length, 4);
    assert.strictEqual(listJson.pagination.total, 6);
    assert.strictEqual(listJson.pagination.totalPages, 2);
    assert.strictEqual(listJson.pagination.hasNextPage, true);

    const invalidFilterRes = await fetch(`${BASE_URL}/api/facilities?facilityType=BOGUS`);
    assert.strictEqual(invalidFilterRes.status, 400);
    console.log(' ✅ GET /api/facilities pagination, filters, and 400 validation passed.\n');

    // 2. Facility Detail Endpoint
    console.log('[3/6] Testing GET /api/facilities/[id] & missing ID handling...');
    const firstId = listJson.facilities[0].id;
    const detailRes = await fetch(`${BASE_URL}/api/facilities/${firstId}`);
    assert.strictEqual(detailRes.status, 200);
    const detailJson: any = await detailRes.json();
    assert.strictEqual(detailJson.facility.id, firstId);
    assert.ok(Array.isArray(detailJson.facility.affiliatedDoctors));

    const notFoundRes = await fetch(`${BASE_URL}/api/facilities/non-existent-id-000`);
    assert.strictEqual(notFoundRes.status, 404);
    console.log(' ✅ GET /api/facilities/[id] 200 and 404 checks passed.\n');

    // 3. Read-Only Enforcement on Facility Endpoints (Method Not Allowed)
    console.log('[4/6] Testing read-only enforcement (POST/DELETE rejected on /api/facilities)...');
    const postRes = await fetch(`${BASE_URL}/api/facilities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Injected' }),
    });
    assert.strictEqual(postRes.status, 405);

    const deleteRes = await fetch(`${BASE_URL}/api/facilities/${firstId}`, {
      method: 'DELETE',
    });
    assert.strictEqual(deleteRes.status, 405);
    console.log(' ✅ Write attempts on facility endpoints rejected with HTTP 405.\n');

    // 4. Authentication & Authorization (Preserved Model)
    console.log('[5/6] Testing authentication & RBAC on protected endpoints and pages...');
    // Unauthenticated API calls -> 401
    const unauthPatientApi = await fetch(`${BASE_URL}/api/patient/me/profile`);
    assert.strictEqual(unauthPatientApi.status, 401);

    const unauthDoctorApi = await fetch(`${BASE_URL}/api/doctor/me/profile`);
    assert.strictEqual(unauthDoctorApi.status, 401);

    // Unauthenticated page requests -> 307 redirect to /login
    const unauthPatientPage = await fetch(`${BASE_URL}/patient/dashboard`, { redirect: 'manual' });
    assert.strictEqual(unauthPatientPage.status, 307);
    assert.ok((unauthPatientPage.headers.get('location') || '').includes('/login'));

    const unauthAdminPage = await fetch(`${BASE_URL}/admin`, { redirect: 'manual' });
    assert.strictEqual(unauthAdminPage.status, 307);
    assert.ok((unauthAdminPage.headers.get('location') || '').includes('/login'));

    // Cross-role RBAC checks
    const patientJwt = await signTestToken('PATIENT', '00000000-0000-0000-0000-000000000001');
    const doctorJwt = await signTestToken('DOCTOR', '00000000-0000-0000-0000-000000000002');

    const patientHitsDoctorApi = await fetch(`${BASE_URL}/api/doctor/me/profile`, {
      headers: { Cookie: `docavail_token=${patientJwt}` },
    });
    assert.strictEqual(patientHitsDoctorApi.status, 403);

    const doctorHitsPatientApi = await fetch(`${BASE_URL}/api/patient/me/profile`, {
      headers: { Cookie: `docavail_token=${doctorJwt}` },
    });
    assert.strictEqual(doctorHitsPatientApi.status, 403);

    const patientHitsAdminPage = await fetch(`${BASE_URL}/admin`, {
      redirect: 'manual',
      headers: { Cookie: `docavail_token=${patientJwt}` },
    });
    assert.strictEqual(patientHitsAdminPage.status, 307);
    assert.ok((patientHitsAdminPage.headers.get('location') || '').includes('/unauthorized'));
    console.log(' ✅ Authentication (401/307) & RBAC authorization (403/unauthorized) intact.\n');

    // 5. Existing Routes & New Facility SSR Pages
    console.log('[6/6] Testing existing application routes & new facility UI routes...');
    const routesToCheck = [
      '/',
      '/doctors',
      '/api/doctors',
      '/facilities',
      `/facilities/${firstId}`,
    ];
    for (const r of routesToCheck) {
      const res = await fetch(`${BASE_URL}${r}`);
      assert.strictEqual(res.status, 200, `Expected 200 on ${r}, got ${res.status}`);
      console.log(` ✅ [200 OK] ${r}`);
    }

    console.log('\n================================================================');
    console.log('🎉 ALL STAGE 4 LIVE HTTP, UI & AUTH TESTS PASSED');
    console.log('================================================================');
  } catch (err) {
    console.error('\nServer logs:\n', serverLogs);
    throw err;
  } finally {
    server.kill('SIGTERM');
  }
}

main().catch((err) => {
  console.error('\n❌ STAGE 4 HTTP TEST FAILED:', err);
  process.exit(1);
});
