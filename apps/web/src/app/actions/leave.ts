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
import { LEAVE_TYPES, calculateBusinessDays } from 'shared';
import { encryptImage, dataUrlToBuffer } from '@/lib/crypto/image-crypto';

const createLeaveSchema = z
  .object({
    type: z.enum(LEAVE_TYPES),
    start_date: z.string().min(1),
    end_date: z.string().min(1),
    reason: z.string().min(3, 'Alasan minimal 3 karakter').max(500),
    attachment_url: z.string().optional().nullable(),
  })
  .refine((d) => new Date(d.end_date) >= new Date(d.start_date), {
    message: 'Tanggal selesai harus setelah tanggal mulai',
    path: ['end_date'],
  });

const rejectSchema = z.object({
  rejection_reason: z.string().min(3, 'Alasan penolakan minimal 3 karakter').max(500),
});

export async function listMyLeaves() {
  const user = await requireUser();
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('leaves')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[listMyLeaves]', error.message);
    throw new Error(error.message);
  }
  return data ?? [];
}

export async function listAllLeaves(status?: string, from?: string, to?: string) {
  await requireRole(['hrd', 'admin']);
  const supabase = await getSupabase();
  let q = supabase
    .from('leaves')
    .select('*, profiles:leaves_user_id_fkey!inner(full_name, nip, department, avatar_url)')
    .order('created_at', { ascending: false });
  if (status && status !== 'all') q = q.eq('status', status);
  if (from) q = q.gte('created_at', `${from}T00:00:00`);
  if (to) q = q.lte('created_at', `${to}T23:59:59`);
  const { data, error } = await q;
  if (error) {
    console.error('[listAllLeaves]', error.message);
    throw new Error(error.message);
  }
  return (data as any[]) ?? [];
}

export async function listPendingLeavesForHRD() {
  await requireRole(['hrd', 'admin']);
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('leaves')
    .select('*, profiles:leaves_user_id_fkey!inner(full_name, nip, department)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(5);
  if (error) {
    console.error('[listPendingLeavesForHRD]', error.message);
    throw new Error(error.message);
  }
  return (data as any[]) ?? [];
}

export async function createLeave(
  input: z.infer<typeof createLeaveSchema>
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const data = createLeaveSchema.parse(input);
    const supabase = await getSupabase();

    const daysRequested = calculateBusinessDays(data.start_date, data.end_date);

    if (data.type === 'annual') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('annual_leave_quota, used_leave_days')
        .eq('id', user.id)
        .single();

      const quota = profile?.annual_leave_quota ?? 12;
      const used = profile?.used_leave_days ?? 0;
      const remaining = Math.max(0, quota - used);
      if (remaining < daysRequested) {
        return fail(`Sisa kuota cuti tahunan tidak mencukupi (sisa ${remaining} hari, diajukan ${daysRequested} hari kerja).`);
      }
    }

    let finalAttachmentUrl = data.attachment_url ?? null;
    if (finalAttachmentUrl && finalAttachmentUrl.startsWith('data:')) {
      try {
        const buffer = dataUrlToBuffer(finalAttachmentUrl);
        const encryptedBuffer = encryptImage(buffer);
        const ext = finalAttachmentUrl.match(/^data:application\/pdf/) ? 'pdf' : 'bin';
        const filePath = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('leave_attachments')
          .upload(filePath, encryptedBuffer, { contentType: 'application/octet-stream', upsert: true });
        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage.from('leave_attachments').getPublicUrl(filePath);
          finalAttachmentUrl = publicUrlData.publicUrl;
        } else {
          console.warn('[createLeave] attachment upload warning:', uploadError.message);
          finalAttachmentUrl = null;
        }
      } catch (err) {
        console.warn('[createLeave] attachment upload failed:', err);
        finalAttachmentUrl = null;
      }
    }

    const { data: created, error } = await supabase
      .from('leaves')
      .insert({
        user_id: user.id,
        type: data.type,
        start_date: data.start_date,
        end_date: data.end_date,
        reason: data.reason,
        attachment_url: finalAttachmentUrl,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) return fail(error.message);

    void emitToHRD('leave:new', { id: created.id, user_name: user.name, type: data.type });

    void logAudit({
      actor_id: user.id,
      actor_email: user.email,
      actor_role: user.role,
      action: 'create',
      resource_type: 'leave',
      resource_id: created.id,
      details: { type: data.type, start_date: data.start_date, end_date: data.end_date },
    });

    revalidatePath('/employee/leave');
    revalidatePath('/hrd/leave');
    revalidatePath('/hrd/dashboard');
    return ok({ id: created.id });
  } catch (e) {
    return handleError(e);
  }
}

