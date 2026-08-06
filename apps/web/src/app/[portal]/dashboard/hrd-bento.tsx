'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  CalendarDays,
  Camera,
  FileText,
  UserCheck,
  ArrowRight,
  Timer,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Avatar } from '@/components/ui/avatar';
import { listPendingLeavesForHRD, approveLeave } from '@/app/actions/leave';
import { listPendingOvertimesForHRD as listPendingOvertimes, approveOvertime } from '@/app/actions/overtime';
import { getHRDDashboardStats } from '@/app/actions/attendance';
import {
  useDebouncedRefresh,
  useSocketEvent,
} from '@/components/providers/socket-provider';
import { AnnouncementWidget } from '@/components/dashboard/announcement-widget';

const AttendanceTrendChart = dynamic(
  () => import('./attendance-trend-chart').then((m) => m.AttendanceTrendChart),
  { ssr: false, loading: () => <div className="h-full w-full animate-pulse rounded-xl bg-muted" /> }
);

const QUICK_LINKS = [
  { icon: UserCheck, label: 'Kelola Karyawan', href: '/hrd/employees', accent: 'primary' },
  { icon: Camera, label: 'Data Presensi', href: '/hrd/attendance', accent: 'info' },
  { icon: CalendarDays, label: 'Approval Cuti', href: '/hrd/leave', accent: 'success' },
  { icon: Timer, label: 'Approval Lembur', href: '/hrd/overtime', accent: 'warning' },
] as const;

const ACCENT_CLASS: Record<string, { soft: string; icon: string }> = {
  primary: { soft: 'bg-primary/10', icon: 'text-primary' },
  info: { soft: 'bg-info/10', icon: 'text-info' },
  success: { soft: 'bg-success/10', icon: 'text-success' },
  warning: { soft: 'bg-warning/10', icon: 'text-warning' },
};

export function HRDBento() {
  const params = useParams();
  const router = useRouter();
  const portal = (params.portal as string) ?? 'hrd';
  const [stats, setStats] = useState<any>(null);
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
  const [pendingOts, setPendingOts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [s, l, o] = await Promise.all([
      getHRDDashboardStats(),
      listPendingLeavesForHRD(),
      listPendingOvertimes(),
    ]);
    setStats(s);
    setPendingLeaves(l);
    setPendingOts(o);
    setLoading(false);
  }, []);

  const refreshStatsOnly = useCallback(async () => {
    const s = await getHRDDashboardStats();
    setStats(s);
  }, []);

  const debouncedRefresh = useDebouncedRefresh(refresh, 200);
  const debouncedStats = useDebouncedRefresh(refreshStatsOnly, 200);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useSocketEvent('attendance:new', debouncedStats);
  useSocketEvent('leave:new', debouncedRefresh);
  useSocketEvent('overtime:new', debouncedRefresh);
  useSocketEvent('leave:updated', debouncedRefresh);
  useSocketEvent('overtime:updated', debouncedRefresh);

  const handleApproveLeave = useCallback(
    async (id: string) => {
      const res = await approveLeave(id);
      if (res.ok) {
        toast.success('Cuti disetujui');
      } else {
        toast.error(res.error);
      }
    },
    []
  );

  const handleApproveOvertime = useCallback(
    async (id: string) => {
      const res = await approveOvertime(id);
      if (res.ok) {
        toast.success('Lembur disetujui');
      } else {
        toast.error(res.error);
      }
    },
    []
  );

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AnnouncementWidget />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Karyawan" value={stats.total_employees} icon={Users} accent="primary" />
        <StatCard
          label="Hadir Hari Ini"
          value={stats.present_today}
          icon={CheckCircle}
          accent="success"
          trend="up"
          trendValue="+5%"
        />
        <StatCard label="Terlambat" value={stats.late_today} icon={Clock} accent="warning" />
        <StatCard label="Belum Absen" value={stats.absent_today} icon={AlertTriangle} accent="danger" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Tren Kehadiran Mingguan</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Performa kehadiran 5 hari terakhir
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/${portal}/attendance`}>Detail</Link>
            </Button>
          </CardHeader>
          <CardContent className="h-[260px] pt-2">
            <AttendanceTrendChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Pending Approval</CardTitle>
              {stats.pending_approvals > 0 && (
                <span className="text-xs font-semibold bg-warning/15 text-warning-foreground px-2 py-0.5 rounded-full">
                  {stats.pending_approvals}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {pendingLeaves.length === 0 && pendingOts.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="Semua tertangani"
                description="Tidak ada pengajuan pending."
                className="py-6"
              />
            ) : (
              <div className="space-y-2">
                {pendingLeaves.slice(0, 3).map((req) => (
                  <div
                    key={req.id}
                    onClick={() => router.push(`/${portal}/leave`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/${portal}/leave`); }}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-muted/50 transition-colors flex items-center gap-3 cursor-pointer"
                  >
                    <Avatar name={req.profiles?.full_name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs truncate">{req.profiles?.full_name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        Cuti {req.type} • {req.start_date}
                      </p>
                    </div>
                    <StatusBadge status="pending" />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-success hover:bg-success/10"
                      aria-label="Setujui cuti"
                      onClick={(e) => { e.stopPropagation(); void handleApproveLeave(req.id); }}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {pendingOts.slice(0, 2).map((req) => (
                  <div
                    key={req.id}
                    onClick={() => router.push(`/${portal}/overtime`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/${portal}/overtime`); }}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-muted/50 transition-colors flex items-center gap-3 cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center">
                      <Timer className="w-4 h-4 text-warning" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs truncate">{req.profiles?.full_name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        Lembur {req.date}
                      </p>
                    </div>
                    <StatusBadge status="pending" />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-success hover:bg-success/10"
                      aria-label="Setujui lembur"
                      onClick={(e) => { e.stopPropagation(); void handleApproveOvertime(req.id); }}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <Button variant="ghost" className="w-full mt-2 gap-1 text-xs" asChild>
              <Link href={`/${portal}/leave`}>
                Lihat semua <ArrowRight className="w-3 h-3" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:hidden">
        {QUICK_LINKS.map((q) => {
          const palette = ACCENT_CLASS[q.accent];
          return (
            <Link key={q.href} href={q.href}>
              <Card className="hover:shadow-elev-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full">
                <CardContent className="p-4 flex flex-col items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${palette.soft}`}>
                    <q.icon className={`w-5 h-5 ${palette.icon}`} />
                  </div>
                  <p className="text-sm font-medium">{q.label}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
