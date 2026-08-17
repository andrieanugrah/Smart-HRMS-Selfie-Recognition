'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  SquaresFour,
  Fingerprint,
  CalendarCheck,
  Clock,
  User,
  Users,
  type Icon,
} from '@phosphor-icons/react';

interface FooterProps {
  role: 'employee' | 'hrd';
}

interface NavTab {
  href: string;
  label: string;
  icon: Icon;
  isMain?: boolean;
}

const employeeTabs: NavTab[] = [
  { href: '/employee/dashboard', label: 'Home', icon: SquaresFour },
  { href: '/employee/leave', label: 'Cuti', icon: CalendarCheck },
  { href: '/employee/attendance', label: 'Absen', icon: Fingerprint, isMain: true },
  { href: '/employee/overtime', label: 'Lembur', icon: Clock },
  { href: '/employee/profile', label: 'Profil', icon: User },
];

const hrdTabs: NavTab[] = [
  { href: '/hrd/dashboard', label: 'Home', icon: SquaresFour },
  { href: '/hrd/leave', label: 'Cuti', icon: CalendarCheck },
  { href: '/hrd/attendance', label: 'Absensi', icon: Fingerprint, isMain: true },
  { href: '/hrd/overtime', label: 'Lembur', icon: Clock },
  { href: '/hrd/employees', label: 'Karyawan', icon: Users },
];

export function Footer({ role }: FooterProps) {
  const pathname = usePathname();
  const tabs = role === 'employee' ? employeeTabs : hrdTabs;
  const currentYear = new Date().getFullYear();

  return (
    <>
      {/* Desktop Glassmorphic Footer */}
      <footer className="hidden lg:block mt-12 pt-6 border-t border-border/60 text-xs text-muted-foreground">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-card/50 backdrop-blur-md border border-border/40">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 text-success font-medium text-[11px]">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              System Operational
            </span>
            <span className="text-muted-foreground/40">•</span>
            <span>Smart HRMS v2.0 — Biometric Secured</span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href={role === 'employee' ? '/employee/profile' : '/hrd/reports'}
              className="hover:text-foreground transition-colors"
            >
              {role === 'employee' ? 'Profil Saya' : 'Laporan & Ekspor'}
            </Link>
            <span className="text-muted-foreground/40">•</span>
            <span>© {currentYear} Smart HRMS</span>
          </div>
        </div>
      </footer>

      {/* Mobile Floating Bottom Dock (iOS Style) */}
      <nav
        aria-label="Mobile Navigation Dock"
        className="lg:hidden fixed bottom-3 left-3 right-3 z-40 bg-card/90 backdrop-blur-xl border border-border/80 shadow-[0_10px_30px_rgba(0,0,0,0.2)] rounded-2xl px-2 py-1.5 flex items-center justify-around"
      >
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          const IconComponent = tab.icon;

          if (tab.isMain) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex flex-col items-center justify-center relative -top-3"
              >
                <div
                  className={cn(
                    'w-12 h-12 rounded-full gradient-brand flex items-center justify-center text-white shadow-elev-glow transition-transform active:scale-95',
                    active && 'ring-4 ring-primary/30'
                  )}
                >
                  <IconComponent className="w-6 h-6" weight="bold" />
                </div>
                <span
                  className={cn(
                    'text-[10px] font-semibold mt-0.5 transition-colors',
                    active ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {tab.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex flex-col items-center justify-center px-3 py-1 rounded-xl transition-all duration-200',
                active ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <IconComponent
                className="w-5 h-5 transition-transform"
                weight={active ? 'fill' : 'regular'}
              />
              <span className="text-[10px] mt-0.5">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
