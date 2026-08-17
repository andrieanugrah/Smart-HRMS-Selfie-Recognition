'use client';

import { Printer, ArrowLeft, CheckCircle, Building2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Logo } from '@/components/shared/logo';
import type { Payroll } from 'shared';

interface PayslipDocumentViewProps {
  payroll: Payroll;
  onBack: () => void;
}

export function PayslipDocumentView({ payroll, onBack }: PayslipDocumentViewProps) {
  function handlePrint() {
    window.print();
  }

  const profile = payroll.profiles;
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const monthLabel = monthNames[payroll.month - 1] || `Bulan ${payroll.month}`;

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-payslip, #printable-payslip * {
            visibility: visible;
          }
          #printable-payslip {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 24px;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Top Action Bar (No Print) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-card border border-border no-print shadow-xs">
        <Button variant="outline" size="sm" onClick={onBack} className="gap-2 w-full sm:w-auto">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Slip Gaji
        </Button>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handlePrint} className="gap-2 w-full sm:w-auto justify-center">
            <Printer className="w-4 h-4" /> Cetak / Download PDF
          </Button>
        </div>
      </div>

      {/* Full Document Card Container */}
      <Card id="printable-payslip" className="p-4 sm:p-10 space-y-6 sm:space-y-8 bg-card border border-border/80 shadow-elev-md">
        {/* Company & Header Section (1:1 Print Header Layout) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-border pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <Logo size="lg" />
            <div className="hidden sm:block w-px h-12 bg-border" />
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p className="font-bold text-foreground text-sm">PT Smart Solusi Teknologi</p>
              <p>Jl. Teknologi No. 88, Bandung 40111</p>
              <p>(022) 1234 5678 &nbsp;|&nbsp; www.smarthrms.co.id</p>
            </div>
          </div>

          <div className="sm:text-right">
            <span className="inline-block text-[11px] uppercase tracking-widest px-3 py-1 rounded-full bg-[#10B981]/15 text-[#10B981] font-bold border border-[#10B981]/25">
              SLIP GAJI RESMI
            </span>
            <p className="text-sm font-bold text-foreground mt-1.5">
              PERIODE {monthLabel.toUpperCase()} {payroll.year}
            </p>
          </div>
        </div>

        {/* Employee Metadata */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-muted/40 border border-border/60 text-xs">
          <div>
            <span className="text-muted-foreground block text-[11px] uppercase tracking-wider">Nama Karyawan</span>
            <span className="font-bold text-sm text-foreground mt-0.5 block">{profile?.full_name || 'Karyawan'}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px] uppercase tracking-wider">NIP</span>
            <span className="font-semibold text-sm text-foreground mt-0.5 block">{profile?.nip || '-'}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px] uppercase tracking-wider">Departemen</span>
            <span className="font-semibold text-sm text-foreground mt-0.5 block">{profile?.department || 'Umum'}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px] uppercase tracking-wider">Jabatan</span>
            <span className="font-semibold text-sm text-foreground mt-0.5 block">{profile?.position || 'Staff'}</span>
          </div>
        </div>

        {/* Itemized Table Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Earnings */}
          <div className="p-4 rounded-2xl border border-success/20 bg-success/5 space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-success border-b border-success/20 pb-2">
              PENERIMAAN (EARNINGS)
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Gaji Pokok</span>
                <span className="font-semibold text-foreground">
                  Rp {Number(payroll.base_salary).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Tunjangan Tetap</span>
                <span className="font-semibold text-foreground">
                  Rp {Number(payroll.allowance).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Bonus Lembur</span>
                <span className="font-bold text-success">
                  + Rp {Number(payroll.overtime_pay).toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>

          {/* Deductions */}
          <div className="p-4 rounded-2xl border border-destructive/20 bg-destructive/5 space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-destructive border-b border-destructive/20 pb-2">
              POTONGAN (DEDUCTIONS)
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Potongan Terlambat</span>
                <span className="font-bold text-destructive">
                  - Rp {Number(payroll.late_deduction).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Potongan Absen</span>
                <span className="font-bold text-destructive">
                  - Rp {Number(payroll.absence_deduction).toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Total Net Salary Box */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-primary/15 via-primary/10 to-accent/15 border border-primary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-widest text-primary">
              TOTAL GAJI BERSIH (TAKE HOME PAY)
            </span>
            <p className="text-xs text-muted-foreground mt-1">
              Dana telah disetorkan langsung ke rekening terdaftar karyawan.
            </p>
          </div>
          <span className="text-3xl font-extrabold text-primary tracking-tight">
            Rp {Number(payroll.net_salary).toLocaleString('id-ID')}
          </span>
        </div>

        {/* Official Digital Signature Footer */}
        <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 text-success font-medium">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Dokumen ini disahkan secara sah dan digital oleh Smart HRMS System</span>
          </div>
          <div>
            Tanggal Terbit: {new Date(payroll.generated_at).toLocaleDateString('id-ID')}
          </div>
        </div>
      </Card>
    </div>
  );
}
