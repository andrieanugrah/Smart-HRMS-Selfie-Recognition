'use server';

import { requireUser, getSupabase, ok, fail, handleError, type ActionResult } from './_utils';
import { logAudit } from './_audit';

export async function exportMyData(): Promise<ActionResult<Record<string, unknown>>> {
  try {
    const user = await requireUser();
    const supabase = await getSupabase();

    const [
      { data: profile },
      { data: attendance },
      { data: leaves },
      { data: overtimes },
      { data: notifications },
      { data: faceDescriptor },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('attendance').select('*').eq('user_id', user.id).order('date', { ascending: false }),
      supabase.from('leaves').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('overtimes').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('face_descriptors').select('id, user_id, is_active, created_at, updated_at').eq('user_id', user.id).maybeSingle(),
    ]);

    void logAudit({
      actor_id: user.id,
      actor_email: user.email,
      actor_role: user.role,
      action: 'export',
      resource_type: 'profile',
      resource_id: user.id,
    });

    return ok({
      exported_at: new Date().toISOString(),
      user_id: user.id,
      profile,
      attendance: attendance ?? [],
      leaves: leaves ?? [],
      overtimes: overtimes ?? [],
      notifications: notifications ?? [],
      face_descriptor: faceDescriptor ?? null,
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function requestAccountDeletion(reason: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const supabase = await getSupabase();

    if (!reason || reason.length < 3) {
      return fail('Alasan penghapusan minimal 3 karakter');
    }

    // ponytail: dedup check — spamming same request wastes everyone's time
    const { data: existingRequest } = await supabase
      .from('notifications')
      .select('id')
      .eq('reference_id', user.id)
      .eq('reference_type', 'deletion_request')
      .eq('is_read', false)
      .maybeSingle();
    if (existingRequest) {
      return fail('Permintaan hapus akun masih menunggu approval. Silakan hubungi HRD.');
    }

    // Notify all HRD/admin users about the deletion request.
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .in('role', ['hrd', 'admin'])
      .eq('is_active', true);

    const notifications = (admins ?? []).map((admin) => ({
      user_id: admin.id,
      title: 'Permintaan Hapus Akun',
      message: `${user.email} meminta penghapusan akun. Alasan: ${reason}`,
      type: 'approval' as const,
      reference_id: user.id,
      reference_type: 'deletion_request',
    }));

    if (notifications.length > 0) {
      const { error } = await supabase.from('notifications').insert(notifications);
      if (error) return fail(error.message);
    }

    void logAudit({
      actor_id: user.id,
      actor_email: user.email,
      actor_role: user.role,
      action: 'request_delete',
      resource_type: 'profile',
      resource_id: user.id,
      details: { reason },
    });

    return ok({ requested: true });
  } catch (e) {
    return handleError(e);
  }
}
