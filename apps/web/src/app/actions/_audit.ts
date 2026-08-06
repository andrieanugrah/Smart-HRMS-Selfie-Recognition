'use server';

import { headers } from 'next/headers';
import { getSupabaseAdmin } from './_utils';

export interface AuditLogInput {
  actor_id: string;
  actor_email: string;
  actor_role: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: Record<string, unknown>;
}

export async function logAudit(input: AuditLogInput): Promise<void> {
  try {
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || null;
    const userAgent = headersList.get('user-agent') || null;

    const supabase = getSupabaseAdmin();
    await supabase.from('audit_logs').insert({
      actor_id: input.actor_id,
      actor_email: input.actor_email,
      actor_role: input.actor_role,
      action: input.action,
      resource_type: input.resource_type,
      resource_id: input.resource_id ?? null,
      details: input.details ?? {},
      ip_address: ip,
      user_agent: userAgent,
    });
  } catch (e) {
    console.error('[logAudit] failed:', e instanceof Error ? e.message : e);
  }
}

export async function listAuditLogs(options?: {
  limit?: number;
  offset?: number;
  search?: string;
  action?: string;
}) {
  const { requireRole } = await import('./_utils');
  await requireRole(['hrd', 'admin']);

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (options?.limit) {
    const limit = options.limit;
    const offset = options.offset ?? 0;
    query = query.range(offset, offset + limit - 1);
  } else {
    query = query.limit(50);
  }

  if (options?.action) {
    query = query.eq('action', options.action);
  }

  if (options?.search) {
    query = query.or(
      `actor_email.ilike.%${options.search}%,action.ilike.%${options.search}%,resource_type.ilike.%${options.search}%`
    );
  }

  const { data, count, error } = await query;
  if (error) {
    console.error('[listAuditLogs] error:', error.message);
    return { data: [], count: 0 };
  }

  return { data: data ?? [], count: count ?? 0 };
}

