import React from 'react';
import { cn } from '@/lib/utils';

interface LogoMarkProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

export function LogoMark({ size = 36, className, ...props }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0 transition-transform duration-200 hover:scale-105', className)}
      {...props}
    >
      <defs>
        {/* Sky Blue / Cyan Gradient */}
        <linearGradient id="smartHrmsCyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="55%" stopColor="#0EA5E9" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>
        {/* Emerald Green Gradient */}
        <linearGradient id="smartHrmsGreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="50%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>

      {/* 1. Head: Circular Dot at Top Center-Left */}
      <circle cx="45" cy="18" r="9.5" fill="url(#smartHrmsCyanGrad)" />

      {/* 2. Upper Swoosh: Blue / Cyan Ribbon forming top half of 'S' */}
      <path
        d="M 18 45 C 18 35, 28 29, 44 29 C 62 29, 78 36, 83 46 C 86 52, 83 58, 76 61 C 65 65, 50 63, 38 56 C 26 49, 18 52, 18 45 Z"
        fill="url(#smartHrmsCyanGrad)"
      />

      {/* 3. Lower Swoosh: Emerald Green Ribbon forming bottom half of 'S' */}
      <path
        d="M 18 75 C 18 66, 32 56, 50 52 C 66 48, 80 53, 85 63 C 89 71, 84 79, 72 85 C 58 93, 38 94, 27 88 C 20 84, 18 79, 18 75 Z"
        fill="url(#smartHrmsGreenGrad)"
      />
    </svg>
  );
}

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'mark' | 'sidebar' | 'header' | 'stacked' | 'app-icon-dark' | 'app-icon-light';
  showTagline?: boolean;
  subtitle?: string;
  className?: string;
}

export function Logo({
  size = 'md',
  variant = 'full',
  showTagline = false,
  subtitle,
  className,
}: LogoProps) {
  const iconSizes = {
    sm: 26,
    md: 34,
    lg: 44,
    xl: 56,
  };

  const markSize = iconSizes[size];

  if (variant === 'mark') {
    return <LogoMark size={markSize} className={className} />;
  }

  if (variant === 'app-icon-dark') {
    return (
      <div className={cn('w-12 h-12 rounded-2xl bg-[#1F2937] flex items-center justify-center shadow-elev-md border border-white/10', className)}>
        <LogoMark size={28} />
      </div>
    );
  }

  if (variant === 'app-icon-light') {
    return (
      <div className={cn('w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-elev-md border border-border/80', className)}>
        <LogoMark size={28} />
      </div>
    );
  }

  if (variant === 'stacked') {
    return (
      <div className={cn('flex flex-col items-center text-center gap-2 select-none', className)}>
        <LogoMark size={markSize * 1.3} />
        <div className="flex items-center gap-1.5 font-bold tracking-tight">
          <span className="text-foreground dark:text-white font-extrabold text-lg">SMART</span>
          <span className="text-[#10B981] font-extrabold text-lg">HRMS</span>
        </div>
        <div className="w-8 h-1 rounded-full bg-[#10B981] -mt-1" />
        {showTagline && (
          <span className="text-[11px] tracking-wide font-medium text-[#6B7280] dark:text-muted-foreground mt-0.5">
            Effortless People Management
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-3 select-none', className)}>
      <div className="relative flex items-center justify-center">
        <LogoMark size={markSize} />
      </div>

      <div className="flex flex-col leading-none">
        <div className="flex items-center gap-1.5 font-bold tracking-tight">
          <span className="text-foreground dark:text-white font-extrabold text-base sm:text-lg">SMART</span>
          <span className="text-[#10B981] font-extrabold text-base sm:text-lg">HRMS</span>
        </div>
        {showTagline ? (
          <span className="text-[11px] tracking-wide font-medium text-[#6B7280] dark:text-muted-foreground mt-1">
            Effortless People Management
          </span>
        ) : subtitle ? (
          <span className="text-[10px] uppercase tracking-widest text-[#6B7280] dark:text-muted-foreground mt-1">
            {subtitle}
          </span>
        ) : null}
      </div>
    </div>
  );
}
