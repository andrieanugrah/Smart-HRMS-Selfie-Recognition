'use client';

import { useState } from 'react';
import { Download, Printer, FileSpreadsheet, FileText } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { PageTransition } from '@/components/shared/page-transition';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Field } from '@/components/ui/form';
import { listAttendanceForHRD } from '@/app/actions/attendance';
import { listAllLeaves } from '@/app/actions/leave';
import { listAllOvertimes } from '@/app/actions/overtime';

type ReportKind = 'attendance' | 'leave' | 'overtime';

export default function ReportsPage() {
  const [from, setFrom] = useState<Date | undefined>(undefined);
  const [to, setTo] = useState<Date | undefined>(undefined);
  const [busy, setBusy] = useState<ReportKind | null>(null);

  const withinRange = (value: string | undefined) => {
    if (!value) return true;
    const d = new Date(value);
    if (from && d < new Date(from.toDateString())) return false;
    if (to && d > new Date(to.toDateString())) return false;
    return true;
  };

  async function exportXLSX(kind: ReportKind) {
    try {
      setBusy(kind);
      const rows = await loadRows(kind);
      const sheet = buildSheet(kind, rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, sheet, kind);
      const stamp = format(new Date(), 'yyyy-MM-dd');
      XLSX.writeFile(wb, `laporan-${kind}-${stamp}.xlsx`);
      toast.success(`File laporan ${kind} berhasil diunduh.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal membuat laporan.');
    } finally {
      setBusy(null);
    }
  }

  function handlePrint() {
    if (typeof window !== 'undefined') window.print();
  }

  return (
    <PageTransition>
      <div className="space-y-6 print:space-y-3">
        <div className="print:hidden">
          <h1 className="text-2xl font-bold tracking-tight">Laporan</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ekspor data presensi, cuti, dan lembur ke Excel, atau cetak sebagai PDF via dialog browser.
          </p>
        </div>

        <Card className="print:hidden">
          <CardHeader>
            <CardTitle>Filter Periode</CardTitle>
            <CardDescription>Pilih tanggal mulai dan selesai (opsional). Kosongkan untuk seluruh data.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Dari">
              <DatePicker value={from} onChange={setFrom} placeholder="Pilih tanggal mulai" />
            </Field>
            <Field label="Sampai">
              <DatePicker value={to} onChange={setTo} placeholder="Pilih tanggal akhir" />
            </Field>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
          <ReportCard
            icon={FileSpreadsheet}
            title="Presensi"
            description="Daftar absensi seluruh karyawan."
            loading={busy === 'attendance'}
            onExport={() => exportXLSX('attendance')}
          />
          <ReportCard
            icon={FileSpreadsheet}
            title="Cuti / Izin"
            description="Pengajuan cuti beserta status dan periode."
            loading={busy === 'leave'}
            onExport={() => exportXLSX('leave')}
          />
          <ReportCard
            icon={FileSpreadsheet}
            title="Lembur"
            description="Pengajuan lembur dengan total jam kerja."
            loading={busy === 'overtime'}
            onExport={() => exportXLSX('overtime')}
          />
        </div>

        <Card className="print:hidden">
          <CardContent className="pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Cetak Laporan</p>
                <p className="text-xs text-muted-foreground">
                  Buka dialog cetak browser. Pilih "Save as PDF" untuk menyimpan sebagai PDF.
                </p>
              </div>
            </div>
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="w-4 h-4" /> Cetak
            </Button>
          </CardContent>
        </Card>

        {/* Print-only header */}
        <div className="hidden print:block">
          <h1 className="text-xl font-bold">Smart HRMS — Laporan</h1>
          <p className="text-xs">
            Dicetak: {format(new Date(), 'PPP p', { locale: idLocale })}
            {from ? ` · Dari ${format(from, 'PPP', { locale: idLocale })}` : ''}
            {to ? ` · Sampai ${format(to, 'PPP', { locale: idLocale })}` : ''}
          </p>
        </div>
      </div>
    </PageTransition>
  );
}

function ReportCard({
  icon: Icon,
  title,
  description,
  loading,
  onExport,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  loading: boolean;
  onExport: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button onClick={onExport} disabled={loading} className="w-full gap-2">
          <Download className="w-4 h-4" />
          {loading ? 'Menyiapkan...' : 'Unduh XLSX'}
        </Button>
      </CardContent>
    </Card>
  );
}

async function loadRows(kind: ReportKind) {
  if (kind === 'attendance') {
    return await listAttendanceForHRD({});
  }
  if (kind === 'leave') {
    return await listAllLeaves();
  }
  return await listAllOvertimes();
}

function buildSheet(kind: ReportKind, rows: any[]) {
  if (kind === 'attendance') {
    const data = rows.map((r) => ({
      Tanggal: r.date,
      Nama: r.profiles?.full_name ?? '',
      NIP: r.profiles?.nip ?? '',
      Departemen: r.profiles?.department ?? '',
      'Jam Masuk': r.check_in ? format(new Date(r.check_in), 'HH:mm') : '',
      'Jam Keluar': r.check_out ? format(new Date(r.check_out), 'HH:mm') : '',
      Status: r.status,
    }));
    return XLSX.utils.json_to_sheet(data);
  }
  if (kind === 'leave') {
    const data = rows.map((r) => ({
      'Tgl Pengajuan': r.created_at ? format(new Date(r.created_at), 'yyyy-MM-dd') : '',
      Nama: r.profiles?.full_name ?? '',
      Departemen: r.profiles?.department ?? '',
      Jenis: r.type,
      Mulai: r.start_date,
      Selesai: r.end_date,
      Alasan: r.reason,
      Status: r.status,
    }));
    return XLSX.utils.json_to_sheet(data);
  }
  const data = rows.map((r) => ({
    Tanggal: r.date,
    Nama: r.profiles?.full_name ?? '',
    Departemen: r.profiles?.department ?? '',
    'Jam Mulai': r.start_time,
    'Jam Selesai': r.end_time,
    'Total Jam': r.total_hours,
    Alasan: r.reason,
    Status: r.status,
  }));
  return XLSX.utils.json_to_sheet(data);
}
