'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  requireUser,
  requireRole,
  getSupabase,
  ok,
  fail,
  handleError,
  type ActionResult,
} from './_utils';
import { emitToHRD, emitToUser } from './_events';
import { logAudit } from './_audit';

const createOvertimeSchema = z
  .object({
    date: z.string().min(1),
    start_time: z.string().regex(/^\d{2}:\d{2}$/),
    end_time: z.string().regex(/^\d{2}:\d{2}$/),
    reason: z.string().min(3).max(500),
  })
  .refine((d) => d.end_time > d.start_time, {
    message: 'Jam selesai harus setelah jam mulai',
    path: ['end_time'],
  });

function computeHours(start: string, end: string): number {
  const [sH, sM] = start.split(':').map(Number);
  const [eH, eM] = end.split(':').map(Number);
  const minutes = eH * 60 + eM - (sH * 60 + sM);
  return Math.round((minutes / 60) * 100) / 100;
}

export async function listMyOvertimes() {
  const user = await requireUser();
  const supabase = await getSupabase();
  const { data } = await supabase
    .from('overtimes')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .order('start_time', { ascending: false });
  return data ?? [];
}

export async function listAllOvertimes(status?: string, from?: string, to?: string) {
  await requireRole(['hrd', 'admin']);
  const supabase = await getSupabase();
  let q = supabase
    .from('overtimes')
    .select('*, profiles:overtimes_user_id_fkey!inner(full_name, nip, department)')
    .order('date', { ascending: false });
  if (status && status !== 'all') q = q.eq('status', status);
  if (from) q = q.gte('date', from);
  if (to) q = q.lte('date', to);
  const { data } = await q;
  return (data as any[]) ?? [];
}

export async function listPendingOvertimesForHRD() {
  await requireRole(['hrd', 'admin']);
  const supabase = await getSupabase();
  const { data } = await supabase
    .from('overtimes')
    .select('*, profiles:overtimes_user_id_fkey!inner(full_name, nip)')
    .eq('status', 'pending')
    .order('date', { ascending: false })
    .limit(5);
  return (data as any[]) ?? [];
}

export async function createOvertime(
  input: z.infer<typeof createOvertimeSchema>
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const data = createOvertimeSchema.parse(input);
    const supabase = await getSupabase();

    const total_hours = computeHours(data.start_time, data.end_time);

    const { data: created, error } = await supabase
      .from('overtimes')
      .insert({
        user_id: user.id,
        date: data.date,
        start_time: data.start_time,
        end_time: data.end_time,
        total_hours,
        reason: data.reason,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) return fail(error.message);

    emitToHRD('overtime:new', { id: created.id, user_name: user.name });

    void logAudit({
      actor_id: user.id,
      actor_email: user.email,
      actor_role: user.role,
      action: 'create',
      resource_type: 'overtime',
      resource_id: created.id,
      details: { date: data.date, start_time: data.start_time, end_time: data.end_time, total_hours },
    });

    revalidatePath('/[portal]/overtime', 'page');
    revalidatePath('/[portal]/dashboard', 'page');
    return ok({ id: created.id });
  } catch (e) {
    return handleError(e);
  }
}

export async function approveOvertime(id: string): Promise<ActionResult> {
  try {
    const admin = await requireRole(['hrd', 'admin']);
    const supabase = await getSupabase();

    const { data: ot } = await supabase
      .from('overtimes')
      .select('user_id')
      .eq('id', id)
      .single();
    if (!ot) return fail('Pengajuan tidak ditemukan');

    const { data: updated, error } = await supabase
      .from('overtimes')
      .update({
        status: 'approved',
        approved_by: admin.id,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle();

    if (error) return fail(error.message);
    if (!updated) return fail('Pengajuan sudah diproses oleh pengguna lain');

    await supabase.from('notifications').insert({
      user_id: ot.user_id,
      title: 'Lembur Disetujui',
      message: 'Pengajuan lembur Anda telah disetujui.',
      type: 'approval',
      reference_id: id,
      reference_type: 'overtime',
    });

    emitToUser(ot.user_id, 'overtime:approved', { id });
    emitToHRD('overtime:updated', { id });

    void logAudit({
      actor_id: admin.id,
      actor_email: admin.email,
      actor_role: admin.role,
      action: 'approve',
      resource_type: 'overtime',
      resource_id: id,
      details: { employee_id: ot.user_id },
    });

    revalidatePath('/[portal]/overtime', 'page');
    return ok({ id });
  } catch (e) {
    return handleError(e);
  }
}

export async function rejectOvertime(
  id: string,
  payload: { rejection_reason: string }
): Promise<ActionResult> {
  try {
    const admin = await requireRole(['hrd', 'admin']);
    if (!payload?.rejection_reason || payload.rejection_reason.length < 3) {
      return fail('Alasan penolakan minimal 3 karakter');
    }
    const supabase = await getSupabase();

    const { data: ot } = await supabase
      .from('overtimes')
      .select('user_id')
      .eq('id', id)
      .single();
    if (!ot) return fail('Pengajuan tidak ditemukan');

    const { data: updated, error } = await supabase
      .from('overtimes')
      .update({
        status: 'rejected',
        approved_by: admin.id,
        approved_at: new Date().toISOString(),
        rejection_reason: payload.rejection_reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle();

    if (error) return fail(error.message);
    if (!updated) return fail('Pengajuan sudah diproses oleh pengguna lain');

    await supabase.from('notifications').insert({
      user_id: ot.user_id,
      title: 'Lembur Ditolak',
      message: `Pengajuan lembur ditolak: ${payload.rejection_reason}`,
      type: 'rejection',
      reference_id: id,
      reference_type: 'overtime',
    });

    emitToUser(ot.user_id, 'overtime:rejected', { id });
    emitToHRD('overtime:updated', { id });

    void logAudit({
      actor_id: admin.id,
      actor_email: admin.email,
      actor_role: admin.role,
      action: 'reject',
      resource_type: 'overtime',
      resource_id: id,
      details: { employee_id: ot.user_id, rejection_reason: payload.rejection_reason },
    });

    revalidatePath('/[portal]/overtime', 'page');
    return ok({ id });
  } catch (e) {
    return handleError(e);
  }
}
