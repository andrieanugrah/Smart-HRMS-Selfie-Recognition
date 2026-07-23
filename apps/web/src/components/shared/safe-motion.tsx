'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import { ReactNode, useEffect, useState } from 'react';

/**
 * Renders plain markup on first paint (matching server) then upgrades to
 * a motion component on the client. Eliminates hydration mismatches caused
 * by Framer Motion's inline `style` attributes (initial values).
 */
export function MotionMounted({
  children,
  ...props
}: HTMLMotionProps<'div'> & { children?: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className={(props.className as string) || ''} style={undefined}>
        {children}
      </div>
    );
  }

  return <motion.div {...props}>{children}</motion.div>;
}
