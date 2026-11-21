import { prisma } from '@/lib/prisma';

export const SAFE_ADMIN_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  approvalStatus: true,
  approvedAt: true,
  rejectedAt: true,
  reviewedAt: true,
  reviewedById: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true,
  patientProfile: {
    select: {
      id: true,
      phone: true,
      location: true,
      createdAt: true,
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
      phone: true,
      verificationDocName: true,
      verificationDocMime: true,
      verificationDocSize: true,
      consultationType: true,
      createdAt: true,
    },
  },
} as const;

export type SafeAdminUserRecord = Awaited<ReturnType<typeof getSafeAdminUserById>>;

export async function getSafeAdminUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: SAFE_ADMIN_USER_SELECT,
  });

  if (!user) return null;

  let reviewedBy: { id: string; name: string; email: string } | null = null;
  if (user.reviewedById) {
    reviewedBy = await prisma.user.findUnique({
      where: { id: user.reviewedById },
      select: { id: true, name: true, email: true },
    });
  }

  return {
    ...user,
    reviewedBy,
  };
}
