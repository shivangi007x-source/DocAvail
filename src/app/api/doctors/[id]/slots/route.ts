import { NextRequest, NextResponse } from 'next/server';
import { getDoctorSlotAvailability } from '@/lib/appointmentService';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');

    const result = await getDoctorSlotAvailability(params.id, dateParam);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch (error) {
    console.error('Error loading doctor slot availability:', error);
    return NextResponse.json({ error: 'Failed to load doctor slots' }, { status: 500 });
  }
}
