'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  Camera,
  CheckCircle,
  Clock,
  FileText,
  ArrowRight,
  Timer,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { getEmployeeDashboardSummary } from '@/app/actions/dashboard';
import {
  useDebouncedRefresh,
  useSocketEvent,
} from '@/components/providers/socket-provider';
import { formatTime } from '@/lib/utils';

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

  return (
    <div className="space-y-4">
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

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard
          label="Bulan Ini"
          value={`${summary.month_attendance} hari`}
          icon={TrendingUp}
          accent="success"
        />
        <StatCard
          label="Sisa Cuti"
          value={leaveRemaining}
          description={`dari ${summary.leave_quota_total} hari`}
          icon={CalendarDays}
          accent="info"
        />
        <StatCard
          label="Pengajuan Pending"
          value={summary.pending_requests}
          icon={FileText}
          accent="warning"
          className="col-span-2 lg:col-span-1"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <QuickAction
          icon={CalendarDays}
          label="Ajukan Cuti"
          accent="primary"
          onClick={() => router.push('/employee/leave')}
        />
        <QuickAction
          icon={Timer}
          label="Ajukan Lembur"
          accent="warning"
          onClick={() => router.push('/employee/overtime')}
        />
      </div>
    </div>
  );
}

const QUICK_ACCENT: Record<'primary' | 'warning', { soft: string; icon: string }> = {
  primary: { soft: 'bg-primary/10', icon: 'text-primary' },
  warning: { soft: 'bg-warning/10', icon: 'text-warning' },
};

function QuickAction({
  icon: Icon,
  label,
  accent,
  onClick,
}: {
  icon: typeof CalendarDays;
  label: string;
  accent: 'primary' | 'warning';
  onClick: () => void;
}) {
  const palette = QUICK_ACCENT[accent];
  return (
    <button
      onClick={onClick}
      className="group bg-card border border-border rounded-xl p-5 text-left hover:shadow-elev-lg hover:-translate-y-0.5 transition-all"
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${palette.soft}`}>
        <Icon className={`w-5 h-5 ${palette.icon}`} />
      </div>
      <p className="text-sm font-medium">{label}</p>
      <ArrowRight className="w-3 h-3 text-muted-foreground mt-2 group-hover:translate-x-1 transition-transform" />
    </button>
  );
}
