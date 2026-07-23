'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { Avatar } from '@/components/ui/avatar';
import {
  LayoutDashboard,
  Camera,
  CalendarCheck,
  Clock,
  User,
  ClipboardCheck,
  Users,
  FileBarChart,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { signOut } from 'next-auth/react';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  group?: string;
}

const employeeNav: NavItem[] = [
  { href: '/employee/dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Utama' },
  { href: '/employee/attendance', label: 'Presensi', icon: Camera, group: 'Utama' },
  { href: '/employee/leave', label: 'Cuti / Izin', icon: CalendarCheck, group: 'Pengajuan' },
  { href: '/employee/overtime', label: 'Lembur', icon: Clock, group: 'Pengajuan' },
  { href: '/employee/profile', label: 'Profil', icon: User, group: 'Akun' },
];

const hrdNav: NavItem[] = [
  { href: '/hrd/dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Operasional' },
  { href: '/hrd/attendance', label: 'Presensi', icon: ClipboardCheck, group: 'Operasional' },
  { href: '/hrd/leave', label: 'Cuti / Izin', icon: CalendarCheck, group: 'Approval' },
  { href: '/hrd/overtime', label: 'Lembur', icon: Clock, group: 'Approval' },
  { href: '/hrd/employees', label: 'Karyawan', icon: Users, group: 'SDM' },
  { href: '/hrd/reports', label: 'Laporan', icon: FileBarChart, group: 'Operasional' },
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
      <aside
        className={cn(
          'hidden lg:flex flex-col fixed left-0 top-0 h-screen bg-sidebar/85 backdrop-blur-xl border-r border-border z-40',
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

        <nav className="flex-1 py-5 px-3 overflow-y-auto space-y-5">
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
                      >
                        <div
                          className={cn(
                            'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200',
                            active
                              ? 'bg-gradient-to-r from-primary/15 via-primary/8 to-transparent text-primary font-semibold'
                              : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground'
                          )}
                        >
                          {active && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-gradient-to-b from-primary to-secondary shadow-elev-sm" />
                          )}
                          <item.icon
                            className={cn(
                              'w-[18px] h-[18px] shrink-0 transition-colors',
                              active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                            )}
                          />
                          <span className="truncate">{item.label}</span>
                        </div>
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
            onClick={() => signOut()}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-danger/10 hover:text-danger transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      <nav className="lg:hidden fixed bottom-3 left-3 right-3 z-50 glass-panel rounded-2xl">
        <div className="flex items-center justify-around py-2 px-1">
          {nav.slice(0, 5).map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className="flex-1"
              >
                <div
                  className={cn(
                    'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl text-[10px] font-medium transition-all',
                    active ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  <div
                    className={cn(
                      'p-1.5 rounded-lg transition-colors',
                      active && 'bg-primary/10'
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                  </div>
                  <span className="truncate">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
