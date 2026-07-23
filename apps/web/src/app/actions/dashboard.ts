'use server';

import { requireUser, requireRole, getSupabase } from './_utils';

export async function getEmployeeDashboardSummary() {
  const user = await requireUser();
  const supabase = await getSupabase();
  const today = new Date().toISOString().split('T')[0];
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    { data: todayAtt },
    { count: monthDays },
    { count: leaveQuotaUsed },
    { data: profile },
    { count: pendingMine },
  ] = await Promise.all([
    supabase.from('attendance').select('*').eq('user_id', user.id).eq('date', today).maybeSingle(),
    supabase
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('date', monthStart.toISOString().split('T')[0]),
    supabase
      .from('leaves')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('type', 'annual')
      .in('status', ['approved']),
    supabase.from('profiles').select('leave_quota').eq('id', user.id).single(),
    supabase
      .from('leaves')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'pending'),
  ]);

  return {
    today_status: todayAtt?.status ?? 'not_clocked_in',
    check_in: todayAtt?.check_in ?? null,
    check_out: todayAtt?.check_out ?? null,
    month_attendance: monthDays ?? 0,
    leave_quota_used: leaveQuotaUsed ?? 0,
    leave_quota_total: profile?.leave_quota ?? 12,
    pending_requests: pendingMine ?? 0,
  };
}
