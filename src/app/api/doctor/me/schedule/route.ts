import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { WorkingHoursItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

function parseTimeToMinutes(timeStr: string): number | null {
  if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return null;
  const [hours, mins] = timeStr.split(':').map(Number);
  if (hours < 0 || hours > 23 || mins < 0 || mins > 59) return null;
  return hours * 60 + mins;
}

export async function GET() {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'DOCTOR' || !user.doctorProfile) {
      return NextResponse.json({ error: 'Forbidden: Doctor role required' }, { status: 403 });
    }

    const doctorId = user.doctorProfile.id;

    const workingHours = await prisma.workingHours.findMany({
      where: { doctorId },
      orderBy: { dayOfWeek: 'asc' },
    });

    // If doctor has no configured schedule yet, provide standard Mon-Fri template
    const fullWeek: WorkingHoursItem[] = [];
    const existingDaysMap = new Map(workingHours.map((wh) => [wh.dayOfWeek, wh]));

    for (let day = 0; day <= 6; day++) {
      const existing = existingDaysMap.get(day);
      if (existing) {
        fullWeek.push({
          id: existing.id,
          doctorId: existing.doctorId,
          dayOfWeek: existing.dayOfWeek,
          startTime: existing.startTime,
          endTime: existing.endTime,
          breakStart: existing.breakStart,
          breakEnd: existing.breakEnd,
          slotDurationMinutes: existing.slotDurationMinutes || 30,
          isActive: existing.isActive,
        });
      } else {
        // Default: weekdays active 09:00 - 17:00, weekends inactive
        const isWeekday = day >= 1 && day <= 5;
        fullWeek.push({
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '17:00',
          breakStart: '13:00',
          breakEnd: '14:00',
          slotDurationMinutes: 30,
          isActive: isWeekday,
        });
      }
    }

    return NextResponse.json({ schedule: fullWeek });
  } catch (error) {
    console.error('Error fetching doctor schedule:', error);
    return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'DOCTOR' || !user.doctorProfile) {
      return NextResponse.json({ error: 'Forbidden: Doctor role required' }, { status: 403 });
    }

    const doctorId = user.doctorProfile.id;
    const body = await req.json();
    const { schedule } = body;

    if (!Array.isArray(schedule) || schedule.length === 0) {
      return NextResponse.json({ error: 'Schedule must be an array of daily configurations' }, { status: 400 });
    }

    // Validation
    const validatedDays: WorkingHoursItem[] = [];

    for (const item of schedule) {
      const day = Number(item.dayOfWeek);
      if (isNaN(day) || day < 0 || day > 6) {
        return NextResponse.json({ error: `Invalid day of week: ${item.dayOfWeek}. Must be 0 to 6.` }, { status: 400 });
      }

      const isActive = Boolean(item.isActive);
      const startTime = String(item.startTime || '09:00');
      const endTime = String(item.endTime || '17:00');
      const slotDuration = parseInt(item.slotDurationMinutes) || 30;

      if (slotDuration < 10 || slotDuration > 120) {
        return NextResponse.json({ error: 'Slot duration must be between 10 and 120 minutes.' }, { status: 400 });
      }

      if (isActive) {
        const startMin = parseTimeToMinutes(startTime);
        const endMin = parseTimeToMinutes(endTime);

        if (startMin === null || endMin === null) {
          return NextResponse.json({ error: `Invalid time format on day ${day}. Use HH:mm.` }, { status: 400 });
        }

        if (endMin <= startMin) {
          return NextResponse.json({ error: `End time must be strictly after start time on day ${day}.` }, { status: 400 });
        }

        // Validate break period if provided
        let breakStart = item.breakStart ? String(item.breakStart) : null;
        let breakEnd = item.breakEnd ? String(item.breakEnd) : null;

        if (breakStart && breakEnd) {
          const bStartMin = parseTimeToMinutes(breakStart);
          const bEndMin = parseTimeToMinutes(breakEnd);

          if (bStartMin === null || bEndMin === null) {
            return NextResponse.json({ error: `Invalid break time format on day ${day}.` }, { status: 400 });
          }

          if (bEndMin <= bStartMin) {
            return NextResponse.json({ error: `Break end time must be after break start time on day ${day}.` }, { status: 400 });
          }

          if (bStartMin < startMin || bEndMin > endMin) {
            return NextResponse.json({ error: `Break must fall within working hours (${startTime} - ${endTime}) on day ${day}.` }, { status: 400 });
          }
        } else {
          breakStart = null;
          breakEnd = null;
        }

        validatedDays.push({
          dayOfWeek: day,
          startTime,
          endTime,
          breakStart,
          breakEnd,
          slotDurationMinutes: slotDuration,
          isActive: true,
        });
      } else {
        // Inactive day
        validatedDays.push({
          dayOfWeek: day,
          startTime,
          endTime,
          breakStart: null,
          breakEnd: null,
          slotDurationMinutes: slotDuration,
          isActive: false,
        });
      }
    }

    // Upsert validated working hours in a Prisma transaction
    await prisma.$transaction(
      validatedDays.map((item) =>
        prisma.workingHours.upsert({
          where: {
            doctorId_dayOfWeek: {
              doctorId,
              dayOfWeek: item.dayOfWeek,
            },
          },
          update: {
            startTime: item.startTime,
            endTime: item.endTime,
            breakStart: item.breakStart,
            breakEnd: item.breakEnd,
            slotDurationMinutes: item.slotDurationMinutes,
            isActive: item.isActive,
          },
          create: {
            doctorId,
            dayOfWeek: item.dayOfWeek,
            startTime: item.startTime,
            endTime: item.endTime,
            breakStart: item.breakStart,
            breakEnd: item.breakEnd,
            slotDurationMinutes: item.slotDurationMinutes,
            isActive: item.isActive,
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      message: 'Weekly schedule saved successfully.',
      schedule: validatedDays,
    });
  } catch (error) {
    console.error('Error saving doctor schedule:', error);
    return NextResponse.json({ error: 'Failed to save schedule.' }, { status: 500 });
  }
}
