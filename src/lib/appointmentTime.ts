export const APP_TIMEZONE = 'Asia/Kolkata';
export const MAX_APPOINTMENTS_PER_DAY = 10;
export const DEFAULT_SLOT_DURATION_MINUTES = 30;
export const ACTIVE_APPOINTMENT_STATUSES = ['PENDING', 'CONFIRMED'] as const;

export const STANDARD_CONSULTATION_TIMES = [
  '09:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '11:30 AM',
  '12:00 PM',
  '02:00 PM',
  '02:30 PM',
  '03:00 PM',
  '03:30 PM',
  '04:00 PM',
  '04:30 PM',
] as const;

/**
 * Converts a Date or date string to canonical YYYY-MM-DD in Asia/Kolkata (IST, UTC+05:30).
 * Plain YYYY-MM-DD strings are validated and preserved directly to prevent UTC shift errors.
 */
export function toIstDateKey(input?: string | Date | null): string | null {
  if (!input) return null;

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-').map(Number);
      const check = new Date(Date.UTC(y, m - 1, d));
      if (
        check.getUTCFullYear() !== y ||
        check.getUTCMonth() !== m - 1 ||
        check.getUTCDate() !== d
      ) {
        return null;
      }
      return trimmed;
    }

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return null;
    return formatDateToIstKey(parsed);
  }

  if (Number.isNaN(input.getTime())) return null;
  return formatDateToIstKey(input);
}

function formatDateToIstKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function getTodayIstDateKey(): string {
  return formatDateToIstKey(new Date());
}

export function getTomorrowIstDateKey(): string {
  return formatDateToIstKey(new Date(Date.now() + 24 * 3600 * 1000));
}

export function getIstDayOfWeek(dateKey: string): number {
  return new Date(`${dateKey}T12:00:00+05:30`).getUTCDay();
}

/**
 * Stores appointment date at 12:00 PM IST (06:30 UTC) so calendar date matches across IST and UTC views.
 */
export function istDateKeyToStorageDate(dateKey: string): Date {
  return new Date(`${dateKey}T12:00:00+05:30`);
}

export function istDateKeyToUtcBounds(dateKey: string): { startUtc: Date; endUtc: Date } {
  return {
    startUtc: new Date(`${dateKey}T00:00:00+05:30`),
    endUtc: new Date(`${dateKey}T23:59:59.999+05:30`),
  };
}

/**
 * Parses 12-hour ("10:30 AM", "02:00 PM") or 24-hour ("15:00", "09:30") times to minutes since midnight.
 */
export function parseTimeToMinutes(timeStr?: string | null): number | null {
  if (!timeStr) return null;
  const trimmed = timeStr.trim().toUpperCase();
  if (!trimmed) return null;

  const amPmMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (amPmMatch) {
    let hour = Number(amPmMatch[1]);
    const minute = Number(amPmMatch[2]);
    const meridiem = amPmMatch[3];

    if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;
    if (meridiem === 'AM') {
      if (hour === 12) hour = 0;
    } else if (hour !== 12) {
      hour += 12;
    }
    return hour * 60 + minute;
  }

  const twentyFourMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFourMatch) {
    const hour = Number(twentyFourMatch[1]);
    const minute = Number(twentyFourMatch[2]);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return hour * 60 + minute;
  }

  return null;
}

export function formatMinutesTo12h(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hours24 = Math.floor(normalized / 60);
  const mins = normalized % 60;
  const meridiem = hours24 >= 12 ? 'PM' : 'AM';
  const hour12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${String(hour12).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${meridiem}`;
}

export interface NormalizedSlotRange {
  startTime: string;
  endTime: string;
  startMinutes: number;
  endMinutes: number;
}

/**
 * Canonicalizes slot start & end times cleanly. If explicitEndTime is omitted, reversed,
 * or zero-duration, computes endTime as startMinutes + durationMinutes.
 */
export function computeSlotRange(
  startTimeStr?: string | null,
  durationMinutes = DEFAULT_SLOT_DURATION_MINUTES,
  explicitEndTimeStr?: string | null
): NormalizedSlotRange | null {
  const startMinutes = parseTimeToMinutes(startTimeStr);
  if (startMinutes === null) return null;

  const parsedEnd = parseTimeToMinutes(explicitEndTimeStr);
  const hasValidPositiveEnd =
    parsedEnd !== null && parsedEnd > startMinutes && parsedEnd - startMinutes <= 240;

  const endMinutes = hasValidPositiveEnd ? parsedEnd : startMinutes + durationMinutes;
  if (endMinutes > 24 * 60) return null;

  return {
    startTime: formatMinutesTo12h(startMinutes),
    endTime: formatMinutesTo12h(endMinutes),
    startMinutes,
    endMinutes,
  };
}

export function formatAppointmentDate(
  dateInput?: string | Date | null,
  dateKey?: string | null
): string {
  const resolvedKey = toIstDateKey(dateKey) || toIstDateKey(dateInput);
  if (!resolvedKey) return 'Date unavailable';

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: APP_TIMEZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(istDateKeyToStorageDate(resolvedKey));
}

export function formatAppointmentTimeRange(
  startTime?: string | null,
  endTime?: string | null,
  durationMinutes = DEFAULT_SLOT_DURATION_MINUTES
): string {
  const normalized = computeSlotRange(startTime, durationMinutes, endTime);
  if (!normalized) {
    return [startTime, endTime].filter(Boolean).join(' – ') || 'Time unavailable';
  }
  return `${normalized.startTime} – ${normalized.endTime}`;
}

export function compareAppointmentsChronologically(
  a: { date: string; appointmentDateKey?: string | null; startTime: string },
  b: { date: string; appointmentDateKey?: string | null; startTime: string },
  dateDirection: 'asc' | 'desc' = 'desc'
): number {
  const keyA = toIstDateKey(a.appointmentDateKey) || toIstDateKey(a.date) || '';
  const keyB = toIstDateKey(b.appointmentDateKey) || toIstDateKey(b.date) || '';

  if (keyA !== keyB) {
    return dateDirection === 'asc' ? keyA.localeCompare(keyB) : keyB.localeCompare(keyA);
  }

  const minA = parseTimeToMinutes(a.startTime) ?? 0;
  const minB = parseTimeToMinutes(b.startTime) ?? 0;
  return minA - minB;
}
