'use server';

import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { encryptImage } from '@/lib/crypto/image-crypto';
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

const reimbursementSchema = z.object({
  category: z.enum(['medical', 'transport', 'operational', 'meal', 'other']),
  amount: z.number().positive('Nominal harus lebih dari 0'),
  date: z.string().min(1),
  description: z.string().min(3, 'Keterangan minimal 3 karakter').max(500),
  imageDataUrl: z.string().optional().nullable(),
});

export async function submitReimbursement(input: z.infer<typeof reimbursementSchema>): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = reimbursementSchema.parse(input);
    const supabase = await getSupabase();

    let receiptUrl: string | null = null;
    if (parsed.imageDataUrl && parsed.imageDataUrl.startsWith('data:image/')) {
      const match = parsed.imageDataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        const mimeType = match[1];
        const base64Data = match[2];
        const plainBuffer = Buffer.from(base64Data, 'base64');
        const encryptedBuffer = encryptImage(plainBuffer);
        const fileName = `receipts/${user.id}/${randomUUID()}.bin`;

        const { error: uploadErr } = await supabase.storage
          .from('selfies') // Reusing active storage bucket for attachments
          .upload(fileName, encryptedBuffer, { contentType: mimeType, upsert: true });

        if (!uploadErr) {
          const { data: pubData } = supabase.storage.from('selfies').getPublicUrl(fileName);
          receiptUrl = pubData.publicUrl;
        }
      }
    }

    const { data, error } = await supabase
      .from('reimbursements')
      .insert({
        user_id: user.id,
        category: parsed.category,
        amount: parsed.amount,
        date: parsed.date,
        description: parsed.description,
        receipt_url: receiptUrl,
        status: 'pending',
      })
      .select()
      .single();

    if (error) return fail(error.message);

    emitToHRD('reimbursement:new', {
      user_id: user.id,
      user_name: user.name,
      amount: parsed.amount,
    });

    revalidatePath('/[portal]/reimbursement', 'page');
    return ok(data);
  } catch (e) {
    return handleError(e, 'Gagal mengajukan reimbursement');
  }
}

export async function listMyReimbursements() {
  const user = await requireUser();
  const supabase = await getSupabase();
  const { data } = await supabase
    .from('reimbursements')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function listAllReimbursements(status?: string) {
  await requireRole(['hrd', 'admin']);
  const supabase = await getSupabase();
  let q = supabase
    .from('reimbursements')
    .select('*, profiles:reimbursements_user_id_fkey(full_name, nip, department)')
    .order('created_at', { ascending: false });

  if (status && status !== 'all') {
    q = q.eq('status', status);
  }

  const { data } = await q;
  return data ?? [];
}

export async function approveReimbursement(id: string): Promise<ActionResult> {
  try {
    const hrd = await requireRole(['hrd', 'admin']);
    const supabase = await getSupabase();

    const { data, error } = await supabase
      .from('reimbursements')
      .update({
        status: 'approved',
        approved_by: hrd.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return fail(error.message);

    emitToUser(data.user_id, 'reimbursement:updated', { status: 'approved' });
    revalidatePath('/[portal]/reimbursement', 'page');
    return ok(data);
  } catch (e) {
    return handleError(e, 'Gagal menyetujui reimbursement');
  }
}

export async function rejectReimbursement(id: string, reason: string): Promise<ActionResult> {
  try {
    const hrd = await requireRole(['hrd', 'admin']);
    const supabase = await getSupabase();

    const { data, error } = await supabase
      .from('reimbursements')
      .update({
        status: 'rejected',
        approved_by: hrd.id,
        approved_at: new Date().toISOString(),
        rejection_reason: reason,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return fail(error.message);

    emitToUser(data.user_id, 'reimbursement:updated', { status: 'rejected' });
    revalidatePath('/[portal]/reimbursement', 'page');
    return ok(data);
  } catch (e) {
    return handleError(e, 'Gagal menolak reimbursement');
  }
}
