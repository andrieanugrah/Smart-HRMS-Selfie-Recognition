'use server';

import { requireUser, getSupabase, fail, handleError, ok, type ActionResult } from './_utils';
import { revalidatePath } from 'next/cache';

export async function getMyNotificationsBundle() {
  const user = await requireUser();
  const supabase = await getSupabase();
  const [listResult, countResult] = await Promise.all([
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false),
  ]);
  const items = listResult.data ?? [];
  const unread = items.reduce((acc, n) => acc + (n.is_read ? 0 : 1), 0) || (countResult.count ?? 0);
  return { items, unread };
}

export async function markNotificationRead(id: string): Promise<ActionResult> {
  try {
    await requireUser();
    const supabase = await getSupabase();
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
    if (error) return fail(error.message);
    revalidatePath('/[portal]', 'layout');
    return ok({ id });
  } catch (e) {
    return handleError(e);
  }
}

export async function markAllRead(): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const supabase = await getSupabase();
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    if (error) return fail(error.message);
    revalidatePath('/[portal]', 'layout');
    return ok({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
