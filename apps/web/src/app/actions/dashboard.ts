'use server';

import { requireUser, requireRole, getSupabase } from './_utils';

export async function getEmployeeDashboardSummary() {
  try {
    const user = await requireUser();
    const supabase = await getSupabase();
    const today = new Date().toISOString().split('T')[0];
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [
      { data: todayAtt },
      { count: monthDays },
      { data: profile },
      { count: pendingMine },
      { data: faceDescriptor },
      { data: recentLeaves },
      { data: recentOvertimes },
    ] = await Promise.all([
      supabase.from('attendance').select('*').eq('user_id', user.id).eq('date', today).maybeSingle(),
      supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('date', monthStart.toISOString().split('T')[0]),
      supabase.from('profiles').select('annual_leave_quota, used_leave_days').eq('id', user.id).single(),
      supabase
        .from('leaves')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'pending'),
      supabase
        .from('face_descriptors')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle(),
      supabase
        .from('leaves')
        .select('id, type, start_date, end_date, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('overtimes')
        .select('id, date, total_hours, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3),
    ]);

    return {
      today_status: todayAtt?.status ?? 'not_clocked_in',
      check_in: todayAtt?.check_in ?? null,
      check_out: todayAtt?.check_out ?? null,
      month_attendance: monthDays ?? 0,
      leave_quota_used: profile?.used_leave_days ?? 0,
      leave_quota_total: profile?.annual_leave_quota ?? 12,
      pending_requests: pendingMine ?? 0,
      has_face_descriptor: !!faceDescriptor,
      recent_leaves: recentLeaves ?? [],
      recent_overtimes: recentOvertimes ?? [],
    };
  } catch (e) {
    console.error('[getEmployeeDashboardSummary] error:', e);
    return {
      today_status: 'not_clocked_in',
      check_in: null,
      check_out: null,
      month_attendance: 0,
      leave_quota_used: 0,
      leave_quota_total: 12,
      pending_requests: 0,
      has_face_descriptor: true,
      recent_leaves: [],
      recent_overtimes: [],
    };
  }
}
