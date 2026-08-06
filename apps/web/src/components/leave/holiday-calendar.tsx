'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Plus, Trash2, CalendarDays, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { Holiday } from 'shared';
import { listHolidays, createHoliday, deleteHoliday, syncPublicHolidays } from '@/app/actions/holidays';
import { useSocketEvent, useDebouncedRefresh } from '@/components/providers/socket-provider';

interface HolidayCalendarProps {
  isHrd?: boolean;
}

export function HolidayCalendar({ isHrd = false }: HolidayCalendarProps) {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'national' | 'company_leave'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<'national' | 'company_leave'>('national');
  const [description, setDescription] = useState('');

  const loadHolidays = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listHolidays(2026);
      setHolidays(data);
    } catch {
      toast.error('Gagal memuat libur nasional');
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedRefresh = useDebouncedRefresh(loadHolidays, 200);

  useEffect(() => {
    void loadHolidays();
  }, [loadHolidays]);

  useSocketEvent('holiday:updated', debouncedRefresh);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !name) {
      toast.error('Tanggal dan nama libur wajib diisi');
      return;
    }

    setSubmitting(true);
    const res = await createHoliday({ date, name, type, description });
    setSubmitting(false);

    if (res.ok) {
      toast.success('Libur nasional/cuti bersama berhasil ditambahkan');
      setShowAddModal(false);
      setDate('');
      setName('');
      setDescription('');
      void loadHolidays();
    } else {
      toast.error(res.error);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Hapus libur "${name}"?`)) return;
    const res = await deleteHoliday(id);
    if (res.ok) {
      toast.success('Libur berhasil dihapus');
      void loadHolidays();
    } else {
      toast.error(res.error);
    }
  }

  const filteredHolidays = holidays.filter((h) => {
    if (filterType === 'all') return true;
    return h.type === filterType;
  });

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              Kalender Libur Nasional & Cuti Bersama 2026
            </CardTitle>
          </div>
          <CardDescription className="text-xs mt-0.5">
            Daftar tanggal merah resmi dan cuti bersama perusahaan
          </CardDescription>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex bg-muted/60 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filterType === 'all' ? 'bg-background font-medium shadow-xs' : 'text-muted-foreground'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setFilterType('national')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filterType === 'national' ? 'bg-background font-medium text-destructive shadow-xs' : 'text-muted-foreground'
              }`}
            >
              Nasional
            </button>
            <button
              onClick={() => setFilterType('company_leave')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filterType === 'company_leave' ? 'bg-background font-medium text-info shadow-xs' : 'text-muted-foreground'
              }`}
            >
              Cuti Bersama
            </button>
          </div>

          {isHrd && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  setSyncing(true);
                  const res = await syncPublicHolidays(2026);
                  setSyncing(false);
                  if (res.ok) {
                    toast.success(`Berhasil sinkron ${(res.data as any)?.added ?? 0} libur nasional`);
                    void loadHolidays();
                  } else {
                    toast.error(res.error);
                  }
                }}
                disabled={syncing}
                className="gap-1.5 h-8 text-xs"
              >
                <Sparkles className="w-3.5 h-3.5" /> {syncing ? 'Sinkron...' : 'Sinkron API'}
              </Button>
              <Button size="sm" onClick={() => setShowAddModal(true)} className="gap-1.5 h-8 text-xs">
                <Plus className="w-3.5 h-3.5" /> Tambah
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filteredHolidays.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            Belum ada data libur untuk kategori ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {filteredHolidays.map((h) => {
              const dateObj = new Date(h.date);
              const formattedDate = dateObj.toLocaleDateString('id-ID', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              });

              const isNational = h.type === 'national';

              return (
                <div
                  key={h.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                    isNational
                      ? 'border-destructive/20 bg-destructive/5 hover:bg-destructive/10'
                      : 'border-info/20 bg-info/5 hover:bg-info/10'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 ${
                        isNational ? 'bg-destructive/15 text-destructive' : 'bg-info/15 text-info'
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase leading-none">
                        {dateObj.toLocaleDateString('id-ID', { month: 'short' })}
                      </span>
                      <span className="text-sm font-extrabold leading-tight">{dateObj.getDate()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-xs truncate">{h.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{formattedDate}</span>
                        <span
                          className={`text-[9px] font-medium px-1.5 py-0.2 rounded-full ${
                            isNational
                              ? 'bg-destructive/15 text-destructive'
                              : 'bg-info/15 text-info'
                          }`}
                        >
                          {isNational ? 'Libur Nasional' : 'Cuti Bersama'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isHrd && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => void handleDelete(h.id, h.name)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Add Holiday Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-4 shadow-elev-lg">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base">Tambah Libur / Cuti Bersama</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-muted-foreground hover:text-foreground text-sm"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAdd} className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium mb-1">Nama Libur / Cuti</label>
                  <input
                    type="text"
                    placeholder="Contoh: Hari Kemerdekaan RI"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium mb-1">Kategori</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background"
                  >
                    <option value="national">Libur Nasional (Tanggal Merah)</option>
                    <option value="company_leave">Cuti Bersama Perusahaan</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium mb-1">Keterangan (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Catatan tambahan"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                    Batal
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Menyimpan...' : 'Simpan'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
