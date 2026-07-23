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
import { FACE_MATCH_THRESHOLD_DEFAULT, getTodayDateString, getHourInTimezone } from 'shared';

const checkInSchema = z.object({
  descriptor: z.array(z.number()).length(128),
  confidence: z.number().min(0).max(1).optional(),
  selfie_url: z.string().optional().nullable(),
  imageDataUrl: z.string().optional().nullable(),
  location: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional()
    .nullable(),
});

const OFFICE_LAT = Number(process.env.OFFICE_LAT ?? -6.2088);
const OFFICE_LNG = Number(process.env.OFFICE_LNG ?? 106.8456);
const OFFICE_RADIUS = Number(process.env.OFFICE_RADIUS_METERS ?? 100);

function haversineDistance(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}

function euclidean(a: number[], b: number[]) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s);
}

export async function getMyFaceDescriptor() {
  const user = await requireUser();
  const supabase = await getSupabase();
  const { data } = await supabase
    .from('face_descriptors')
    .select('descriptor, image_url, is_active')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();
  return data;
}

export async function getMyTodayAttendance() {
  const user = await requireUser();
  const supabase = await getSupabase();
  const today = getTodayDateString();
  const { data } = await supabase
    .from('attendance')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', today)
    .maybeSingle();
  return data;
}

export async function checkIn(
  input: z.infer<typeof checkInSchema>
): Promise<ActionResult<{ id: string; status: string; selfie_match: boolean; distance: number; in_office: boolean }>> {
  try {
    const user = await requireUser();
    const data = checkInSchema.parse(input);

    const stored = await getMyFaceDescriptor();
    if (!stored?.descriptor) {
      return fail('Wajah belum terdaftar. Silakan daftarkan wajah di halaman Profil terlebih dahulu.');
    }

    const distance = euclidean(data.descriptor, stored.descriptor as number[]);
    const threshold = Number(process.env.FACE_MATCH_THRESHOLD ?? FACE_MATCH_THRESHOLD_DEFAULT);
    const match = distance < threshold;
    if (!match) return fail(`Wajah tidak cocok (jarak ${distance.toFixed(3)} > threshold ${threshold}). Coba lagi.`);

    let inOffice = true;
    if (data.location) {
      const distMeters = haversineDistance(
        { lat: OFFICE_LAT, lng: OFFICE_LNG },
        data.location
      );
      inOffice = distMeters <= OFFICE_RADIUS;
    }

    const supabase = await getSupabase();
    const today = getTodayDateString();
    const nowIso = new Date().toISOString();
    const hour = getHourInTimezone();
    const status: 'present' | 'late' = hour >= 9 ? 'late' : 'present';

    let finalSelfieUrl = data.selfie_url ?? null;
    if (data.imageDataUrl && data.imageDataUrl.startsWith('data:image/')) {
      try {
        const matches = data.imageDataUrl.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
        if (matches) {
          const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');
          const filePath = `${user.id}/${today}_${Date.now()}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from('selfies')
            .upload(filePath, buffer, {
              contentType: `image/${matches[1]}`,
              upsert: true,
            });

          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage
              .from('selfies')
              .getPublicUrl(filePath);
            finalSelfieUrl = publicUrlData.publicUrl;
          } else {
            console.warn('[checkIn] selfie upload warning:', uploadError.message);
          }
        }
      } catch (err) {
        console.warn('[checkIn] selfie upload failed:', err);
      }
    }

    const { data: row, error } = await supabase
      .from('attendance')
      .upsert(
        {
          user_id: user.id,
          date: today,
          check_in: nowIso,
          status,
          selfie_url: finalSelfieUrl,
          selfie_match: match,
          confidence: 1 - distance,
          location: data.location ?? null,
          updated_at: nowIso,
        },
        { onConflict: 'user_id,date' }
      )
      .select('id, status')
      .single();

    if (error) return fail(error.message);

    emitToHRD('attendance:new', {
      user_id: user.id,
      user_name: user.name,
      status,
      in_office: inOffice,
    });
    emitToUser(user.id, 'attendance:success', { status });

    revalidatePath('/[portal]/attendance', 'page');
    return ok({
      id: row.id,
      status: row.status,
      selfie_match: match,
      distance,
      in_office: inOffice,
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function checkOut(): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const supabase = await getSupabase();
    const today = getTodayDateString();
    const nowIso = new Date().toISOString();

    const { data: existing } = await supabase
      .from('attendance')
      .select('id, check_in')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle();

    if (!existing) return fail('Belum ada absen masuk hari ini');

    const { data, error } = await supabase
      .from('attendance')
      .update({ check_out: nowIso, updated_at: nowIso })
      .eq('id', existing.id)
      .select('id')
      .single();

    if (error) return fail(error.message);

    emitToHRD('attendance:checkout', { user_id: user.id, user_name: user.name });
    revalidatePath('/[portal]/attendance', 'page');
    return ok({ id: data.id });
  } catch (e) {
    return handleError(e);
  }
}

export async function listAttendanceForHRD(opts: {
  date?: string;
  status?: string;
  search?: string;
} = {}) {
  await requireRole(['hrd', 'admin']);
  const supabase = await getSupabase();

  let q = supabase
    .from('attendance')
    .select('*, profiles:attendance_user_id_fkey!inner(full_name, nip, department)')
    .order('date', { ascending: false })
    .order('check_in', { ascending: false });

  if (opts.date) q = q.eq('date', opts.date);
  if (opts.status && opts.status !== 'all') q = q.eq('status', opts.status);

  const { data, error } = await q;
  if (error) return [];

  let filtered = (data as any[]) ?? [];
  if (opts.search) {
    const s = opts.search.toLowerCase();
    filtered = filtered.filter((a) =>
      a.profiles?.full_name?.toLowerCase().includes(s) ||
      a.profiles?.nip?.toLowerCase().includes(s)
    );
  }
  return filtered;
}

export async function getHRDDashboardStats() {
  await requireRole(['hrd', 'admin']);
  const supabase = await getSupabase();
  const today = getTodayDateString();

  const [{ count: totalEmployees }, { data: todayAttendance }, { count: pendingLeaves }, { count: pendingOvertimes }] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('attendance').select('status').eq('date', today),
    supabase.from('leaves').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('overtimes').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);

  const presentToday = (todayAttendance ?? []).filter((a) => a.status === 'present').length;
  const lateToday = (todayAttendance ?? []).filter((a) => a.status === 'late').length;

  return {
    total_employees: totalEmployees ?? 0,
    present_today: presentToday,
    late_today: lateToday,
    on_leave_today: 0,
    absent_today: Math.max((totalEmployees ?? 0) - presentToday - lateToday, 0),
    pending_approvals: (pendingLeaves ?? 0) + (pendingOvertimes ?? 0),
  };
}
