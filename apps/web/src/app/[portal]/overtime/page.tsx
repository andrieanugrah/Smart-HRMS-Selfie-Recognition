'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Clock, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { PageTransition } from '@/components/shared/page-transition';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar } from '@/components/ui/avatar';
import { OvertimeFormDialog } from '@/components/overtime/overtime-form-dialog';
import { OvertimeDetailDialog } from '@/components/overtime/overtime-detail-dialog';
import { listMyOvertimes, listAllOvertimes } from '@/app/actions/overtime';
import { formatDate, formatTime } from '@/lib/utils';

export default function OvertimePage() {
  const params = useParams();
  const portal = params.portal as string;
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<any | null>(null);

  const refresh = async () => {
    setLoading(true);
    if (portal === 'hrd') {
      const data = await listAllOvertimes(tab === 'all' ? undefined : tab);
      setItems(data);
    } else {
      const data = await listMyOvertimes();
      setItems(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portal, tab]);

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {portal === 'hrd' ? 'Approval Lembur' : 'Lembur'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {portal === 'hrd' ? 'Review pengajuan lembur karyawan' : 'Ajukan dan pantau lembur Anda'}
            </p>
          </div>
          {portal === 'employee' && (
            <Button onClick={() => setFormOpen(true)} className="gap-2 shrink-0">
              <Plus className="w-4 h-4" /> Ajukan
            </Button>
          )}
        </div>

        {portal === 'hrd' ? (
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
                  {[1, 2].map((i) => (
                    <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <EmptyState
                  icon={Clock}
                  title="Belum ada pengajuan lembur"
                  description="Belum ada pengajuan yang perlu di-review."
                />
              ) : (
                <OvertimeList items={items} onSelect={setDetailItem} />
              )}
            </TabsContent>
          </Tabs>
        ) : loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="Belum ada lembur"
            description="Ajukan lembur pertama Anda."
            action={{ label: 'Ajukan Lembur', onClick: () => setFormOpen(true) }}
          />
        ) : (
          <OvertimeList items={items} onSelect={setDetailItem} />
        )}
      </div>

      <OvertimeFormDialog open={formOpen} onOpenChange={setFormOpen} onSuccess={refresh} />
      <OvertimeDetailDialog
        open={!!detailItem}
        onOpenChange={(o) => !o && setDetailItem(null)}
        item={detailItem}
        mode={portal === 'hrd' ? 'hrd' : 'view'}
        onAction={refresh}
      />
    </PageTransition>
  );
}

function OvertimeList({ items, onSelect }: { items: any[]; onSelect: (item: any) => void }) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const isHRD = !!item.profiles;
        return (
          <div
            key={item.id}
            className="animate-in fade-in-0 slide-in-from-bottom-2"
            style={{ animationFillMode: 'backwards', animationDelay: `${i * 40}ms`, animationDuration: '300ms' }}
          >
            <Card
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onSelect(item)}
            >
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-warning" />
                  </div>
                  {isHRD ? <Avatar name={item.profiles.full_name} size="sm" /> : null}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {isHRD ? item.profiles.full_name : formatDate(item.date)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(`2000-01-01T${item.start_time}`)} —{' '}
                      {formatTime(`2000-01-01T${item.end_time}`)} ({item.total_hours} jam)
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
  );
}
