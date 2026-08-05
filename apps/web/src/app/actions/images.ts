'use server';

import { getSupabaseAdmin, requireUser, requireRole } from './_utils';
import { decryptImage } from '@/lib/crypto/image-crypto';

export async function getDecryptedImageUrl(
  url: string | null | undefined,
  isEncrypted?: boolean
): Promise<string | null> {
  if (!url) return null;

  // Only decrypt URLs from our private storage buckets.
  const isPrivateStorage = url.includes('/storage/v1/object/public/selfies/') ||
    url.includes('/storage/v1/object/public/avatars/');
  if (!isPrivateStorage) return url;

  // Legacy unencrypted images (PNG/JPG/WebP URLs) remain readable as-is.
  const looksEncrypted = isEncrypted || url.endsWith('.bin');
  if (!looksEncrypted) return url;

  const user = await requireUser();

  const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (!match) return url;
  const [, bucket, path] = match;
  const pathUserId = path.split('/')[0];
  const isOwner = pathUserId === user.id;
  const isPrivileged = user.role === 'hrd' || user.role === 'admin';
  if (!isOwner && !isPrivileged) {
    console.warn('[getDecryptedImageUrl] forbidden: user=%s role=%s path=%s', user.id, user.role, path);
    return null;
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (error || !data) {
      console.warn('[getDecryptedImageUrl] download failed:', error?.message);
      return null;
    }

    const encryptedBuffer = Buffer.from(await data.arrayBuffer());
    const decryptedBuffer = decryptImage(encryptedBuffer);
    const contentType = data.type || 'image/jpeg';
    return `data:${contentType};base64,${decryptedBuffer.toString('base64')}`;
  } catch (e) {
    console.warn('[getDecryptedImageUrl] decrypt failed:', e);
    return null;
  }
}

export async function getMyDecryptedAvatar(): Promise<string | null> {
  const user = await requireUser();
  const supabase = getSupabaseAdmin();
  const { data: profile } = await supabase
    .from('profiles')
    .select('avatar_url, avatar_encrypted')
    .eq('id', user.id)
    .single();
  return getDecryptedImageUrl(profile?.avatar_url, profile?.avatar_encrypted ?? false);
}

export async function getEmployeeDecryptedAvatar(
  employeeId: string
): Promise<string | null> {
  await requireRole(['hrd', 'admin']);
  const supabase = getSupabaseAdmin();
  const { data: profile } = await supabase
    .from('profiles')
    .select('avatar_url, avatar_encrypted')
    .eq('id', employeeId)
    .single();
  return getDecryptedImageUrl(profile?.avatar_url, profile?.avatar_encrypted ?? false);
}
