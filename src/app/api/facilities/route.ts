import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { FacilityQueryValidationError, queryFacilities } from '@/lib/facilityService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const result = await queryFacilities(prisma, {
      search: searchParams.get('search'),
      division: searchParams.get('division'),
      district: searchParams.get('district'),
      facilityType: searchParams.get('facilityType'),
      operationalStatus: searchParams.get('operationalStatus'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof FacilityQueryValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error fetching healthcare facilities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch healthcare facility listings' },
      { status: 500 }
    );
  }
}
