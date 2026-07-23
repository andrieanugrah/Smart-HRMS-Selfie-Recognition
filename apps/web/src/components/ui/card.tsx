import * as React from 'react';
import { cn } from '@/lib/utils';

type SurfaceLevel = 'flat' | 'raised' | 'inset';

const surfaceStyles: Record<SurfaceLevel, string> = {
  flat: 'rounded-xl border border-border bg-card text-card-foreground shadow-elev-xs',
  raised:
    'rounded-xl border border-border bg-card-elevated text-card-foreground shadow-elev-md backdrop-blur-md',
  inset:
    'rounded-lg border border-border bg-card-inset text-card-foreground',
};

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { level?: SurfaceLevel }
>(({ className, level = 'flat', ...props }, ref) => (
  <div ref={ref} className={cn(surfaceStyles[level], className)} {...props} />
));
Card.displayName = 'Card';

const CardElevated = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-xl border border-border bg-card-elevated text-card-foreground shadow-elev-md backdrop-blur-md',
      className
    )}
    {...props}
  />
));
CardElevated.displayName = 'CardElevated';

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-5 pb-3', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    as?: 'div' | 'h2' | 'h3' | 'h4';
  }
>(({ className, as: Tag = 'div', ...props }, ref) => (
  <Tag
    ref={ref}
    className={cn('text-section text-card-foreground', className)}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm text-muted-foreground leading-relaxed', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-5 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center p-5 pt-0', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

export {
  Card,
  CardElevated,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
