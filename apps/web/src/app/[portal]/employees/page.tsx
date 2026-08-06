'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, UserPlus, MoreHorizontal, Eye, Pencil, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageTransition } from '@/components/shared/page-transition';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { listEmployees, deleteEmployee } from '@/app/actions/employees';
import { EmployeeFormDialog } from '@/components/employees/employee-form-dialog';
import { EmployeeDetailDialog } from '@/components/employees/employee-detail-dialog';

const STATUS_ALL = 'all';
const STATUS_ACTIVE = 'active';
const STATUS_INACTIVE = 'inactive';

export default function EmployeesPage() {
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState<string>('');
  const [role, setRole] = useState<string>('');
  const [status, setStatus] = useState<string>(STATUS_ALL);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [viewTarget, setViewTarget] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await listEmployees({
      search,
      department: department || undefined,
      role: role || undefined,
      is_active:
        status === STATUS_ACTIVE ? true : status === STATUS_INACTIVE ? false : undefined,
    });
    setData(result);
    setLoading(false);
  }, [search, department, role, status]);

  useEffect(() => {
    const timer = setTimeout(refresh, 250);
    return () => clearTimeout(timer);
  }, [refresh]);

  async function handleDelete() {
    if (!deleteTarget) return;
    const res = await deleteEmployee(deleteTarget.id);
    if (res.ok) {
      toast.success('Karyawan dinonaktifkan');
      refresh();
    } else {
      toast.error(res.error);
    }
    setDeleteTarget(null);
  }

  const departments = Array.from(
    new Set(data.map((d) => d.department).filter(Boolean) as string[])
  ).sort();

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Karyawan</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {data.length} karyawan terdaftar
            </p>
          </div>
          <Button onClick={() => { setEditTarget(null); setFormOpen(true); }} className="gap-2">
            <UserPlus className="w-4 h-4" /> Tambah Karyawan
          </Button>
        </div>

        {/* Search + Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, NIP, departemen, email..."
              className="pl-11"
            />
          </div>
          <Select value={department || 'all'} onValueChange={(v) => setDepartment(v === 'all' ? '' : v)}>
            <SelectTrigger aria-label="Filter departemen">
              <SelectValue placeholder="Semua departemen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua departemen</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={role || 'all'} onValueChange={(v) => setRole(v === 'all' ? '' : v)}>
            <SelectTrigger aria-label="Filter role">
              <SelectValue placeholder="Semua role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua role</SelectItem>
              <SelectItem value="employee">Employee</SelectItem>
              <SelectItem value="hrd">HRD</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger aria-label="Filter status aktif">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={STATUS_ALL}>Semua status</SelectItem>
              <SelectItem value={STATUS_ACTIVE}>Aktif</SelectItem>
              <SelectItem value={STATUS_INACTIVE}>Nonaktif</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <EmptyState
            icon={Users}
            title={search ? 'Karyawan tidak ditemukan' : 'Belum ada karyawan'}
            description={
              search ? 'Coba ubah kata kunci pencarian.' : 'Tambah karyawan pertama Anda.'
            }
            action={
              !search
                ? {
                    label: 'Tambah Karyawan',
                    onClick: () => { setEditTarget(null); setFormOpen(true); },
                  }
                : undefined
            }
          />
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Karyawan</TableHead>
                    <TableHead className="hidden sm:table-cell">NIP</TableHead>
                    <TableHead className="hidden md:table-cell">Departemen</TableHead>
                    <TableHead className="hidden lg:table-cell">Posisi</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={emp.full_name} size="sm" />
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{emp.full_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{emp.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-xs">
                        {emp.nip ?? '-'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {emp.department ?? '-'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {emp.position ?? '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant={emp.role === 'hrd' || emp.role === 'admin' ? 'default' : 'secondary'}
                            className="capitalize"
                          >
                            {emp.role}
                          </Badge>
                          {!emp.is_active && (
                            <Badge variant="danger" className="text-[10px]">
                              Nonaktif
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                              aria-label={`Aksi untuk ${emp.full_name}`}
                            >
                              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setViewTarget(emp)}>
                              <Eye className="w-4 h-4 mr-2" /> Lihat Detail
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => { setEditTarget(emp); setFormOpen(true); }}
                            >
                              <Pencil className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              destructive
                              onClick={() => setDeleteTarget(emp)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Hapus
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>

      <EmployeeFormDialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditTarget(null);
        }}
        employee={editTarget ?? undefined}
        onSuccess={refresh}
      />
      <EmployeeDetailDialog
        open={!!viewTarget}
        onOpenChange={(o) => !o && setViewTarget(null)}
        employee={viewTarget}
        onChanged={refresh}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Hapus karyawan?"
        description={
          deleteTarget
            ? `${deleteTarget.full_name} akan dinonaktifkan dan tidak bisa login sampai diaktifkan kembali.`
            : ''
        }
        confirmLabel="Hapus"
        destructive
        onConfirm={handleDelete}
      />
    </PageTransition>
  );
}
