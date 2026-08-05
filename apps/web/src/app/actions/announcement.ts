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
import { emitToHRD } from './_events';

const announcementSchema = z.object({
  title: z.string().min(3, 'Judul minimal 3 karakter').max(200),
  content: z.string().min(5, 'Isi pengumuman minimal 5 karakter'),
  urgency: z.enum(['info', 'warning', 'urgent']).default('info'),
  is_pinned: z.boolean().default(false),
});

export async function createAnnouncement(input: z.infer<typeof announcementSchema>): Promise<ActionResult> {
  try {
    const author = await requireRole(['hrd', 'admin']);
    const parsed = announcementSchema.parse(input);
    const supabase = await getSupabase();

    const { data, error } = await supabase
      .from('announcements')
      .insert({
        author_id: author.id,
        title: parsed.title,
        content: parsed.content,
        urgency: parsed.urgency,
        is_pinned: parsed.is_pinned,
      })
      .select()
      .single();

    if (error) return fail(error.message);

    emitToHRD('announcement:new', { title: parsed.title });

    revalidatePath('/[portal]/announcements', 'page');
    revalidatePath('/[portal]/dashboard', 'page');
    return ok(data);
  } catch (e) {
    return handleError(e, 'Gagal membuat pengumuman');
  }
}

export async function listAnnouncements() {
  await requireUser();
  const supabase = await getSupabase();
  const { data } = await supabase
    .from('announcements')
    .select('*, profiles:announcements_author_id_fkey(full_name)')
    .eq('is_active', true)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function deleteAnnouncement(id: string): Promise<ActionResult> {
  try {
    await requireRole(['hrd', 'admin']);
    const supabase = await getSupabase();

    const { error } = await supabase
      .from('announcements')
      .update({ is_active: false })
      .eq('id', id);

    if (error) return fail(error.message);

    revalidatePath('/[portal]/announcements', 'page');
    revalidatePath('/[portal]/dashboard', 'page');
    return ok(true);
  } catch (e) {
    return handleError(e, 'Gagal menghapus pengumuman');
  }
}
