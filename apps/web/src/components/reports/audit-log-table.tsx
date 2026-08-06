'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { ShieldAlert, Search, RefreshCw, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import type { AuditLog } from 'shared';
import { listAuditLogs } from '@/app/actions/_audit';

export function AuditLogTable() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 15;

  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listAuditLogs({
        limit,
        offset: (page - 1) * limit,
        search: search || undefined,
        action: actionFilter || undefined,
      });
      setLogs(res.data as AuditLog[]);
      setTotalCount(res.count);
    } catch {
      toast.error('Gagal memuat log aktivitas');
    } finally {
      setLoading(false);
    }
  }, [page, search, actionFilter]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  return (
    <Card className="space-y-4">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-primary" /> Audit Log & Activity History
          </CardTitle>
          <CardDescription className="text-xs mt-0.5">
            Rekam jejak seluruh riwayat aktivitas, persetujuan, dan perubahan sistem
          </CardDescription>
        </div>

        <Button variant="outline" size="sm" onClick={loadLogs} className="gap-1.5 h-8 text-xs shrink-0">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-2 text-xs">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Cari email actor, jenis tindakan, atau resource..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 h-9 text-xs"
            />
          </div>
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 px-3 rounded-xl border border-border bg-background text-xs"
          >
            <option value="">Semua Tindakan</option>
            <option value="leave:approve">Approve Cuti</option>
            <option value="leave:reject">Reject Cuti</option>
            <option value="overtime:approve">Approve Lembur</option>
            <option value="overtime:reject">Reject Lembur</option>
            <option value="holiday:create">Tambah Libur</option>
            <option value="export">Ekspor Data</option>
          </select>
        </div>

        {/* Table View */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={ShieldAlert}
            title="Tidak ada log aktivitas"
            description="Belum ada riwayat aktivitas yang tercatat sesuai filter."
            className="py-8"
          />
        ) : (
          <div className="border border-border rounded-xl overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                  <th className="py-2.5 px-3">Waktu</th>
                  <th className="py-2.5 px-3">Aktor (Pengguna)</th>
                  <th className="py-2.5 px-3">Tindakan (Action)</th>
                  <th className="py-2.5 px-3">Resource</th>
                  <th className="py-2.5 px-3">IP Address</th>
                  <th className="py-2.5 px-3 text-right">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log) => {
                  const dateStr = new Date(log.created_at).toLocaleString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground">{dateStr}</td>
                      <td className="py-2.5 px-3 font-medium">
                        <div>
                          <span>{log.actor_email || log.actor_id}</span>
                          {log.actor_role && (
                            <span className="block text-[10px] text-muted-foreground uppercase">
                              {log.actor_role}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-md text-[11px]">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground capitalize">
                        {log.resource_type} {log.resource_id ? `#${log.resource_id.substring(0, 6)}` : ''}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground font-mono text-[11px]">
                        {log.ip_address || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
          <span>
            Halaman {page} dari {totalPages} ({totalCount} total log)
          </span>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-7 px-2"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-7 px-2"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Audit Log JSON Details Drawer Modal */}
        {selectedLog && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-elev-lg text-xs">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-sm">Detail Audit Log</h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-muted-foreground hover:text-foreground text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2">
                <div>
                  <span className="text-muted-foreground block">Tindakan:</span>
                  <span className="font-mono text-primary font-semibold">{selectedLog.action}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Aktor:</span>
                  <span>{selectedLog.actor_email} ({selectedLog.actor_role})</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Resource ID:</span>
                  <span className="font-mono">{selectedLog.resource_id || '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">User Agent:</span>
                  <span className="text-muted-foreground break-all">{selectedLog.user_agent || '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">JSON Details:</span>
                  <pre className="p-3 rounded-xl bg-muted/50 border border-border font-mono text-[11px] overflow-x-auto">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button size="sm" onClick={() => setSelectedLog(null)}>
                  Tutup
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
