import * as React from 'react';
import { cn, getStatusColor, getStatusLabel } from '@/lib/utils';

export interface StatusBadgeProps {
  status: string;
  className?: string;
  showDot?: boolean;
}

export function StatusBadge({ status, className, showDot = true }: StatusBadgeProps) {
  const colors = getStatusColor(status);
  const label = getStatusLabel(status);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset whitespace-nowrap',
        colors.bg,
        colors.text,
        className
      )}
    >
      {showDot && (
        <span className="relative flex w-1.5 h-1.5 shrink-0">
          <span className="absolute inset-0 rounded-full bg-current opacity-60 animate-ping" />
          <span className="relative rounded-full w-1.5 h-1.5 bg-current opacity-80" />
        </span>
      )}
      {label}
    </span>
  );
}
