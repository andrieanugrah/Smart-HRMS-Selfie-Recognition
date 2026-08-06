'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import {
  requireUser,
  getSupabase,
  getSupabaseAdmin,
  ok,
  fail,
  handleError,
  type ActionResult,
} from './_utils';
import { encryptImage, dataUrlToBuffer } from '@/lib/crypto/image-crypto';

const updateProfileSchema = z.object({
  full_name: z.string().min(2).max(120).optional(),
  phone: z.string().max(20).optional().nullable(),
  department: z.string().max(80).optional().nullable(),
  position: z.string().max(80).optional().nullable(),
});

const updateEmailSchema = z.object({
  email: z.string().email('Email tidak valid'),
});

const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Password saat ini wajib'),
    newPassword: z.string().min(6, 'Password baru minimal 6 karakter'),
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: 'Password baru tidak boleh sama dengan yang lama',
    path: ['newPassword'],
  });

export async function getMyProfile() {
  const user = await requireUser();
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  if (error) return null;
  return data;
}

export async function updateMyProfile(
  input: z.infer<typeof updateProfileSchema>
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const data = updateProfileSchema.parse(input);
    const supabase = await getSupabase();

    const { error } = await supabase
      .from('profiles')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (error) return fail(error.message);
    revalidatePath('/[portal]/profile', 'page');
    return ok({ updated: true });
  } catch (e) {
    return handleError(e);
  }
}

export async function updateMyEmail(
  input: z.infer<typeof updateEmailSchema>
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const data = updateEmailSchema.parse(input);
    const admin = getSupabaseAdmin();

    const { error } = await admin.auth.admin.updateUserById(user.id, {
      email: data.email,
      email_confirm: true,
    });
    if (error) return fail(error.message);

    const supabase = await getSupabase();
    await supabase
      .from('profiles')
      .update({ email: data.email, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    revalidatePath('/[portal]/profile', 'page');
    return ok({ email: data.email });
  } catch (e) {
    return handleError(e);
  }
}

export async function updateMyPassword(
  input: z.infer<typeof updatePasswordSchema>
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const data = updatePasswordSchema.parse(input);

    // Verifikasi password saat ini via anon client (login ulang).
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return fail('Konfigurasi Supabase tidak lengkap');
    const verifier = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: signInError } = await verifier.auth.signInWithPassword({
      email: user.email,
      password: data.currentPassword,
    });
    if (signInError) return fail('Password saat ini salah');

    const admin = getSupabaseAdmin();
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      password: data.newPassword,
    });
    if (error) return fail(error.message);

    return ok({ updated: true });
  } catch (e) {
    return handleError(e);
  }
}

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export async function uploadMyAvatar(
  dataUrl: string
): Promise<ActionResult<{ url: string }>> {
  try {
    const user = await requireUser();

    if (!dataUrl.startsWith('data:image/')) {
      return fail('File harus berupa gambar');
    }

    const admin = getSupabaseAdmin();
    const buffer = dataUrlToBuffer(dataUrl);
    if (buffer.byteLength > AVATAR_MAX_BYTES) {
      return fail('Ukuran gambar maksimal 2MB');
    }
    const encryptedBuffer = encryptImage(buffer);
    const path = `${user.id}/${Date.now()}.bin`;

    const { error: uploadError } = await admin.storage
      .from('avatars')
      .upload(path, encryptedBuffer, { contentType: 'application/octet-stream', upsert: true });
    if (uploadError) {
      return fail(uploadError.message);
    }

    const { data: pub } = admin.storage.from('avatars').getPublicUrl(path);
    const url = pub.publicUrl;
    const supabase = await getSupabase();
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: url, avatar_encrypted: true, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (updateError) return fail(updateError.message);

    revalidatePath('/[portal]/profile', 'page');
    return ok({ url });
  } catch (e) {
    return handleError(e);
  }
}
