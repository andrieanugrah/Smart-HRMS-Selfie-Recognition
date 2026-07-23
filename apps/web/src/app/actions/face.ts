'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  requireUser,
  requireRole,
  ok,
  fail,
  handleError,
  getSupabase,
  type ActionResult,
} from './_utils';

const registerFaceSchema = z.object({
  descriptors: z
    .array(z.array(z.number()).length(128))
    .min(1, 'Minimal 1 sample wajah')
    .max(5, 'Maksimal 5 sample'),
  image_urls: z.array(z.string()).optional(),
});

function averageDescriptor(samples: number[][]): number[] {
  const len = samples[0].length;
  const avg = new Array(len).fill(0);
  for (const s of samples) {
    for (let i = 0; i < len; i++) avg[i] += s[i];
  }
  for (let i = 0; i < len; i++) avg[i] /= samples.length;
  return avg;
}

export async function registerFace(
  input: z.infer<typeof registerFaceSchema>
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const data = registerFaceSchema.parse(input);
    const supabase = await getSupabase();

    const avgDescriptor = averageDescriptor(data.descriptors);
    const imageUrl = data.image_urls?.length ? data.image_urls[0] : null;

    const { data: existing } = await supabase
      .from('face_descriptors')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    let result;
    if (existing) {
      const r = await supabase
        .from('face_descriptors')
        .update({
          descriptor: avgDescriptor,
          image_url: imageUrl,
          is_active: true,
        })
        .eq('user_id', user.id)
        .select('id')
        .single();
      result = r;
    } else {
      const r = await supabase
        .from('face_descriptors')
        .insert({
          user_id: user.id,
          descriptor: avgDescriptor,
          image_url: imageUrl,
          is_active: true,
        })
        .select('id')
        .single();
      result = r;
    }

    if (result.error) return fail(result.error.message);

    revalidatePath('/[portal]/profile', 'page');
    return ok({ id: result.data.id });
  } catch (e) {
    return handleError(e);
  }
}

export async function deleteMyFace(): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const supabase = await getSupabase();
    const { error } = await supabase
      .from('face_descriptors')
      .update({ is_active: false })
      .eq('user_id', user.id);
    if (error) return fail(error.message);
    revalidatePath('/[portal]/profile', 'page');
    return ok({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}

export async function deleteEmployeeFace(userId: string): Promise<ActionResult> {
  try {
    const me = await requireRole(['hrd', 'admin']);
    if (userId === me.id) return fail('Tidak dapat menghapus wajah sendiri dari sini');
    const supabase = await getSupabase();
    const { error } = await supabase
      .from('face_descriptors')
      .update({ is_active: false })
      .eq('user_id', userId);
    if (error) return fail(error.message);
    revalidatePath('/[portal]/employees', 'page');
    return ok({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}
