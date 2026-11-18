import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { FacilityQueryValidationError, getFacilityById } from '@/lib/facilityService';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const facility = await getFacilityById(prisma, params?.id || '');

    if (!facility) {
      return NextResponse.json({ error: 'Healthcare facility not found' }, { status: 404 });
    }

    return NextResponse.json({ facility }, { status: 200 });
  } catch (error) {
    if (error instanceof FacilityQueryValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error fetching healthcare facility detail:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve healthcare facility details' },
      { status: 500 }
    );
  }
}
