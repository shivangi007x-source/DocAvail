import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@/lib/types';

const JWT_SECRET = process.env.JWT_SECRET || 'docavail-secret-key-change-in-production-2026';
export const TOKEN_COOKIE_NAME = 'docavail_token';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  name: string;
}

export function signJwtToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyJwtToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export async function getSessionUser() {
  const cookieStore = cookies();
  const token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;

  if (!token) return null;

  const payload = verifyJwtToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatarUrl: true,
      createdAt: true,
      patientProfile: {
        select: {
          phone: true,
          location: true,
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
          consultationType: true,
          availabilityStatus: true,
          statusNote: true,
          statusUpdatedAt: true,
        },
      },
    },
  });

  return user;
}
