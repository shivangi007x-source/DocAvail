import React from 'react';
import { cn, getStatusLabel } from '@/lib/utils';
import { AvailabilityStatus } from '@/lib/types';

interface StatusIndicatorProps {
  status: AvailabilityStatus | string;
  showText?: boolean;
  pulse?: boolean;
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  showText = true,
  pulse = true,
  className,
}) => {
  const normStatus = status?.toUpperCase();

  const colorClass =
    normStatus === 'AVAILABLE'
      ? 'bg-emerald-500'
      : normStatus === 'BUSY'
      ? 'bg-amber-500'
      : 'bg-rose-500';

  const textClass =
    normStatus === 'AVAILABLE'
      ? 'text-emerald-700'
      : normStatus === 'BUSY'
      ? 'text-amber-700'
      : 'text-rose-700';

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <span className="relative flex h-3 w-3">
        {pulse && normStatus === 'AVAILABLE' && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        )}
        <span className={cn('relative inline-flex rounded-full h-3 w-3', colorClass)} />
      </span>
      {showText && (
        <span className={cn('text-xs font-semibold uppercase tracking-wide', textClass)}>
          {getStatusLabel(normStatus)}
        </span>
      )}
    </div>
  );
};
