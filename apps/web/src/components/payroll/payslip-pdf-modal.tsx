'use client';

import { Printer, Download, CheckCircle, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LogoMark } from '@/components/shared/logo';
import type { Payroll } from 'shared';

interface PayslipPdfModalProps {
  payroll: Payroll;
  onClose: () => void;
}

export function PayslipPdfModal({ payroll, onClose }: PayslipPdfModalProps) {
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
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
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
            padding: 20px;
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

      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-elev-lg overflow-hidden my-auto">
        {/* Top Control Bar */}
        <div className="p-4 bg-muted/40 border-b border-border flex items-center justify-between no-print shrink-0">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            <span className="font-bold text-sm">Preview Slip Gaji Digital</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="default" onClick={handlePrint} className="gap-1.5">
              <Printer className="w-4 h-4" /> Cetak / Download PDF
            </Button>
            <Button size="sm" variant="outline" onClick={onClose}>
              Tutup
            </Button>
          </div>
        </div>

        {/* Printable Payslip Body */}
        <div id="printable-payslip" className="p-6 sm:p-8 space-y-6 text-foreground bg-card overflow-y-auto flex-1">
          {/* Company & Document Header */}
          <div className="flex items-start justify-between border-b border-border pb-6">
            <div>
              <div className="flex items-center gap-2">
                <LogoMark size={26} />
                <h1 className="text-xl font-bold tracking-tight">PT SMART HRMS INDONESIA</h1>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Gedung Utama Lt. 5, Jl. Jend. Sudirman No. 88, Jakarta Selatan
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs uppercase tracking-widest px-2.5 py-1 rounded-full bg-primary/10 text-primary font-bold">
                SLIP GAJI
              </span>
              <p className="text-sm font-semibold mt-2">{monthLabel} {payroll.year}</p>
            </div>
          </div>

          {/* Employee Meta Grid */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-muted/30 border border-border/60 text-xs">
            <div>
              <span className="text-muted-foreground block">Nama Karyawan</span>
              <span className="font-semibold text-sm">{profile?.full_name || 'Karyawan'}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">NIP</span>
              <span className="font-semibold text-sm">{profile?.nip || '-'}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Departemen</span>
              <span className="font-semibold text-sm">{profile?.department || 'Umum'}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Jabatan</span>
              <span className="font-semibold text-sm">{profile?.position || 'Staff'}</span>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-6">
              {/* Earnings */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-success border-b pb-1">
                  Penerimaan (Earnings)
                </h3>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gaji Pokok</span>
                    <span className="font-medium">Rp {Number(payroll.base_salary).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tunjangan Tetap</span>
                    <span className="font-medium">Rp {Number(payroll.allowance).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bonus Lembur</span>
                    <span className="font-medium text-success">+ Rp {Number(payroll.overtime_pay).toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-destructive border-b pb-1">
                  Potongan (Deductions)
                </h3>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Potongan Terlambat</span>
                    <span className="font-medium text-destructive">- Rp {Number(payroll.late_deduction).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Potongan Absen</span>
                    <span className="font-medium text-destructive">- Rp {Number(payroll.absence_deduction).toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Total THP / Net Salary Box */}
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between mt-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-primary">
                  TOTAL GAJI BERSIH (TAKE HOME PAY)
                </span>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Telah ditransfer ke rekening terdaftar
                </p>
              </div>
              <span className="text-2xl font-extrabold text-primary">
                Rp {Number(payroll.net_salary).toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          {/* Footer & Digital Authentication */}
          <div className="pt-6 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5 text-success">
              <CheckCircle className="w-4 h-4" />
              <span>Dokumen ini disahkan secara digital oleh Smart HRMS System</span>
            </div>
            <div>
              Tanggal Terbit: {new Date(payroll.generated_at).toLocaleDateString('id-ID')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
