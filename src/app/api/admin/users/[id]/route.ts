import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthUser } from '@/lib/auth';
import { getSafeAdminUserById, SAFE_ADMIN_USER_SELECT } from '@/lib/adminUsers';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuthUser(req, ['ADMIN'], {
      forbiddenMessage: 'Forbidden. Administrator privileges required.',
    });
    if (!auth.ok) return auth.response;

    const user = await getSafeAdminUserById(params.id);
    if (!user || user.role !== 'DOCTOR') {
      return NextResponse.json({ error: 'Doctor application not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Admin user detail error:', error);
    return NextResponse.json({ error: 'Failed to load applicant details' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuthUser(req, ['ADMIN'], {
      forbiddenMessage: 'Forbidden. Administrator privileges required.',
    });
    if (!auth.ok) return auth.response;

    const targetUserId = params.id;
    if (!targetUserId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Prevent an administrator from approving or rejecting their own account
    if (targetUserId === auth.user.id) {
      return NextResponse.json(
        { error: 'Administrators cannot approve or reject their own account.' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const rawAction = typeof body?.action === 'string' ? body.action.trim().toUpperCase() : '';
    const rejectionReason =
      typeof body?.rejectionReason === 'string' ? body.rejectionReason.trim() : '';

    if (rawAction !== 'APPROVE' && rawAction !== 'REJECT') {
      return NextResponse.json(
        { error: 'Invalid action. Expected APPROVE or REJECT.' },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        role: true,
        doctorProfile: { select: { id: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Target account not found' }, { status: 404 });
    }

    if (existing.role !== 'DOCTOR') {
      return NextResponse.json(
        { error: 'Only doctor accounts are managed in the approval queue.' },
        { status: 400 }
      );
    }

    const nextStatus = rawAction === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    const now = new Date();

    const updatedUser = await prisma.$transaction(async (tx) => {
      if (existing.doctorProfile) {
        await tx.doctorProfile.update({
          where: { id: existing.doctorProfile.id },
          data: {
            verificationStatus: nextStatus,
          },
        });
      }

      return tx.user.update({
        where: { id: targetUserId },
        data: {
          approvalStatus: nextStatus,
          reviewedAt: now,
          reviewedById: auth.user.id,
          approvedAt: nextStatus === 'APPROVED' ? now : null,
          rejectedAt: nextStatus === 'REJECTED' ? now : null,
          rejectionReason: nextStatus === 'REJECTED' ? rejectionReason || null : null,
        },
        select: SAFE_ADMIN_USER_SELECT,
      });
    });

    return NextResponse.json({
      user: {
        ...updatedUser,
        reviewedBy: {
          id: auth.user.id,
          name: auth.user.name,
          email: auth.user.email,
        },
      },
      message:
        nextStatus === 'APPROVED'
          ? `Account approved for ${updatedUser.name}.`
          : `Account rejected for ${updatedUser.name}.`,
    });
  } catch (error) {
    console.error('Admin approval update error:', error);
    return NextResponse.json({ error: 'Failed to update account approval status' }, { status: 500 });
  }
}
