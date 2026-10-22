import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
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
          consultationType: true,
          treatedConditions: true,
          availabilityStatus: true,
          statusNote: true,
          statusUpdatedAt: true,
        },
      },
    },
  });

  return user;
}
