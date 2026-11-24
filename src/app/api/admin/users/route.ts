import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthUser } from '@/lib/auth';
import { SAFE_ADMIN_USER_SELECT } from '@/lib/adminUsers';

export const dynamic = 'force-dynamic';

const VALID_STATUSES = new Set(['PENDING', 'APPROVED', 'REJECTED']);

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuthUser(req, ['ADMIN'], {
      forbiddenMessage: 'Forbidden. Administrator privileges required.',
    });
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status')?.trim().toUpperCase() || 'ALL';
    const search = searchParams.get('search')?.trim() || '';

    // Patients do not require admin approval and are excluded from the approval queue.
    const where: Record<string, unknown> = {
      role: 'DOCTOR',
    };

    if (statusParam !== 'ALL' && VALID_STATUSES.has(statusParam)) {
      where.approvalStatus = statusParam;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, groupedCounts] = await Promise.all([
      prisma.user.findMany({
        where,
        select: SAFE_ADMIN_USER_SELECT,
        orderBy: [{ createdAt: 'desc' }],
      }),
      prisma.user.groupBy({
        where: { role: 'DOCTOR' },
        by: ['approvalStatus'],
        _count: { _all: true },
      }),
    ]);

    const counts = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
    };

    for (const row of groupedCounts) {
      const c = row._count._all;
      counts.total += c;
      if (row.approvalStatus === 'PENDING') counts.pending = c;
      else if (row.approvalStatus === 'APPROVED') counts.approved = c;
      else if (row.approvalStatus === 'REJECTED') counts.rejected = c;
    }

    return NextResponse.json({
      users,
      counts,
      currentAdminId: auth.user.id,
    });
  } catch (error) {
    console.error('Admin users listing error:', error);
    return NextResponse.json({ error: 'Failed to load registration requests' }, { status: 500 });
  }
}
