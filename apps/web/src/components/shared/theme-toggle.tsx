'use client';

import { useTheme } from '@/components/providers/theme-provider';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="w-9 h-9" />;

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-muted transition-colors"
      aria-label="Toggle theme"
    >
      {reduce ? (
        theme === 'dark' ? (
          <Sun className="w-5 h-5 text-warning" />
        ) : (
          <Moon className="w-5 h-5 text-muted-foreground" />
        )
      ) : (
        <motion.div
          key={theme}
          initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, type: 'spring', stiffness: 200 }}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-warning" />
          ) : (
            <Moon className="w-5 h-5 text-muted-foreground" />
          )}
        </motion.div>
      )}
    </button>
  );
}
