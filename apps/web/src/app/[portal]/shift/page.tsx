'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageTransition } from '@/components/shared/page-transition';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Clock, Plus, Trash2, Calendar, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { listShifts, createShift, deleteShift } from '@/app/actions/shift';
import { listEmployees } from '@/app/actions/employees';
import type { Shift } from 'shared';

export default function ShiftPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    start_time: '08:00',
    end_time: '17:00',
    grace_period_minutes: 15,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listShifts();
      setShifts(data);
    } catch {
      toast.error('Gagal memuat data shift');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleCreate() {
    if (!formData.name) {
      toast.error('Nama shift wajib diisi');
      return;
    }
    const res = await createShift({
      name: formData.name,
      start_time: `${formData.start_time}:00`,
      end_time: `${formData.end_time}:00`,
      grace_period_minutes: Number(formData.grace_period_minutes),
    });

    if (res.ok) {
      toast.success('Shift berhasil ditambahkan');
      setShowAddForm(false);
      setFormData({ name: '', start_time: '08:00', end_time: '17:00', grace_period_minutes: 15 });
      void loadData();
    } else {
      toast.error(res.error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Yakin ingin menonaktifkan shift ini?')) return;
    const res = await deleteShift(id);
    if (res.ok) {
      toast.success('Shift dinonaktifkan');
      void loadData();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Manajemen Shift Kerja</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Atur jam kerja, grace period toleransi keterlambatan, dan penugasan karyawan
            </p>
          </div>
          <Button onClick={() => setShowAddForm(!showAddForm)} className="gap-2">
            <Plus className="w-4 h-4" /> Tambah Shift
          </Button>
        </div>

        {showAddForm && (
          <Card className="border border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-base">Buat Shift Baru</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-medium block mb-1">Nama Shift</label>
                  <input
                    type="text"
                    placeholder="contoh: Shift Pagi"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">Jam Masuk</label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">Jam Pulang</label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">Toleransi (Menit)</label>
                  <input
                    type="number"
                    value={formData.grace_period_minutes}
                    onChange={(e) => setFormData({ ...formData, grace_period_minutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowAddForm(false)}>
                  Batal
                </Button>
                <Button size="sm" onClick={handleCreate}>
                  Simpan Shift
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {shifts.map((s) => (
            <Card key={s.id} className="relative overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" /> {s.name}
                  </CardTitle>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(s.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Jam Kerja:</span>
                  <span className="font-semibold">{s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Grace Period (Toleransi):</span>
                  <span className="font-semibold text-warning">{s.grace_period_minutes} Menit</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PageTransition>
  );
}
