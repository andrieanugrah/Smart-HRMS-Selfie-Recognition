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
import { encryptImage, dataUrlToBuffer } from '@/lib/crypto/image-crypto';
import { getUserShiftForDate } from './shift';

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

    let inOffice = false;
    if (data.location) {
      const distMeters = haversineDistance(
        { lat: OFFICE_LAT, lng: OFFICE_LNG },
        data.location
      );
      inOffice = distMeters <= OFFICE_RADIUS;
    }

    const supabase = await getSupabase();
    const today = getTodayDateString();
    const userShift = await getUserShiftForDate(user.id, today);
    const [startH, startM] = (userShift.start_time || '08:00:00').split(':').map(Number);
    const graceMin = userShift.grace_period_minutes ?? 15;
    const now = new Date();
    const nowIso = now.toISOString();
    const currentMinOfDay = now.getHours() * 60 + now.getMinutes();
    const shiftMinStartWithGrace = (startH * 60 + (startM || 0)) + graceMin;
    const status: 'present' | 'late' = currentMinOfDay > shiftMinStartWithGrace ? 'late' : 'present';

    let finalSelfieUrl = data.selfie_url ?? null;
    let selfieEncrypted = false;
    if (data.imageDataUrl && data.imageDataUrl.startsWith('data:image/') && !data.imageDataUrl.startsWith('data:image/svg+xml')) {
      try {
        const buffer = dataUrlToBuffer(data.imageDataUrl);
        const encryptedBuffer = encryptImage(buffer);
        const filePath = `${user.id}/${today}_${Date.now()}.bin`;

        const { error: uploadError } = await supabase.storage
          .from('selfies')
          .upload(filePath, encryptedBuffer, {
            contentType: 'application/octet-stream',
            upsert: true,
          });

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from('selfies')
            .getPublicUrl(filePath);
          finalSelfieUrl = publicUrlData.publicUrl;
          selfieEncrypted = true;
        } else {
          console.warn('[checkIn] selfie upload warning:', uploadError.message);
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
          selfie_encrypted: selfieEncrypted,
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

export async function checkOut(
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

    let inOffice = false;
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

    const { data: existing } = await supabase
      .from('attendance')
      .select('id, check_in, check_out, status')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle();

    if (!existing) return fail('Belum ada absen masuk hari ini');
    if (existing.check_out) return fail('Sudah absen pulang hari ini');

    const { data: updated, error } = await supabase
      .from('attendance')
      .update({ check_out: nowIso, updated_at: nowIso })
      .eq('id', existing.id)
      .select('id')
      .single();

    if (error) return fail(error.message);

    emitToHRD('attendance:checkout', { user_id: user.id, user_name: user.name });
    revalidatePath('/[portal]/attendance', 'page');
    return ok({ 
      id: updated.id,
      status: existing.status,
      selfie_match: match,
      distance,
      in_office: inOffice,
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function listAttendanceForHRD(opts: {
  date?: string;
  from?: string;
  to?: string;
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
  if (opts.from) q = q.gte('date', opts.from);
  if (opts.to) q = q.lte('date', opts.to);
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
