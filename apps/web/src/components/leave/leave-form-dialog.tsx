'use client';

import { useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, FileText, Loader2 } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-picker';
import { Textarea } from '@/components/ui/textarea';
import { createLeave } from '@/app/actions/leave';
import { getLeaveTypeLabel } from '@/lib/utils';

interface LeaveFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const LEAVE_TYPES = [
  { value: 'annual', label: 'Cuti Tahunan' },
  { value: 'sick', label: 'Sakit' },
  { value: 'personal', label: 'Cuti Pribadi' },
  { value: 'maternity', label: 'Cuti Melahirkan' },
  { value: 'other', label: 'Lainnya' },
];

export function LeaveFormDialog({ open, onOpenChange, onSuccess }: LeaveFormDialogProps) {
  const [type, setType] = useState<string>('annual');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [reason, setReason] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  function reset() {
    setType('annual');
    setStartDate(undefined);
    setEndDate(undefined);
    setReason('');
    setAttachment(null);
    setAttachmentPreview(null);
    setError('');
  }

  function handleOpenChange(open: boolean) {
    if (!open) reset();
    onOpenChange(open);
  }

  function handleAttachmentChange(file: File | null) {
    if (!file) {
      setAttachment(null);
      setAttachmentPreview(null);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran lampiran maksimal 5MB');
      return;
    }
    setAttachment(file);
    const reader = new FileReader();
    reader.onload = () => setAttachmentPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!startDate || !endDate) {
      setError('Pilih tanggal mulai dan selesai');
      return;
    }
    if (reason.trim().length < 3) {
      setError('Alasan minimal 3 karakter');
      return;
    }

    const payload = {
      type: type as 'annual' | 'sick' | 'personal' | 'maternity' | 'other',
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      reason: reason.trim(),
      attachment_url: attachmentPreview,
    };

    startTransition(async () => {
      const res = await createLeave(payload);
      if (res.ok) {
        toast.success(`${getLeaveTypeLabel(type)} berhasil diajukan`);
        handleOpenChange(false);
        onSuccess?.();
      } else {
        setError(res.error);
        toast.error(res.error);
      }
    });
  }

  const days =
    startDate && endDate
      ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
      : 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Ajukan Cuti / Izin</DialogTitle>
              <DialogDescription>
                Pengajuan akan dikirim ke HRD untuk ditinjau.
              </DialogDescription>
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
            <Field label="Jenis" required>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAVE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Periode" required>
              <DateRangePicker
                startValue={startDate}
                endValue={endDate}
                onStartChange={setStartDate}
                onEndChange={setEndDate}
              />
              {days > 0 && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  Total <span className="font-semibold text-foreground">{days} hari</span>
                </p>
              )}
            </Field>

            <Field label="Alasan" required>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Jelaskan alasan pengajuan cuti/izin Anda..."
                rows={4}
              />
            </Field>

            <Field label="Lampiran (opsional)">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => handleAttachmentChange(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              />
              {attachmentPreview && attachment?.type.startsWith('image/') && (
                <img
                  src={attachmentPreview}
                  alt="Preview lampiran"
                  className="mt-2 max-h-32 rounded-lg border border-border object-cover"
                />
              )}
              {attachment && !attachment.type.startsWith('image/') && (
                <p className="mt-2 text-xs text-muted-foreground">{attachment.name}</p>
              )}
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
              {pending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              {pending ? 'Mengirim...' : 'Kirim Pengajuan'}
            </Button>
          </DialogFooter>
        </motion.form>
      </DialogContent>
    </Dialog>
  );
}
