'use client';

import { useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import { Clock, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field, FormSection } from '@/components/ui/form';
import { DatePicker } from '@/components/ui/date-picker';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { createOvertime } from '@/app/actions/overtime';

interface OvertimeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

function computeHours(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sH, sM] = start.split(':').map(Number);
  const [eH, eM] = end.split(':').map(Number);
  const minutes = eH * 60 + eM - (sH * 60 + sM);
  return minutes > 0 ? Math.round((minutes / 60) * 100) / 100 : 0;
}

export function OvertimeFormDialog({ open, onOpenChange, onSuccess }: OvertimeFormDialogProps) {
  const [date, setDate] = useState<Date>();
  const [startTime, setStartTime] = useState('17:00');
  const [endTime, setEndTime] = useState('20:00');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  function reset() {
    setDate(undefined);
    setStartTime('17:00');
    setEndTime('20:00');
    setReason('');
    setError('');
  }

  function handleOpenChange(open: boolean) {
    if (!open) reset();
    onOpenChange(open);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!date) {
      setError('Pilih tanggal lembur');
      return;
    }
    if (endTime <= startTime) {
      setError('Jam selesai harus setelah jam mulai');
      return;
    }
    if (reason.trim().length < 3) {
      setError('Alasan minimal 3 karakter');
      return;
    }

    startTransition(async () => {
      const res = await createOvertime({
        date: date.toISOString().split('T')[0],
        start_time: startTime,
        end_time: endTime,
        reason: reason.trim(),
      });
      if (res.ok) {
        toast.success('Lembur berhasil diajukan');
        handleOpenChange(false);
        onSuccess?.();
      } else {
        setError(res.error);
        toast.error(res.error);
      }
    });
  }

  const totalHours = computeHours(startTime, endTime);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-warning" />
            </div>
            <div>
              <DialogTitle>Ajukan Lembur</DialogTitle>
              <DialogDescription>Pengajuan akan direview HRD.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-5"
        >
          <FormSection>
            <Field label="Tanggal" required>
              <DatePicker
                value={date}
                onChange={setDate}
                placeholder="Pilih tanggal"
                toDate={new Date()}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Jam Mulai" required>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </Field>
              <Field label="Jam Selesai" required>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </Field>
            </div>

            {totalHours > 0 && (
              <div className="p-3 rounded-xl bg-warning/10 border border-warning/20">
                <p className="text-sm">
                  <span className="text-muted-foreground">Total durasi: </span>
                  <span className="font-semibold text-warning-foreground">
                    {totalHours} jam
                  </span>
                </p>
              </div>
            )}

            <Field label="Alasan / Pekerjaan" required>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Jelaskan pekerjaan yang dilakukan saat lembur..."
                rows={4}
              />
            </Field>

            {error && (
              <div className="rounded-xl bg-danger/10 border border-danger/20 px-4 py-3">
                <p className="text-sm text-danger">{error}</p>
              </div>
            )}
          </FormSection>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={pending}
            >
              Batal
            </Button>
            <Button type="submit" disabled={pending} className="gap-2">
              {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              {pending ? 'Mengirim...' : 'Kirim Pengajuan'}
            </Button>
          </DialogFooter>
        </motion.form>
      </DialogContent>
    </Dialog>
  );
}
