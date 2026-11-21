import { NextRequest, NextResponse } from 'next/server';
import { queryApprovedDoctors } from '@/lib/approvedDoctors';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const specialization = searchParams.get('specialization')?.trim() || '';
    const district = searchParams.get('district')?.trim() || '';
    const city = searchParams.get('city')?.trim() || '';
    const availability = searchParams.get('availability')?.trim() || '';

    const formattedDoctors = await queryApprovedDoctors({
      search,
      specialization,
      district,
      city,
      availability,
    });

    return NextResponse.json(
      {
        doctors: formattedDoctors,
        count: formattedDoctors.length,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching doctors:', error);
    return NextResponse.json({ error: 'Failed to retrieve doctors directory' }, { status: 500 });
  }
}
