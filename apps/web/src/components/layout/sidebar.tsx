'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { Avatar } from '@/components/ui/avatar';
import {
  SquaresFour,
  Camera,
  CalendarCheck,
  Clock,
  User,
  ClipboardText,
  Users,
  ChartBar,
  SignOut,
  Receipt,
  CurrencyDollar,
  Megaphone,
  CalendarBlank,
  type Icon,
} from '@phosphor-icons/react';
import { signOut } from 'next-auth/react';

interface NavItem {
  href: string;
  label: string;
  icon: Icon;
  group?: string;
  badge?: () => number;
}

const employeeNav: NavItem[] = [
  { href: '/employee/dashboard', label: 'Dashboard', icon: SquaresFour, group: 'Utama' },
  { href: '/employee/attendance', label: 'Presensi', icon: Camera, group: 'Utama' },
  { href: '/employee/leave', label: 'Cuti / Izin', icon: CalendarCheck, group: 'Pengajuan' },
  { href: '/employee/overtime', label: 'Lembur', icon: Clock, group: 'Pengajuan' },
  { href: '/employee/reimbursement', label: 'Reimbursement', icon: Receipt, group: 'Pengajuan' },
  { href: '/employee/payroll', label: 'Slip Gaji', icon: CurrencyDollar, group: 'Keuangan' },
  { href: '/employee/profile', label: 'Profil', icon: User, group: 'Akun' },
];

const hrdNav: NavItem[] = [
  { href: '/hrd/dashboard', label: 'Dashboard', icon: SquaresFour, group: 'Operasional' },
  { href: '/hrd/attendance', label: 'Rekap Presensi', icon: ClipboardText, group: 'Operasional' },
  { href: '/hrd/shift', label: 'Kelola Shift', icon: CalendarBlank, group: 'Operasional' },
  { href: '/hrd/reports', label: 'Laporan & Ekspor', icon: ChartBar, group: 'Operasional' },
  { href: '/hrd/leave', label: 'Approval Cuti', icon: CalendarCheck, group: 'Approval' },
  { href: '/hrd/overtime', label: 'Approval Lembur', icon: Clock, group: 'Approval' },
  { href: '/hrd/reimbursement', label: 'Approval Klaim', icon: Receipt, group: 'Approval' },
  { href: '/hrd/payroll', label: 'Payroll', icon: CurrencyDollar, group: 'Keuangan' },
  { href: '/hrd/announcements', label: 'Pengumuman', icon: Megaphone, group: 'Informasi' },
  { href: '/hrd/employees', label: 'Karyawan', icon: Users, group: 'SDM' },
];

interface SidebarProps {
  role: string;
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const nav = role === 'employee' ? employeeNav : hrdNav;
  const groups = Array.from(new Set(nav.map((n) => n.group ?? 'Menu')));
  const userName = session?.user?.name || 'User';

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-primary focus:text-white"
      >
        Lewati ke konten
      </a>

      <aside
        className={cn(
          'hidden lg:flex flex-col fixed left-0 top-0 min-h-[100dvh] bg-sidebar/85 backdrop-blur-xl border-r border-border z-40',
          'w-[var(--sidebar-width)]'
        )}
      >
        <Link
          href={role === 'hrd' ? '/hrd/dashboard' : '/employee/dashboard'}
          className="flex items-center gap-3 px-5 h-16 border-b border-border shrink-0"
        >
          <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center shadow-elev-glow shrink-0">
            <span className="text-white font-bold text-sm tracking-tight">HR</span>
          </div>
          <div className="flex flex-col min-w-0 leading-tight">
            <span className="font-bold text-sm text-foreground tracking-tight">Smart HRMS</span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {role === 'hrd' ? 'HRD Console' : 'Employee Portal'}
            </span>
          </div>
        </Link>

        <nav className="flex-1 py-5 px-3 overflow-y-auto space-y-5" aria-label="Sidebar">
          {groups.map((group) => (
            <div key={group}>
              <p className="text-label text-muted-foreground px-3 mb-2">{group}</p>
              <div className="space-y-1">
                {nav
                  .filter((n) => (n.group ?? 'Menu') === group)
                  .map((item) => {
                    const active = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          active
                            ? 'bg-gradient-to-r from-accent/15 via-accent/5 to-transparent text-accent font-semibold'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground'
                        )}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-gradient-to-b from-accent to-primary shadow-elev-sm" />
                        )}
                        <item.icon
                          className={cn(
                            'w-[18px] h-[18px] shrink-0 transition-colors',
                            active ? 'text-accent' : 'text-muted-foreground group-hover:text-foreground'
                          )}
                          weight={active ? 'fill' : 'regular'}
                        />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-3 shrink-0 space-y-2">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-card border border-border">
            <Avatar name={userName} size="sm" />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-medium truncate">{userName}</span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground truncate">
                {role}
              </span>
            </div>
            <ThemeToggle />
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-danger/10 hover:text-danger transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <SignOut className="w-4 h-4 shrink-0" />
            <span>Keluar</span>
          </button>
        </div>
      </aside>
    </>
  );
}
