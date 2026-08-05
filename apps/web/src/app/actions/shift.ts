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

const shiftSchema = z.object({
  name: z.string().min(2, 'Nama shift minimal 2 karakter'),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Format jam tidak valid (HH:mm)'),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Format jam tidak valid (HH:mm)'),
  grace_period_minutes: z.number().min(0).default(15),
});

export async function listShifts() {
  await requireUser();
  const supabase = await getSupabase();
  const { data } = await supabase
    .from('shifts')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true });
  return data ?? [];
}

export async function createShift(input: {
  name: string;
  start_time: string;
  end_time: string;
  grace_period_minutes?: number;
}): Promise<ActionResult> {
  try {
    await requireRole(['hrd', 'admin']);
    const parsed = shiftSchema.parse(input);
    const supabase = await getSupabase();

    const { data, error } = await supabase
      .from('shifts')
      .insert({
        name: parsed.name,
        start_time: parsed.start_time,
        end_time: parsed.end_time,
        grace_period_minutes: parsed.grace_period_minutes,
      })
      .select()
      .single();

    if (error) return fail(error.message);
    revalidatePath('/[portal]/shift', 'page');
    return ok(data);
  } catch (e) {
    return handleError(e, 'Gagal membuat shift baru');
  }
}

export async function deleteShift(id: string): Promise<ActionResult> {
  try {
    await requireRole(['hrd', 'admin']);
    const supabase = await getSupabase();
    const { error } = await supabase
      .from('shifts')
      .update({ is_active: false })
      .eq('id', id);

    if (error) return fail(error.message);
    revalidatePath('/[portal]/shift', 'page');
    return ok(true);
  } catch (e) {
    return handleError(e, 'Gagal menghapus shift');
  }
}

export async function assignUserShift(input: {
  user_id: string;
  shift_id: string;
  date: string;
}): Promise<ActionResult> {
  try {
    await requireRole(['hrd', 'admin']);
    const supabase = await getSupabase();

    const { data, error } = await supabase
      .from('user_shifts')
      .upsert(
        {
          user_id: input.user_id,
          shift_id: input.shift_id,
          date: input.date,
        },
        { onConflict: 'user_id,date' }
      )
      .select()
      .single();

    if (error) return fail(error.message);
    revalidatePath('/[portal]/shift', 'page');
    return ok(data);
  } catch (e) {
    return handleError(e, 'Gagal menugaskan shift');
  }
}

export async function getUserShiftForDate(userId: string, dateStr: string) {
  const user = await requireUser();
  const isOwner = user.id === userId;
  const isHrdOrAdmin = ['hrd', 'admin'].includes(user.role);
  if (!isOwner && !isHrdOrAdmin) {
    throw new Error('Forbidden');
  }

  const supabase = await getSupabase();
  const { data } = await supabase
    .from('user_shifts')
    .select('*, shifts(*)')
    .eq('user_id', userId)
    .eq('date', dateStr)
    .maybeSingle();

  if (data?.shifts) return data.shifts;

  // Fallback default shift (Shift Normal Pagi)
  const { data: defaultShift } = await supabase
    .from('shifts')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  return defaultShift ?? { start_time: '08:00:00', end_time: '17:00:00', grace_period_minutes: 15 };
}
