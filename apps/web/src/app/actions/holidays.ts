'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Holiday } from 'shared';
import {
  requireUser,
  requireRole,
  getSupabaseAdmin,
  ok,
  fail,
  handleError,
  type ActionResult,
} from './_utils';
import { emitToHRD, emitToUser } from './_events';
import { logAudit } from './_audit';

interface ExternalHoliday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
  global: boolean;
}

async function fetchNagerHolidays(year: number): Promise<ExternalHoliday[]> {
  const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/ID`, {
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error(`Failed to fetch holidays: ${res.status}`);
  return res.json();
}

const holidaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  name: z.string().min(2, 'Nama libur minimal 2 karakter'),
  type: z.enum(['national', 'company_leave']),
  description: z.string().optional(),
});

export async function listHolidays(year?: number): Promise<Holiday[]> {
  await requireUser();
  const supabase = getSupabaseAdmin();
  const targetYear = year ?? new Date().getFullYear();

  const startDate = `${targetYear}-01-01`;
  const endDate = `${targetYear}-12-31`;

  const { data, error } = await supabase
    .from('holidays')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  if (error) {
    console.error('[listHolidays] error:', error.message);
    return [];
  }

  return (data as Holiday[]) ?? [];
}

export async function createHoliday(input: z.infer<typeof holidaySchema>): Promise<ActionResult<Holiday>> {
  try {
    const user = await requireRole(['hrd', 'admin']);
    const parsed = holidaySchema.parse(input);
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('holidays')
      .insert({
        date: parsed.date,
        name: parsed.name,
        type: parsed.type,
        description: parsed.description ?? null,
      })
      .select()
      .single();

    if (error) return fail(error.message);

    void logAudit({
      actor_id: user.id,
      actor_email: user.email,
      actor_role: user.role,
      action: 'holiday:create',
      resource_type: 'holiday',
      resource_id: data.id,
      details: { name: parsed.name, date: parsed.date, type: parsed.type },
    });

    emitToHRD('holiday:updated', {});
    // ponytail: holiday applies to all users, broadcast
    emitToUser('all', 'holiday:updated', {});

    revalidatePath('/[portal]/leave', 'page');
    return ok(data as Holiday);
  } catch (e) {
    return handleError(e, 'Gagal menambah libur nasional / cuti bersama');
  }
}

export async function syncPublicHolidays(year?: number): Promise<ActionResult<{ added: number }>> {
  try {
    const user = await requireRole(['hrd', 'admin']);
    const targetYear = year ?? new Date().getFullYear();
    const external = await fetchNagerHolidays(targetYear);
    const supabase = getSupabaseAdmin();

    const rows = external
      .filter((h) => h.countryCode === 'ID' && h.global)
      .map((h) => ({
        date: h.date,
        name: h.localName,
        type: 'national' as const,
        description: h.name,
      }));

    let added = 0;
    for (const row of rows) {
      const { error, data } = await supabase
        .from('holidays')
        .upsert(row, { onConflict: 'date' })
        .select('id')
        .maybeSingle();
      if (!error && data) added++;
    }

    void logAudit({
      actor_id: user.id,
      actor_email: user.email,
      actor_role: user.role,
      action: 'holiday:sync',
      resource_type: 'holiday',
      details: { year: targetYear, added, source: 'nager.date' },
    });

    emitToHRD('holiday:updated', {});
    emitToUser('all', 'holiday:updated', {});

    revalidatePath('/[portal]/leave', 'page');
    return ok({ added });
  } catch (e) {
    return handleError(e, 'Gagal sinkronisasi libur nasional');
  }
}

export async function deleteHoliday(id: string): Promise<ActionResult> {
  try {
    const user = await requireRole(['hrd', 'admin']);
    const supabase = getSupabaseAdmin();

    const { error } = await supabase.from('holidays').delete().eq('id', id);
    if (error) return fail(error.message);

    void logAudit({
      actor_id: user.id,
      actor_email: user.email,
      actor_role: user.role,
      action: 'holiday:delete',
      resource_type: 'holiday',
      resource_id: id,
    });

    emitToHRD('holiday:updated', {});
    emitToUser('all', 'holiday:updated', {});

    revalidatePath('/[portal]/leave', 'page');
    return ok({ deleted: true });
  } catch (e) {
    return handleError(e, 'Gagal menghapus data libur');
  }
}
