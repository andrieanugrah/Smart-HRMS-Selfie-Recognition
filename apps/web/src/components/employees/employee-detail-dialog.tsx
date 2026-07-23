'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { User, Mail, Phone, Building2, Briefcase, CalendarDays, Scan } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { formatDate } from '@/lib/utils';
import { deleteEmployeeFace } from '@/app/actions/face';

interface EmployeeDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: any;
  onChanged?: () => void;
}

export function EmployeeDetailDialog({
  open,
  onOpenChange,
  employee,
  onChanged,
}: EmployeeDetailDialogProps) {
  const [confirmFace, setConfirmFace] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!employee) return null;

  const items = [
    { icon: Mail, label: 'Email', value: employee.email },
    { icon: Phone, label: 'Telepon', value: employee.phone ?? '-' },
    { icon: Building2, label: 'Departemen', value: employee.department ?? '-' },
    { icon: Briefcase, label: 'Posisi', value: employee.position ?? '-' },
    {
      icon: CalendarDays,
      label: 'Bergabung',
      value: employee.created_at ? formatDate(employee.created_at) : '-',
    },
  ];

  async function handleDeleteFace() {
    setBusy(true);
    const res = await deleteEmployeeFace(employee.id);
    setBusy(false);
    if (res.ok) {
      toast.success('Data wajah dihapus');
      onChanged?.();
    } else {
      toast.error(res.error);
    }
    setConfirmFace(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Avatar name={employee.full_name} size="lg" src={employee.avatar_url} />
            <div>
              <DialogTitle>{employee.full_name}</DialogTitle>
              <DialogDescription>
                {employee.nip ?? '-'} •{' '}
                <span className="capitalize">{employee.role}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={employee.is_active ? 'success' : 'secondary'}>
            {employee.is_active ? 'Aktif' : 'Nonaktif'}
          </Badge>
          <Badge variant="outline">Kuota cuti: {employee.leave_quota ?? 12} hari</Badge>
        </div>

        <div className="space-y-2">
          {items.map((it) => (
            <Card key={it.label}>
              <CardContent className="py-3 flex items-center gap-3">
                <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                  <it.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{it.label}</p>
                  <p className="font-medium text-sm">{it.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <DialogFooter className="!justify-between">
          <Button
            variant="outline"
            onClick={() => setConfirmFace(true)}
            className="gap-2 text-danger hover:bg-danger/10"
            disabled={busy}
          >
            <Scan className="w-4 h-4" /> Hapus Data Wajah
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Tutup</Button>
        </DialogFooter>

        <ConfirmDialog
          open={confirmFace}
          onOpenChange={setConfirmFace}
          title="Hapus data wajah karyawan?"
          description={`${employee.full_name} harus mendaftarkan ulang wajah untuk dapat absen.`}
          confirmLabel="Hapus"
          destructive
          onConfirm={handleDeleteFace}
        />
      </DialogContent>
    </Dialog>
  );
}
