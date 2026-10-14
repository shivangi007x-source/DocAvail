import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
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
