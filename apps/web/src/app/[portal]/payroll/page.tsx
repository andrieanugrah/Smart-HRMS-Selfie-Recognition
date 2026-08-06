'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { PageTransition } from '@/components/shared/page-transition';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { DollarSign, Printer, Download, RefreshCw, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { listPayrolls, getMyPayrolls, generateMonthlyPayroll } from '@/app/actions/payroll';
import { Header } from '@/components/layout/header';
import type { Payroll } from 'shared';
import { PayslipDocumentView } from '@/components/payroll/payslip-document-view';

export default function PayrollPage() {
  const params = useParams();
  const portal = params.portal as string;

  if (portal === 'hrd') return <HRDPayroll />;
  return <EmployeePayroll />;
}

function EmployeePayroll() {
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await getMyPayrolls();
      setPayrolls(data);
    } catch {
      toast.error('Gagal memuat slip gaji');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (selectedPayroll) {
    return (
      <PageTransition>
        <div className="max-w-4xl mx-auto">
          <PayslipDocumentView
            payroll={selectedPayroll}
            onBack={() => setSelectedPayroll(null)}
          />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6 max-w-4xl mx-auto">
        <Header title="Slip Gaji Digital" subtitle="Riwayat penerimaan gaji bulanan Anda" />

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-28 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : payrolls.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Belum ada slip gaji"
            description="Slip gaji bulanan Anda belum diterbitkan oleh HRD."
          />
        ) : (
          <div className="space-y-4">
            {payrolls.map((p) => (
              <Card key={p.id} className="overflow-hidden hover:shadow-elev-md transition-all">
                <CardHeader className="bg-primary/5 pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">
                        Periode Bulan {p.month} / {p.year}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Diterbitkan: {new Date(p.generated_at).toLocaleDateString('id-ID')}
                      </CardDescription>
                    </div>
                    <Button size="sm" onClick={() => setSelectedPayroll(p)} className="gap-1.5">
                      <Printer className="w-3.5 h-3.5" /> Cetak / Download PDF
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-2 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-muted/30 rounded-xl">
                    <div>
                      <span className="text-muted-foreground block">Gaji Pokok</span>
                      <span className="font-semibold text-sm">Rp {Number(p.base_salary).toLocaleString('id-ID')}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Tunjangan</span>
                      <span className="font-semibold text-sm">Rp {Number(p.allowance).toLocaleString('id-ID')}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Bonus Lembur</span>
                      <span className="font-semibold text-sm text-success">+ Rp {Number(p.overtime_pay).toLocaleString('id-ID')}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Potongan Terlambat</span>
                      <span className="font-semibold text-sm text-destructive">- Rp {Number(p.late_deduction).toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2 text-sm font-bold border-t">
                    <span>Gaji Bersih (THP):</span>
                    <span className="text-primary text-base">Rp {Number(p.net_salary).toLocaleString('id-ID')}</span>
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

function HRDPayroll() {
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listPayrolls(month, year);
      setPayrolls(data);
    } catch {
      toast.error('Gagal memuat rekap gaji');
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleGenerate() {
    setGenerating(true);
    const res = await generateMonthlyPayroll({ month, year });
    setGenerating(false);
    if (res.ok) {
      toast.success(`Slip gaji berhasil digenerate untuk ${res.data.count} karyawan`);
      void loadData();
    } else {
      toast.error(res.error);
    }
  }

  if (selectedPayroll) {
    return (
      <PageTransition>
        <div className="max-w-4xl mx-auto">
          <PayslipDocumentView
            payroll={selectedPayroll}
            onBack={() => setSelectedPayroll(null)}
          />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Header
            title="Penggajian & Slip Gaji (Payroll)"
            subtitle="Kalkulasi otomatis gaji pokok, tunjangan, lembur, dan potongan presensi"
          />
          <Button onClick={handleGenerate} disabled={generating} className="gap-2 shrink-0 mb-6 sm:mb-0">
            <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
            Generate Slip Gaji Bulanan
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filter Periode</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="px-3 py-2 rounded-xl border border-border bg-background text-sm"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                <option key={m} value={m}>Bulan {m}</option>
              ))}
            </select>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-28 px-3 py-2 rounded-xl border border-border bg-background text-sm"
            />
            <Button variant="outline" onClick={loadData}>Tampilkan</Button>
          </CardContent>
        </Card>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : payrolls.length === 0 ? (
          <EmptyState
            icon={DollarSign}
            title="Belum ada data penggajian"
            description="Klik 'Generate Slip Gaji Bulanan' untuk mengkalkulasi gaji periode ini."
          />
        ) : (
          <div className="space-y-3">
            {payrolls.map((p: any) => (
              <Card key={p.id} className="hover:shadow-elev-md transition-all">
                <CardContent className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-semibold text-sm">{p.profiles?.full_name ?? '-'}</p>
                    <p className="text-muted-foreground">
                      {p.profiles?.nip ?? '-'} · {p.profiles?.department ?? '-'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-muted-foreground">Gaji Bersih</p>
                      <p className="font-bold text-sm text-primary">
                        Rp {Number(p.net_salary).toLocaleString('id-ID')}
                      </p>
                    </div>
                    <StatusBadge status={p.status === 'published' ? 'approved' : p.status} />
                    <Button size="sm" variant="outline" onClick={() => setSelectedPayroll(p)} className="gap-1.5">
                      <Printer className="w-3.5 h-3.5" /> Cetak / Lihat
                    </Button>
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
