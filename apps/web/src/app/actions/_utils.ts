import 'server-only';
import { getServerSession } from 'next-auth';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { authOptions } from '@/lib/auth/config';

export type Role = 'employee' | 'hrd' | 'admin';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  image?: string | null;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const u = session.user as any;
  return {
    id: u.id,
    email: u.email,
    name: u.name ?? 'User',
    role: u.role,
    image: u.image ?? null,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error('UNAUTHORIZED');
  return user;
}

export async function requireRole(roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw new Error('FORBIDDEN');
  return user;
}

let cachedAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cachedAdmin) return cachedAdmin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi');
  }
  cachedAdmin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cachedAdmin;
}

export async function getSupabase() {
  return getSupabaseAdmin();
}

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(error: string): ActionResult<never> {
  return { ok: false, error };
}

export function handleError(e: unknown, fallback = 'Terjadi kesalahan'): ActionResult<never> {
  if (e instanceof Error) {
    if (e.message === 'UNAUTHORIZED') return fail('Anda harus login');
    if (e.message === 'FORBIDDEN') return fail('Anda tidak punya akses');
    return fail(e.message || fallback);
  }
  return fail(fallback);
}
