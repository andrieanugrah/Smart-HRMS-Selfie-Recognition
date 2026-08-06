'use client';

import { useState, useEffect, useTransition, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Calendar, AlertCircle, FileText, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { PageTransition } from '@/components/shared/page-transition';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar } from '@/components/ui/avatar';
import { LeaveFormDialog } from '@/components/leave/leave-form-dialog';
import { LeaveDetailDialog } from '@/components/leave/leave-detail-dialog';
import { HolidayCalendar } from '@/components/leave/holiday-calendar';
import { listMyLeaves, listAllLeaves } from '@/app/actions/leave';
import {
  useDebouncedRefresh,
  useSocketEvent,
} from '@/components/providers/socket-provider';
import { toast } from 'sonner';
import { formatDate, getLeaveTypeLabel } from '@/lib/utils';

const typeColors: Record<string, string> = {
  annual: 'bg-primary/10 text-primary',
  sick: 'bg-danger/10 text-danger',
  personal: 'bg-warning/10 text-warning',
  maternity: 'bg-info/10 text-info',
  other: 'bg-muted text-muted-foreground',
};

const typeIcons: Record<string, any> = {
  annual: Calendar,
  sick: AlertCircle,
  personal: FileText,
  maternity: Calendar,
  other: FileText,
};

export default function LeavePage() {
  const params = useParams();
  const portal = params.portal as string;
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<any | null>(null);
  const [, startTransition] = useTransition();
  const aliveRef = useRef(true);
  const requestIdRef = useRef(0);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const data =
        portal === 'hrd'
          ? await listAllLeaves(tab === 'all' ? undefined : tab)
          : await listMyLeaves();
      if (aliveRef.current && requestId === requestIdRef.current) {
        setItems(data ?? []);
      }
    } catch {
      if (aliveRef.current && requestId === requestIdRef.current) {
        toast.warning('Gagal memuat data cuti. Coba lagi.');
      }
    } finally {
      if (aliveRef.current && requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [portal, tab]);

  const debouncedRefresh = useDebouncedRefresh(refresh, 200);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Realtime: refresh the HRD list when an employee submits a leave or when
  // HRD approves/rejects. Without these the page only updates on manual reload.
  useSocketEvent('leave:new', () => {
    if (portal === 'hrd') debouncedRefresh();
  });
  useSocketEvent('leave:updated', () => {
    if (portal === 'hrd') debouncedRefresh();
  });

  // Fallback: refresh on focus / tab visibility so disconnected sockets
  // still resync the list.
  useEffect(() => {
    if (portal !== 'hrd') return;
    function onFocus() {
      void refresh();
    }
    function onVisibility() {
      if (document.visibilityState === 'visible') void refresh();
    }
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [portal, refresh]);

  if (portal === 'hrd') {
    const stats = {
      pending: items.filter((d) => d.status === 'pending').length,
      approved: items.filter((d) => d.status === 'approved').length,
      rejected: items.filter((d) => d.status === 'rejected').length,
      total: items.length,
    };

    return (
      <PageTransition>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Approval Cuti & Izin</h1>
            <p className="text-sm text-muted-foreground mt-1">Review dan kelola pengajuan</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Pending', value: stats.pending, accent: 'text-warning' },
              { label: 'Disetujui', value: stats.approved, accent: 'text-success' },
              { label: 'Ditolak', value: stats.rejected, accent: 'text-danger' },
              { label: 'Total', value: stats.total, accent: 'text-info' },
            ].map((s, i) => (
              <div
                key={s.label}
                className="bg-card border border-border rounded-xl p-4 animate-in fade-in-0 slide-in-from-bottom-2"
                style={{ animationFillMode: 'backwards', animationDelay: `${i * 50}ms`, animationDuration: '300ms' }}
              >
                <p className={`text-2xl font-bold ${s.accent}`}>{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="all">Semua</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Disetujui</TabsTrigger>
              <TabsTrigger value="rejected">Ditolak</TabsTrigger>
            </TabsList>
            <TabsContent value={tab}>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="Belum ada pengajuan"
                  description="Belum ada pengajuan cuti yang perlu di-review."
                />
              ) : (
                <div className="space-y-3">
                  {items.map((item: any, i: number) => {
                    const Icon = typeIcons[item.type] || FileText;
                    return (
                      <div
                        key={item.id}
                        className="animate-in fade-in-0 slide-in-from-bottom-2"
                        style={{ animationFillMode: 'backwards', animationDelay: `${i * 40}ms`, animationDuration: '300ms' }}
                      >
                        <Card
                          className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => setDetailItem(item)}
                        >
                          <CardContent className="py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                  typeColors[item.type] || 'bg-muted text-muted-foreground'
                                }`}
                              >
                                <Icon className="w-5 h-5" />
                              </div>
                              <Avatar name={item.profiles?.full_name ?? '?'} size="sm" className="ml-1" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{item.profiles?.full_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {getLeaveTypeLabel(item.type)} • {item.profiles?.nip}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(item.start_date)} — {formatDate(item.end_date)}
                                </p>
                              </div>
                              <StatusBadge status={item.status} />
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <HolidayCalendar isHrd={true} />

          <LeaveDetailDialog
            open={!!detailItem}
            onOpenChange={(o) => !o && setDetailItem(null)}
            item={detailItem}
            mode="hrd"
            onAction={refresh}
          />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Cuti & Izin</h1>
            <p className="text-sm text-muted-foreground mt-1">Kelola pengajuan cuti dan izin Anda</p>
          </div>
          <Button onClick={() => setFormOpen(true)} className="gap-2 shrink-0">
            <Plus className="w-4 h-4" /> Ajukan
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Belum ada pengajuan"
            description="Ajukan cuti atau izin pertama Anda."
            action={{ label: 'Ajukan Sekarang', onClick: () => setFormOpen(true) }}
          />
        ) : (
          <div className="space-y-3">
            {items.map((item: any, i: number) => {
              const Icon = typeIcons[item.type] || FileText;
              return (
                <div
                  key={item.id}
                  className="animate-in fade-in-0 slide-in-from-bottom-2"
                  style={{ animationFillMode: 'backwards', animationDelay: `${i * 40}ms`, animationDuration: '300ms' }}
                >
                  <Card
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setDetailItem(item)}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            typeColors[item.type] || 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{getLeaveTypeLabel(item.type)}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(item.start_date)} — {formatDate(item.end_date)}
                          </p>
                        </div>
                        <StatusBadge status={item.status} />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        )}

        <HolidayCalendar isHrd={false} />
      </div>

      <LeaveFormDialog open={formOpen} onOpenChange={setFormOpen} onSuccess={refresh} />
      <LeaveDetailDialog
        open={!!detailItem}
        onOpenChange={(o) => !o && setDetailItem(null)}
        item={detailItem}
        mode="view"
        onAction={refresh}
      />
    </PageTransition>
  );
}
