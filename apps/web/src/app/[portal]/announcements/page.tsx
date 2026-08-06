'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageTransition } from '@/components/shared/page-transition';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Megaphone, Plus, Trash2, Pin } from 'lucide-react';
import { toast } from 'sonner';
import { listAnnouncements, createAnnouncement, deleteAnnouncement } from '@/app/actions/announcement';
import type { Announcement } from 'shared';

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    urgency: 'info' as const,
    is_pinned: false,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listAnnouncements();
      setAnnouncements(data as any);
    } catch {
      toast.error('Gagal memuat pengumuman');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleCreate() {
    if (!formData.title || !formData.content) {
      toast.error('Judul dan isi pengumuman wajib diisi');
      return;
    }
    const res = await createAnnouncement(formData);
    if (res.ok) {
      toast.success('Pengumuman berhasil dipublikasikan');
      setShowForm(false);
      setFormData({ title: '', content: '', urgency: 'info', is_pinned: false });
      void loadData();
    } else {
      toast.error(res.error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus pengumuman ini?')) return;
    const res = await deleteAnnouncement(id);
    if (res.ok) {
      toast.success('Pengumuman dihapus');
      void loadData();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <PageTransition>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Papan Pengumuman Perusahaan</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Publikasikan pengumuman penting kepada seluruh karyawan
            </p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            <Plus className="w-4 h-4" /> Buat Pengumuman
          </Button>
        </div>

        {showForm && (
          <Card className="border border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-base">Pengumuman Baru</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-medium block mb-1">Judul Pengumuman</label>
                <input
                  type="text"
                  placeholder="contoh: Perubahan Jam Operasional Kantor"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Isi Pengumuman</label>
                <textarea
                  rows={4}
                  placeholder="Tuliskan pesan pengumuman..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium block mb-1">Tingkat Urgensi</label>
                  <select
                    value={formData.urgency}
                    onChange={(e) => setFormData({ ...formData, urgency: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
                  >
                    <option value="info">Info / Normal</option>
                    <option value="warning">Penting / Perhatian</option>
                    <option value="urgent">Sangat Mendesak (Urgent)</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="pin"
                    checked={formData.is_pinned}
                    onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                    className="rounded border-border"
                  />
                  <label htmlFor="pin" className="text-xs font-medium cursor-pointer">
                    Sematkan di Atas (Pinned)
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>
                  Batal
                </Button>
                <Button size="sm" onClick={handleCreate}>
                  Publikasikan
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : announcements.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="Belum ada pengumuman"
            description="Klik 'Buat Pengumuman' untuk menambahkan berita baru."
          />
        ) : (
          <div className="space-y-3">
            {announcements.map((item) => (
              <Card key={item.id}>
                <CardContent className="py-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-semibold text-sm">
                      {item.is_pinned && <Pin className="w-3.5 h-3.5 text-warning fill-warning" />}
                      <span>{item.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-muted text-muted-foreground">
                        {item.urgency}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-muted-foreground whitespace-pre-line leading-relaxed">{item.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
