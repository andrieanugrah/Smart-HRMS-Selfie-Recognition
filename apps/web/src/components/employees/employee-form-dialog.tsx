'use client';

import { useState, useTransition, useEffect } from 'react';
import { UserPlus, Loader2, Pencil } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createEmployee, updateEmployee } from '@/app/actions/employees';

interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: any;
  onSuccess?: () => void;
}

export function EmployeeFormDialog({
  open,
  onOpenChange,
  employee,
  onSuccess,
}: EmployeeFormDialogProps) {
  const isEdit = !!employee;
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    nip: '',
    department: '',
    position: '',
    phone: '',
    role: 'employee' as 'employee' | 'hrd' | 'admin',
    leave_quota: 12,
    annual_leave_quota: 12,
    password: '',
  });
  const [error, setError] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (employee) {
      setForm({
        full_name: employee.full_name ?? '',
        email: employee.email ?? '',
        nip: employee.nip ?? '',
        department: employee.department ?? '',
        position: employee.position ?? '',
        phone: employee.phone ?? '',
        role: employee.role ?? 'employee',
        leave_quota: employee.leave_quota ?? 12,
        annual_leave_quota: employee.annual_leave_quota ?? 12,
        password: '',
      });
    } else {
      setForm({
        full_name: '',
        email: '',
        nip: '',
        department: '',
        position: '',
        phone: '',
        role: 'employee',
        leave_quota: 12,
        annual_leave_quota: 12,
        password: '',
      });
    }
    setError('');
    setTempPassword('');
  }, [employee, open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (form.full_name.trim().length < 2) return setError('Nama minimal 2 karakter');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setError('Email tidak valid');

    startTransition(async () => {
      const res = isEdit
        ? await updateEmployee(employee.id, form)
        : await createEmployee(form);
      if (res.ok) {
        const generated = !isEdit ? (res.data as { tempPassword?: string })?.tempPassword : undefined;
        if (generated) {
          setTempPassword(generated);
          toast.success('Karyawan ditambahkan. Catat password sementara.');
        } else {
          toast.success(isEdit ? 'Karyawan diperbarui' : 'Karyawan ditambahkan');
          onOpenChange(false);
        }
        onSuccess?.();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              {isEdit ? (
                <Pencil className="w-5 h-5 text-primary" />
              ) : (
                <UserPlus className="w-5 h-5 text-primary" />
              )}
            </div>
            <div>
              <DialogTitle>{isEdit ? 'Edit Karyawan' : 'Tambah Karyawan'}</DialogTitle>
              <DialogDescription>
                {isEdit
                  ? 'Perbarui data karyawan'
                  : 'Lengkapi data untuk menambahkan karyawan baru'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <FormSection title="Informasi Pribadi">
            <Field label="Nama Lengkap" required>
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="Contoh: Budi Santoso"
              />
            </Field>
            <Field label="Email" required>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@company.com"
              />
            </Field>
            <Field label="Telepon">
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="08xxxxxxxxxx"
              />
            </Field>
          </FormSection>

          <FormSection title="Informasi Pekerjaan">
            <div className="grid grid-cols-2 gap-3">
              <Field label="NIP">
                <Input
                  value={form.nip}
                  onChange={(e) => setForm({ ...form, nip: e.target.value })}
                  placeholder="EMP-001"
                />
              </Field>
              <Field label="Role" required>
                <Select
                  value={form.role}
                  onValueChange={(v: any) => setForm({ ...form, role: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="hrd">HRD</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Departemen">
                <Input
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  placeholder="IT, HRD, Finance, ..."
                />
              </Field>
              <Field label="Posisi / Jabatan">
                <Input
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                  placeholder="Programmer, Staff, ..."
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Kuota Cuti (legacy)">
                <Input
                  type="number"
                  min={0}
                  max={365}
                  value={form.leave_quota}
                  onChange={(e) =>
                    setForm({ ...form, leave_quota: Number(e.target.value) || 0 })
                  }
                />
              </Field>
              <Field label="Kuota Cuti Tahunan">
                <Input
                  type="number"
                  min={0}
                  max={365}
                  value={form.annual_leave_quota}
                  onChange={(e) =>
                    setForm({ ...form, annual_leave_quota: Number(e.target.value) || 0 })
                  }
                />
              </Field>
            </div>
          </FormSection>

          {!isEdit && (
            <FormSection
              title="Akun Login"
              description="Minimal 6 karakter. Kosongkan untuk membuat password sementara otomatis."
            >
              <Field label="Password sementara">
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Minimal 6 karakter"
                  autoComplete="new-password"
                />
              </Field>
            </FormSection>
          )}

          {tempPassword && (
            <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 space-y-1">
              <p className="text-sm font-semibold text-warning">Password sementara</p>
              <p className="font-mono text-base text-foreground break-all">{tempPassword}</p>
              <p className="text-xs text-muted-foreground">Berikan ke karyawan. Minta segera diganti setelah login pertama.</p>
              <div className="pt-2">
                <Button type="button" size="sm" onClick={() => onOpenChange(false)}>
                  Saya sudah mencatat
                </Button>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-danger/10 border border-danger/20 px-4 py-3">
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Batal
            </Button>
            <Button type="submit" disabled={pending} className="gap-2">
              {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {pending ? 'Menyimpan...' : isEdit ? 'Simpan' : 'Tambah'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
