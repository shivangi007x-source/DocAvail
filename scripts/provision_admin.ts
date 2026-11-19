/**
 * DocAvail — Controlled One-Time Admin Account Provisioning Script
 *
 * Security Rules:
 * - Reads ADMIN_PROVISION_EMAIL, ADMIN_PROVISION_PASSWORD, and optional ADMIN_PROVISION_NAME
 *   exclusively from environment variables (never hardcoded credentials).
 * - Requires explicit target flag:
 *     --target=disposable   -> targets RESTORE_TEST_DATABASE_URL (aborts if same host as production)
 *     --target=production   -> requires BOTH --target=production AND --confirm-production
 *
 * Example usage (disposable):
 *   ADMIN_PROVISION_EMAIL="admin@docavail.com" ADMIN_PROVISION_PASSWORD="<strong-password>" \
 *   npx tsx scripts/provision_admin.ts --target=disposable
 *
 * Example usage (production after approval):
 *   ADMIN_PROVISION_EMAIL="admin@docavail.com" ADMIN_PROVISION_PASSWORD="<strong-password>" \
 *   npx tsx scripts/provision_admin.ts --target=production --confirm-production
 */

import path from 'path';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const args = process.argv.slice(2);
  const targetArg = args.find((a) => a.startsWith('--target='))?.split('=')[1];
  const confirmProd = args.includes('--confirm-production');

  if (targetArg !== 'disposable' && targetArg !== 'production') {
    console.error('ERROR: Explicit --target=disposable or --target=production flag is required.');
    process.exit(1);
  }

  const email = process.env.ADMIN_PROVISION_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PROVISION_PASSWORD;
  const name = process.env.ADMIN_PROVISION_NAME?.trim() || 'DocAvail System Admin';

  if (!email || !password) {
    console.error(
      'ERROR: ADMIN_PROVISION_EMAIL and ADMIN_PROVISION_PASSWORD environment variables are required.'
    );
    process.exit(1);
  }

  if (password.length < 10) {
    console.error('ERROR: ADMIN_PROVISION_PASSWORD must be at least 10 characters long.');
    process.exit(1);
  }

  const prodUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
  const disposableUrl = process.env.RESTORE_TEST_DATABASE_URL;

  if (!prodUrl) {
    console.error('ERROR: Missing DATABASE_URL / DIRECT_URL.');
    process.exit(1);
  }

  let targetUrl: string;
  if (targetArg === 'disposable') {
    if (!disposableUrl) {
      console.error('ERROR: Missing RESTORE_TEST_DATABASE_URL.');
      process.exit(1);
    }
    if (new URL(disposableUrl).hostname === new URL(prodUrl).hostname) {
      console.error('FATAL SAFETY VIOLATION: Disposable host matches production host.');
      process.exit(1);
    }
    targetUrl = disposableUrl;
  } else {
    if (!confirmProd) {
      console.error('ERROR: Production provisioning requires --confirm-production flag.');
      process.exit(1);
    }
    targetUrl = prodUrl;
  }

  const prisma = new PrismaClient({
    datasources: { db: { url: targetUrl } },
  });

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const now = new Date();

    const admin = await prisma.user.upsert({
      where: { email },
      update: {
        name,
        passwordHash,
        role: 'ADMIN',
        approvalStatus: 'APPROVED',
        approvedAt: now,
        rejectedAt: null,
        reviewedAt: now,
        rejectionReason: null,
      },
      create: {
        email,
        name,
        passwordHash,
        role: 'ADMIN',
        approvalStatus: 'APPROVED',
        approvedAt: now,
        reviewedAt: now,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        approvalStatus: true,
        approvedAt: true,
      },
    });

    console.log(
      `Provisioned ADMIN account on ${targetArg} host (${new URL(targetUrl).hostname}):`,
      admin
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Admin provisioning failed:', err);
  process.exit(1);
});
