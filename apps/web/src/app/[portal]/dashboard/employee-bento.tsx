'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CalendarDays,
  Camera,
  CheckCircle,
  Clock,
  FileText,
  ArrowRight,
  Timer,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Fingerprint,
  Wallet,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { getEmployeeDashboardSummary } from '@/app/actions/dashboard';
import {
  useDebouncedRefresh,
  useSocketEvent,
} from '@/components/providers/socket-provider';
import { formatTime } from '@/lib/utils';
import { AnnouncementWidget } from '@/components/dashboard/announcement-widget';

export function EmployeeBento() {
  const router = useRouter();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const s = await getEmployeeDashboardSummary();
    setSummary(s);
    setLoading(false);
  }, []);

  const debouncedRefresh = useDebouncedRefresh(refresh, 200);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useSocketEvent('attendance:success', debouncedRefresh);
  useSocketEvent('leave:approved', debouncedRefresh);
  useSocketEvent('leave:rejected', debouncedRefresh);
  useSocketEvent('overtime:approved', debouncedRefresh);
  useSocketEvent('overtime:rejected', debouncedRefresh);

  if (loading || !summary) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  const todayStatus: string = summary.today_status;
  const checkInIso = summary.check_in;
  const checkInTime = checkInIso ? new Date(checkInIso) : null;
  const leaveRemaining = summary.leave_quota_total - summary.leave_quota_used;
  const needsFaceRegistration = summary.has_face_descriptor === false;

  const recentLeaves = (summary.recent_leaves || []).map((item: any) => ({
    id: item.id,
    kind: 'leave' as const,
    title: `Cuti (${item.type})`,
    subtitle: `${item.start_date} s/d ${item.end_date}`,
    status: item.status,
    created_at: item.created_at,
    href: '/employee/leave',
  }));

  const recentOvertimes = (summary.recent_overtimes || []).map((item: any) => ({
    id: item.id,
    kind: 'overtime' as const,
    title: `Lembur (${item.total_hours ? `${item.total_hours} jam` : `${item.duration_minutes ?? 0} menit`})`,
    subtitle: `Tanggal ${item.date}`,
    status: item.status,
    created_at: item.created_at,
    href: '/employee/overtime',
  }));

  const recentActivity = [...recentLeaves, ...recentOvertimes]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 4);

  return (
    <div className="space-y-4">
      <AnnouncementWidget />

      {needsFaceRegistration && (
        <Card className="border border-warning/20 bg-warning/10 text-warning-foreground">
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
              <div className="text-sm">
                <p className="font-semibold">Data Biometrik Belum Terdaftar</p>
                <p className="text-warning-foreground/80 mt-0.5">
                  Anda tidak dapat melakukan absensi. Harap daftarkan wajah Anda sekarang.
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/employee/profile')}
              className="text-xs font-semibold bg-warning text-white px-3 py-1.5 rounded-lg hover:bg-warning/90 transition-colors whitespace-nowrap"
            >
              Daftar Wajah
            </button>
          </CardContent>
        </Card>
      )}

      {/* Primary Attendance Banner */}
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary via-primary to-secondary text-white shadow-[0_25px_50px_-20px_rgba(13,148,136,0.55)]">
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-white/70">Status Hari Ini</p>
              <p className="mt-2 text-3xl font-bold flex items-center gap-2">
                {todayStatus === 'not_clocked_in' ? (
                  'Belum Absen'
                ) : (
                  <>
                    <CheckCircle className="w-7 h-7" />
                    {todayStatus === 'present' ? 'Hadir' : todayStatus === 'late' ? 'Terlambat' : '—'}
                  </>
                )}
              </p>
              {checkInTime && (
                <p className="mt-2 text-sm text-white/80 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Masuk pukul {formatTime(checkInTime.toISOString())}
                </p>
              )}
            </div>
            <button
              onClick={() => router.push('/employee/attendance')}
              aria-label="Mulai absen"
              className="w-16 h-16 rounded-full bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center hover:bg-white/25 transition-colors"
            >
              <Camera className="w-8 h-8" />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Stat Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard
          label="Bulan Ini"
          value={`${summary.month_attendance} hari`}
          icon={TrendingUp}
          accent="success"
          onClick={() => router.push('/employee/attendance')}
        />
        <StatCard
          label="Sisa Cuti"
          value={leaveRemaining}
          description={`dari ${summary.leave_quota_total} hari`}
          icon={CalendarDays}
          accent="info"
          onClick={() => router.push('/employee/leave')}
        />
        <StatCard
          label="Pengajuan Pending"
          value={summary.pending_requests}
          icon={FileText}
          accent="warning"
          className="col-span-2 lg:col-span-1"
          onClick={() => router.push('/employee/leave')}
        />
      </div>

      {/* Mobile & Desktop Quick Menu Shortcuts */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {[
          { label: 'Presensi', href: '/employee/attendance', icon: Fingerprint, color: 'bg-primary/10 text-primary' },
          { label: 'Cuti / Izin', href: '/employee/leave', icon: CalendarDays, color: 'bg-info/10 text-info' },
          { label: 'Slip Gaji', href: '/employee/payroll', icon: DollarSign, color: 'bg-success/10 text-success' },
          { label: 'Klaim', href: '/employee/reimbursement', icon: Wallet, color: 'bg-warning/10 text-warning' },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="hover:shadow-elev-md hover:-translate-y-0.5 transition-all cursor-pointer h-full border border-border/80">
              <CardContent className="p-3 flex flex-col items-center justify-center text-center gap-2">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.color}`}>
                  <item.icon className="w-4 h-4" />
                </div>
                <span className="text-[11px] sm:text-xs font-semibold leading-tight">{item.label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Replacement Widget: Pengajuan & Aktivitas Terbaru */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base font-semibold">Pengajuan & Aktivitas Terbaru</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Status pengajuan cuti dan lembur Anda
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
              <Link href="/employee/leave">
                Ajukan Cuti
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
              <Link href="/employee/overtime">
                Ajukan Lembur
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {recentActivity.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Belum ada riwayat pengajuan"
              description="Anda belum memiliki pengajuan cuti atau lembur terbaru."
              className="py-6"
            />
          ) : (
            <div className="divide-y divide-border">
              {recentActivity.map((item) => (
                <div
                  key={`${item.kind}-${item.id}`}
                  onClick={() => router.push(item.href)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') router.push(item.href);
                  }}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors rounded-lg px-2 cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        item.kind === 'leave'
                          ? 'bg-info/10 text-info'
                          : 'bg-warning/10 text-warning'
                      }`}
                    >
                      {item.kind === 'leave' ? (
                        <CalendarDays className="w-4 h-4" />
                      ) : (
                        <Timer className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge status={item.status} />
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
