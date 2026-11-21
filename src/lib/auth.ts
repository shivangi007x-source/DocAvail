import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { UserRole, ApprovalStatus } from '@/lib/types';
import {
  signJwtToken,
  verifyJwtToken,
  TOKEN_COOKIE_NAME,
  type TokenPayload,
} from './jwt';

export { signJwtToken, verifyJwtToken, TOKEN_COOKIE_NAME };
export type { TokenPayload };

export async function getSessionUser() {
  const cookieStore = cookies();
  const token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;

  if (!token) return null;

  const payload = await verifyJwtToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatarUrl: true,
      approvalStatus: true,
      approvedAt: true,
      rejectedAt: true,
      reviewedAt: true,
      rejectionReason: true,
      createdAt: true,
      patientProfile: {
        select: {
          id: true,
          phone: true,
          location: true,
          dateOfBirth: true,
          gender: true,
          bloodGroup: true,
        },
      },
      doctorProfile: {
        select: {
          id: true,
          specialization: true,
          qualification: true,
          experience: true,
          licenseNumber: true,
          verificationStatus: true,
          consultationFee: true,
          clinicName: true,
          clinicAddress: true,
          city: true,
          district: true,
          division: true,
          consultationType: true,
          treatedConditions: true,
          availabilityStatus: true,
          statusNote: true,
          statusUpdatedAt: true,
        },
      },
    },
  });

  if (!user || user.approvalStatus !== 'APPROVED') {
    return null;
  }

  return user;
}

export interface AuthenticatedDbUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  approvalStatus: ApprovalStatus;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
}

export type AuthGuardResult =
  | { ok: true; user: AuthenticatedDbUser }
  | { ok: false; response: NextResponse };

/**
 * Verifies the caller's JWT cookie and checks live PostgreSQL state for role and approvalStatus.
 * Prevents stale JWTs from bypassing account rejection, pending state, or role restrictions.
 */
export async function requireAuthUser(
  req: NextRequest,
  allowedRoles: UserRole[],
  options: { requireApproved?: boolean; forbiddenMessage?: string } = {}
): Promise<AuthGuardResult> {
  const { requireApproved = true, forbiddenMessage } = options;
  const token = req.cookies.get(TOKEN_COOKIE_NAME)?.value;
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 }),
    };
  }

  const payload = await verifyJwtToken(token);
  if (!payload) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized. Invalid or expired session.' }, { status: 401 }),
    };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      approvalStatus: true,
      approvedAt: true,
      rejectedAt: true,
      reviewedAt: true,
      rejectionReason: true,
    },
  });

  if (!dbUser) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized. Account not found.' }, { status: 401 }),
    };
  }

  if (!allowedRoles.includes(dbUser.role as UserRole)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: forbiddenMessage || 'Forbidden. You do not have permission to access this resource.' },
        { status: 403 }
      ),
    };
  }

  if (requireApproved && dbUser.approvalStatus !== 'APPROVED') {
    const isRejected = dbUser.approvalStatus === 'REJECTED';
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: isRejected
            ? 'Your account registration was rejected by an administrator.'
            : 'Your account is awaiting administrator approval.',
          code: isRejected ? 'ACCOUNT_REJECTED' : 'ACCOUNT_PENDING',
          approvalStatus: dbUser.approvalStatus,
          rejectionReason: dbUser.rejectionReason,
          reviewedAt: dbUser.reviewedAt,
        },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    user: {
      ...dbUser,
      role: dbUser.role as UserRole,
      approvalStatus: dbUser.approvalStatus as ApprovalStatus,
    },
  };
}
