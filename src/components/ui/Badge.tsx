import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-slate-100 text-slate-800 border border-slate-200',
        available: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
        busy: 'bg-amber-50 text-amber-700 border border-amber-200/80',
        unavailable: 'bg-rose-50 text-rose-700 border border-rose-200/80',
        brand: 'bg-brand-50 text-brand-700 border border-brand-200',
        verified: 'bg-blue-50 text-blue-700 border border-blue-200',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant,
  dot,
  children,
  ...props
}) => {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            'mr-1.5 h-1.5 w-1.5 rounded-full',
            variant === 'available' && 'bg-emerald-500 animate-pulse',
            variant === 'busy' && 'bg-amber-500',
            variant === 'unavailable' && 'bg-rose-500',
            variant === 'brand' && 'bg-brand-500',
            (!variant || variant === 'default') && 'bg-slate-400'
          )}
        />
      )}
      {children}
    </div>
  );
};
