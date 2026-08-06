'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { CardElevated } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

export interface StatCardProps {
  label: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  accent?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
  onClick?: () => void;
}

const accentMap: Record<NonNullable<StatCardProps['accent']>, { soft: string; chip: string; ring: string; chart: string }> = {
  primary: {
    soft: 'from-accent/15 via-accent/5 to-transparent',
    chip: 'bg-gradient-to-br from-primary to-primary-dark text-white',
    ring: 'ring-accent/40',
    chart: 'from-accent/35 to-transparent',
  },
  success: {
    soft: 'from-success/15 via-success/5 to-transparent',
    chip: 'bg-success text-success-foreground',
    ring: 'ring-success/40',
    chart: 'from-success/30 to-transparent',
  },
  warning: {
    soft: 'from-warning/15 via-warning/5 to-transparent',
    chip: 'bg-warning text-warning-foreground',
    ring: 'ring-warning/40',
    chart: 'from-warning/30 to-transparent',
  },
  danger: {
    soft: 'from-danger/15 via-danger/5 to-transparent',
    chip: 'bg-danger text-danger-foreground',
    ring: 'ring-danger/40',
    chart: 'from-danger/30 to-transparent',
  },
  info: {
    soft: 'from-info/15 via-info/5 to-transparent',
    chip: 'bg-info text-info-foreground',
    ring: 'ring-info/40',
    chart: 'from-info/30 to-transparent',
  },
};

const trendColors = {
  up: 'text-success bg-success/10',
  down: 'text-danger bg-danger/10',
  neutral: 'text-muted-foreground bg-muted',
};

export function StatCard({
  label,
  value,
  description,
  icon: Icon,
  trend,
  trendValue,
  accent = 'primary',
  className,
  onClick,
}: StatCardProps) {
  const palette = accentMap[accent];
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        'animate-in fade-in-0 slide-in-from-bottom-2',
        onClick && 'cursor-pointer transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl',
        className
      )}
      style={{ animationFillMode: 'backwards', animationDuration: '280ms' }}
    >
      <CardElevated className="relative overflow-hidden h-full">
        <div
          className={cn(
            'absolute inset-x-0 top-0 h-24 bg-gradient-to-b pointer-events-none',
            palette.soft
          )}
        />
        <div className="relative p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <p className="text-label text-muted-foreground">{label}</p>
              <p className="text-title text-data text-foreground leading-none">{value}</p>
              {description && (
                <p className="text-xs text-muted-foreground">{description}</p>
              )}
              {trend && trendValue && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                    trendColors[trend]
                  )}
                >
                  {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
                </span>
              )}
            </div>
            <div
              className={cn(
                'w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-elev-sm ring-1 ring-inset',
                palette.chip
              )}
            >
              <Icon className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className={cn('h-0.5 w-full bg-gradient-to-r', palette.chart)} />
      </CardElevated>
    </div>
  );
}
