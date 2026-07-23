'use client';

import { ReactNode } from 'react';
import { MotionMounted } from '@/components/shared/safe-motion';

export function PageTransition({ children }: { children: ReactNode }) {
  // Default: CSS-only animation (cheap). Upgrade ke framer-motion setelah
  // mount agar tidak menambah bundle kritikal untuk first paint.
  return (
    <MotionMounted
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-2"
    >
      {children}
    </MotionMounted>
  );
}
