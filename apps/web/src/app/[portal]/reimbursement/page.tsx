'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { PageTransition } from '@/components/shared/page-transition';
import { ReceiptLink } from '@/components/reimbursement/receipt-link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Receipt, Plus, Check, X, Camera, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import {
  submitReimbursement,
  listMyReimbursements,
  listAllReimbursements,
  approveReimbursement,
  rejectReimbursement,
} from '@/app/actions/reimbursement';
import type { Reimbursement } from 'shared';

export default function ReimbursementPage() {
  const params = useParams();
  const portal = params.portal as string;

  if (portal === 'hrd') return <HRDReimbursement />;
  return <EmployeeReimbursement />;
}

function EmployeeReimbursement() {
  const [claims, setClaims] = useState<Reimbursement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    category: 'medical' as const,
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    imageDataUrl: null as string | null,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await listMyReimbursements();
      setClaims(data);
    } catch {
      toast.error('Gagal memuat klaim biaya');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, imageDataUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleSubmit() {
    if (!formData.amount || Number(formData.amount) <= 0) {
      toast.error('Nominal klaim harus lebih dari 0');
      return;
    }
    if (!formData.description) {
      toast.error('Keterangan klaim wajib diisi');
      return;
    }

    const res = await submitReimbursement({
      category: formData.category,
      amount: Number(formData.amount),
      date: formData.date,
      description: formData.description,
      imageDataUrl: formData.imageDataUrl,
    });

    if (res.ok) {
      toast.success('Pengajuan klaim reimbursement berhasil dikirim');
      setShowForm(false);
      setFormData({ category: 'medical', amount: '', date: new Date().toISOString().split('T')[0], description: '', imageDataUrl: null });
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
            <h1 className="text-2xl font-bold tracking-tight">Klaim Reimbursement</h1>
            <p className="text-sm text-muted-foreground mt-1">Ajukan penggantian biaya operasional/medis</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            <Plus className="w-4 h-4" /> Ajukan Klaim
          </Button>
        </div>

        {showForm && (
          <Card className="border border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-base">Formulir Klaim Reimbursement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium block mb-1">Kategori</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
                  >
                    <option value="medical">Medis / Kesehatan</option>
                    <option value="transport">Transportasi / Perjalanan</option>
                    <option value="operational">Operasional Kantor</option>
                    <option value="meal">Makan / Entertainment</option>
                    <option value="other">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">Nominal (Rp)</label>
                  <input
                    type="number"
                    placeholder="contoh: 150000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">Tanggal Biaya</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium block mb-1">Keterangan / Alasan</label>
                <textarea
                  rows={2}
                  placeholder="Jelaskan kebutuhan pengeluaran..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium block mb-1">Foto Bukti Struk / Nota</label>
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                <Button variant="outline" size="sm" type="button" onClick={() => fileInputRef.current?.click()} className="gap-2">
                  <ImageIcon className="w-4 h-4" /> {formData.imageDataUrl ? 'Ganti Foto Nota' : 'Upload Bukti Struk'}
                </Button>
                {formData.imageDataUrl && <p className="text-[11px] text-success mt-1">Foto struk terpilih</p>}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>
                  Batal
                </Button>
                <Button size="sm" onClick={handleSubmit}>
                  Kirim Pengajuan
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : claims.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Belum ada klaim reimbursement"
            description="Klik 'Ajukan Klaim' untuk membuat pengajuan baru."
          />
        ) : (
          <div className="space-y-3">
            {claims.map((c) => (
              <Card key={c.id}>
                <CardContent className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm capitalize">{c.category}</span>
                      <span className="text-muted-foreground">• {c.date}</span>
                    </div>
                    <p className="text-muted-foreground truncate">{c.description}</p>
                    {c.receipt_url && <ReceiptLink url={c.receipt_url} label="Lihat Bukti Nota" />}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-sm text-foreground">
                      Rp {Number(c.amount).toLocaleString('id-ID')}
                    </span>
                    <StatusBadge status={c.status} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}

function HRDReimbursement() {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listAllReimbursements();
      setClaims(data);
    } catch {
      toast.error('Gagal memuat klaim reimbursement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleApprove(id: string) {
    const res = await approveReimbursement(id);
    if (res.ok) {
      toast.success('Klaim disetujui');
      void loadData();
    } else {
      toast.error(res.error);
    }
  }

  async function handleReject(id: string) {
    const reason = prompt('Alasan penolakan:');
    if (!reason) return;
    const res = await rejectReimbursement(id, reason);
    if (res.ok) {
      toast.success('Klaim ditolak');
      void loadData();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Approval Reimbursement</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Verifikasi & persetujuan klaim biaya karyawan
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : claims.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Tidak ada pengajuan reimbursement"
            description="Semua pengajuan klaim telah ditangani."
          />
        ) : (
          <div className="space-y-3">
            {claims.map((c) => (
              <Card key={c.id}>
                <CardContent className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1 min-w-0 flex-1">
                    <p className="font-semibold text-sm">{c.profiles?.full_name ?? '-'}</p>
                    <p className="text-muted-foreground">
                      Kategori: <span className="capitalize font-medium text-foreground">{c.category}</span> · Tanggal: {c.date}
                    </p>
                    <p className="text-muted-foreground">{c.description}</p>
                    {c.receipt_url && <ReceiptLink url={c.receipt_url} label="Buka Foto Bukti Struk" />}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm">Rp {Number(c.amount).toLocaleString('id-ID')}</span>
                    <StatusBadge status={c.status} />
                    {c.status === 'pending' && (
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-success hover:bg-success/10" onClick={() => handleApprove(c.id)}>
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleReject(c.id)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
