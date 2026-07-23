'use client';

import { useState, useTransition } from 'react';
import { CheckCircle, XCircle, Loader2, AlertCircle, Calendar, FileText } from 'lucide-react';
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
import { Field } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/ui/status-badge';
import { Avatar } from '@/components/ui/avatar';
import { approveLeave, rejectLeave } from '@/app/actions/leave';
import { getLeaveTypeLabel, formatDate, formatDateTime } from '@/lib/utils';

interface LeaveDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: any;
  mode: 'view' | 'hrd';
  onAction?: () => void;
}

export function LeaveDetailDialog({
  open,
  onOpenChange,
  item,
  mode,
  onAction,
}: LeaveDetailDialogProps) {
  const [showReject, setShowReject] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  if (!item) return null;

  function handleApprove() {
    startTransition(async () => {
      const res = await approveLeave(item.id);
      if (res.ok) {
        toast.success('Pengajuan disetujui');
        onOpenChange(false);
        onAction?.();
      } else {
        toast.error(res.error);
      }
    });
  }

  function handleReject() {
    if (rejectionReason.trim().length < 3) {
      setError('Alasan penolakan minimal 3 karakter');
      return;
    }
    startTransition(async () => {
      const res = await rejectLeave(item.id, { rejection_reason: rejectionReason.trim() });
      if (res.ok) {
        toast.success('Pengajuan ditolak');
        setShowReject(false);
        setRejectionReason('');
        onOpenChange(false);
        onAction?.();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Detail Pengajuan</DialogTitle>
          <DialogDescription>
            {getLeaveTypeLabel(item.type)} •{' '}
            {formatDate(item.start_date)} — {formatDate(item.end_date)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {mode === 'hrd' && item.profiles && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
              <Avatar name={item.profiles.full_name} size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{item.profiles.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.profiles.nip} • {item.profiles.department ?? '-'}
                </p>
              </div>
              <StatusBadge status={item.status} />
            </div>
          )}

          {mode === 'view' && (
            <div className="flex items-center justify-end">
              <StatusBadge status={item.status} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-muted/30">
              <p className="text-xs text-muted-foreground">Mulai</p>
              <p className="font-medium text-sm mt-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                {formatDate(item.start_date)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30">
              <p className="text-xs text-muted-foreground">Selesai</p>
              <p className="font-medium text-sm mt-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                {formatDate(item.end_date)}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground">Alasan</p>
            </div>
            <p className="text-sm leading-relaxed">{item.reason}</p>
          </div>

          {item.rejection_reason && (
            <div className="rounded-xl bg-danger/10 border border-danger/20 p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-danger">Ditolak dengan alasan:</p>
                <p className="text-sm text-danger/80 mt-1">{item.rejection_reason}</p>
              </div>
            </div>
          )}

          {item.approved_at && (
            <p className="text-xs text-muted-foreground">
              Diputuskan: {formatDateTime(item.approved_at)}
            </p>
          )}

          {showReject && mode === 'hrd' && (
            <div className="space-y-2 border-t pt-4">
              <Field label="Alasan Penolakan" required>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => {
                    setRejectionReason(e.target.value);
                    setError('');
                  }}
                  placeholder="Jelaskan mengapa pengajuan ini ditolak..."
                  rows={3}
                />
              </Field>
              {error && <p className="text-xs text-danger">{error}</p>}
            </div>
          )}
        </div>

        {mode === 'hrd' && item.status === 'pending' && !showReject && (
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReject(true)} className="gap-2">
              <XCircle className="w-4 h-4" /> Tolak
            </Button>
            <Button onClick={handleApprove} disabled={pending} className="gap-2">
              {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Setujui
            </Button>
          </DialogFooter>
        )}

        {showReject && mode === 'hrd' && (
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReject(false)} disabled={pending}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={pending}
              className="gap-2"
            >
              {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              Konfirmasi Tolak
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