export async function approveLeave(id: string): Promise<ActionResult> {
  try {
    const admin = await requireRole(['hrd', 'admin']);
    const supabase = await getSupabase();

    const { data: leave } = await supabase
      .from('leaves')
      .select('user_id, type, start_date, end_date')
      .eq('id', id)
      .single();
    if (!leave) return fail('Pengajuan tidak ditemukan');

    // Conditional update — only succeeds when status is still 'pending',
    // preventing two HRD users from racing to approve/reject the same row.
    const { data: updated, error } = await supabase
      .from('leaves')
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

    if (leave.type === 'annual') {
      const days = calculateBusinessDays(leave.start_date, leave.end_date);
      const { data: profile } = await supabase
        .from('profiles')
        .select('annual_leave_quota, used_leave_days')
        .eq('id', leave.user_id)
        .single();

      if (profile) {
        const quota = profile.annual_leave_quota ?? 12;
        const used = profile.used_leave_days ?? 0;
        const remaining = Math.max(0, quota - used);
        if (remaining < days) {
          return fail(`Kuota cuti karyawan tidak mencukupi (sisa ${remaining} hari, diajukan ${days} hari kerja).`);
        }
        const newUsed = used + days;
        await supabase
          .from('profiles')
          .update({ used_leave_days: newUsed, updated_at: new Date().toISOString() })
          .eq('id', leave.user_id);
      }
    }

    await supabase.from('notifications').insert({
      user_id: leave.user_id,
      title: 'Cuti Disetujui',
      message: `Pengajuan cuti Anda telah disetujui.`,
      type: 'approval',
      reference_id: id,
      reference_type: 'leave',
    });

    void emitToUser(leave.user_id, 'leave:approved', { id });
    void emitToHRD('leave:updated', { id });

    void logAudit({
      actor_id: admin.id,
      actor_email: admin.email,
      actor_role: admin.role,
      action: 'approve',
      resource_type: 'leave',
      resource_id: id,
      details: { type: leave.type, employee_id: leave.user_id },
    });

    revalidatePath('/employee/leave');
    revalidatePath('/hrd/leave');
    revalidatePath('/hrd/dashboard');
    return ok({ id });
  } catch (e) {
    return handleError(e);
  }
}

export async function rejectLeave(
  id: string,
  payload: { rejection_reason: string }
): Promise<ActionResult> {
  try {
    const admin = await requireRole(['hrd', 'admin']);
    const data = rejectSchema.parse(payload);
    const supabase = await getSupabase();

    const { data: leave } = await supabase
      .from('leaves')
      .select('user_id, type')
      .eq('id', id)
      .single();
    if (!leave) return fail('Pengajuan tidak ditemukan');

    const { data: updated, error } = await supabase
      .from('leaves')
      .update({
        status: 'rejected',
        approved_by: admin.id,
        approved_at: new Date().toISOString(),
        rejection_reason: data.rejection_reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle();

    if (error) return fail(error.message);
    if (!updated) return fail('Pengajuan sudah diproses oleh pengguna lain');

    await supabase.from('notifications').insert({
      user_id: leave.user_id,
      title: 'Cuti Ditolak',
      message: `Pengajuan cuti Anda ditolak: ${data.rejection_reason}`,
      type: 'rejection',
      reference_id: id,
      reference_type: 'leave',
    });

    void emitToUser(leave.user_id, 'leave:rejected', { id });
    void emitToHRD('leave:updated', { id });

    void logAudit({
      actor_id: admin.id,
      actor_email: admin.email,
      actor_role: admin.role,
      action: 'reject',
      resource_type: 'leave',
      resource_id: id,
      details: { type: leave.type, employee_id: leave.user_id, rejection_reason: data.rejection_reason },
    });

    revalidatePath('/employee/leave');
    revalidatePath('/hrd/leave');
    revalidatePath('/hrd/dashboard');
    return ok({ id });
  } catch (e) {
    return handleError(e);
  }
}
