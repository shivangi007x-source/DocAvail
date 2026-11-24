import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getStatusBadgeVariant(status: string) {
  switch (status?.toUpperCase()) {
    case 'AVAILABLE':
      return 'available';
    case 'BUSY':
      return 'busy';
    case 'UNAVAILABLE':
    default:
      return 'unavailable';
  }
}

export function getStatusLabel(status: string): string {
  switch (status?.toUpperCase()) {
    case 'AVAILABLE':
      return 'Available Now';
    case 'BUSY':
      return 'In Consultation / Busy';
    case 'UNAVAILABLE':
      return 'Offline / Unavailable';
    default:
      return 'Unknown';
  }
}

export function formatDoctorDisplayName(name?: string | null): string {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed) return 'Doctor';
  const stripped = trimmed.replace(/^dr\.?\s+/i, '').trim();
  return `Dr. ${stripped || trimmed}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function formatClinicAddress(...parts: Array<string | null | undefined>): string {
  const result: string[] = [];

  for (const raw of parts) {
    if (typeof raw !== 'string') continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;

    const existing = result.join(', ');
    if (existing) {
      const tokenRegex = new RegExp(`(?:^|[,\\s])${escapeRegExp(trimmed)}(?:$|[,\\s])`, 'i');
      if (tokenRegex.test(existing)) {
        continue;
      }
    }

    result.push(trimmed);
  }

  return result.join(', ');
}
