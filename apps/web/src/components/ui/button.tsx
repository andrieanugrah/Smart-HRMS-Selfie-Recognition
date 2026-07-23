'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background select-none',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-white shadow-elev-sm hover:bg-primary-dark hover:shadow-elev-md',
        gradient:
          'text-white shadow-elev-glow gradient-brand hover:brightness-110 hover:shadow-[0_18px_44px_-16px_rgba(37,99,235,0.45)]',
        destructive:
          'bg-danger text-white shadow-elev-sm hover:bg-danger/90 hover:shadow-elev-md',
        outline:
          'border border-border bg-card/60 text-foreground hover:bg-card hover:border-border-strong hover:shadow-elev-sm',
        secondary:
          'bg-muted text-foreground hover:bg-muted/80',
        ghost:
          'text-foreground hover:bg-muted',
        success:
          'bg-success text-white shadow-elev-sm hover:bg-success/90',
        soft:
          'bg-primary/10 text-primary hover:bg-primary/15',
        subtle:
          'bg-primary/10 text-primary hover:bg-primary/15',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4',
        sm: 'h-9 rounded-md px-3 text-xs',
        lg: 'h-11 px-6 text-[15px]',
        xl: 'h-12 px-7 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
