'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  requireRole,
  getSupabase,
  getSupabaseAdmin,
  ok,
  fail,
  handleError,
  type ActionResult,
} from './_utils';
import { ROLES } from 'shared';

const employeeSchema = z.object({
  full_name: z.string().min(2).max(120),
  email: z.string().email(),
  nip: z.string().max(30).optional().nullable(),
  department: z.string().max(80).optional().nullable(),
  position: z.string().max(80).optional().nullable(),
  role: z.enum(ROLES),
  leave_quota: z.number().int().min(0).max(365).optional().default(12),
  phone: z.string().max(20).optional().nullable(),
  password: z.string().min(6).max(72).optional(),
});

const updateEmployeeSchema = employeeSchema.partial().extend({
  is_active: z.boolean().optional(),
});

export async function listEmployees(
  opts: { search?: string; department?: string; role?: string; is_active?: boolean } = {}
) {
  await requireRole(['hrd', 'admin']);
  const supabase = await getSupabase();
  let q = supabase
    .from('profiles')
    .select('id, email, full_name, nip, role, department, position, phone, avatar_url, leave_quota, is_active, created_at')
    .order('full_name', { ascending: true });
  if (opts.department) q = q.eq('department', opts.department);
  if (opts.role) q = q.eq('role', opts.role);
  if (typeof opts.is_active === 'boolean') q = q.eq('is_active', opts.is_active);
  const { data } = await q;
  let rows = (data as any[]) ?? [];
  if (opts.search) {
    const s = opts.search.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.full_name?.toLowerCase().includes(s) ||
        r.nip?.toLowerCase().includes(s) ||
        r.department?.toLowerCase().includes(s) ||
        r.email?.toLowerCase().includes(s)
    );
  }
  return rows;
}

export async function getEmployee(id: string) {
  await requireRole(['hrd', 'admin']);
  const supabase = await getSupabase();
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return data;
}

function generateTempPassword(): string {
  return `HRMS-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36).slice(-4)}`;
}

export async function createEmployee(
  input: z.infer<typeof employeeSchema>
): Promise<ActionResult<{ id: string; tempPassword?: string }>> {
  try {
    await requireRole(['hrd', 'admin']);
    const data = employeeSchema.parse(input);
    const admin = getSupabaseAdmin();

    const tempPassword = data.password ?? generateTempPassword();

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: data.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
      app_metadata: { role: data.role },
    });
    if (authError || !authData.user) {
      return fail(authError?.message ?? 'Gagal membuat akun autentikasi');
    }
    const userId = authData.user.id;

    const { data: created, error: profileError } = await admin
      .from('profiles')
      .insert({
        id: userId,
        email: data.email,
        full_name: data.full_name,
        nip: data.nip ?? null,
        department: data.department ?? null,
        position: data.position ?? null,
        phone: data.phone ?? null,
        role: data.role,
        leave_quota: data.leave_quota ?? 12,
        is_active: true,
      })
      .select('id')
      .single();

    if (profileError) {
      // Rollback the auth user so we don't leave orphans behind
      await admin.auth.admin.deleteUser(userId).catch(() => undefined);
      return fail(profileError.message);
    }

    revalidatePath('/[portal]/employees', 'page');
    return ok({ id: created.id, tempPassword: data.password ? undefined : tempPassword });
  } catch (e) {
    return handleError(e);
  }
}

export async function updateEmployee(
  id: string,
  input: z.infer<typeof updateEmployeeSchema>
): Promise<ActionResult> {
  try {
    await requireRole(['hrd', 'admin']);
    const data = updateEmployeeSchema.parse(input);
    const supabase = await getSupabase();
    const admin = getSupabaseAdmin();

    const { error } = await supabase
      .from('profiles')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return fail(error.message);

    if (data.email || data.password || data.role) {
      const updates: { email?: string; password?: string; app_metadata?: { role: string } } = {};
      if (data.email) updates.email = data.email;
      if (data.password) updates.password = data.password;
      if (data.role) updates.app_metadata = { role: data.role };
      const { error: authError } = await admin.auth.admin.updateUserById(id, updates);
      if (authError) return fail(authError.message);
    }

    revalidatePath('/[portal]/employees', 'page');
    return ok({ id });
  } catch (e) {
    return handleError(e);
  }
}

export async function deleteEmployee(id: string): Promise<ActionResult> {
  try {
    const me = await requireRole(['hrd', 'admin']);
    if (id === me.id) return fail('Tidak dapat menghapus akun sendiri');
    const supabase = await getSupabase();
    const { error } = await supabase.from('profiles').update({ is_active: false }).eq('id', id);
    if (error) return fail(error.message);
    revalidatePath('/[portal]/employees', 'page');
    return ok({ id });
  } catch (e) {
    return handleError(e);
  }
}
