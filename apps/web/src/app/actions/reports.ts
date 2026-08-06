'use server';

import type { DepartmentAnalytics } from 'shared';
import { requireRole, getSupabaseAdmin } from './_utils';

export async function getDepartmentAnalytics(): Promise<DepartmentAnalytics[]> {
  await requireRole(['hrd', 'admin']);
  const supabase = getSupabaseAdmin();

  // Fetch profiles grouped by department
  const { data: profiles, error: profError } = await supabase
    .from('profiles')
    .select('id, department')
    .eq('is_active', true);

  if (profError || !profiles) {
    console.error('[getDepartmentAnalytics] error fetching profiles:', profError?.message);
    return [];
  }

  // Get start & end of current month
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const startDate = `${year}-${month}-01`;
  const endDate = `${year}-${month}-${new Date(year, now.getMonth() + 1, 0).getDate()}`;

  // Fetch attendance records for this month
  const { data: attendance } = await supabase
    .from('attendance')
    .select('user_id, status')
    .gte('date', startDate)
    .lte('date', endDate);

  // Fetch leaves for this month
  const { data: leaves } = await supabase
    .from('leaves')
    .select('user_id')
    .eq('status', 'approved')
    .gte('start_date', startDate)
    .lte('start_date', endDate);

  // Fetch overtimes for this month
  const { data: overtimes } = await supabase
    .from('overtimes')
    .select('user_id, total_hours')
    .eq('status', 'approved')
    .gte('date', startDate)
    .lte('date', endDate);

  // Map user ID to department
  const userDeptMap: Record<string, string> = {};
  const deptCounts: Record<string, number> = {};

  for (const p of profiles) {
    const dept = p.department || 'Umum';
    userDeptMap[p.id] = dept;
    deptCounts[dept] = (deptCounts[dept] || 0) + 1;
  }

  const deptMap: Record<
    string,
    {
      total_employees: number;
      present_records: number;
      late_count: number;
      leave_count: number;
      overtime_hours: number;
    }
  > = {};

  for (const dept of Object.keys(deptCounts)) {
    deptMap[dept] = {
      total_employees: deptCounts[dept],
      present_records: 0,
      late_count: 0,
      leave_count: 0,
      overtime_hours: 0,
    };
  }

  // Process attendance
  for (const att of attendance ?? []) {
    const dept = userDeptMap[att.user_id] || 'Umum';
    if (!deptMap[dept]) continue;
    if (att.status === 'present' || att.status === 'late') {
      deptMap[dept].present_records += 1;
    }
    if (att.status === 'late') {
      deptMap[dept].late_count += 1;
    }
  }

  // Process leaves
  for (const l of leaves ?? []) {
    const dept = userDeptMap[l.user_id] || 'Umum';
    if (deptMap[dept]) {
      deptMap[dept].leave_count += 1;
    }
  }

  // Process overtimes
  for (const ot of overtimes ?? []) {
    const dept = userDeptMap[ot.user_id] || 'Umum';
    if (deptMap[dept]) {
      deptMap[dept].overtime_hours += ot.total_hours || 0;
    }
  }

  const result: DepartmentAnalytics[] = Object.keys(deptMap).map((dept) => {
    const item = deptMap[dept];
    // Workdays estimate (e.g. 20 days/month)
    const expectedAttendance = item.total_employees * 20;
    const rate = expectedAttendance > 0
      ? Math.min(100, Math.round((item.present_records / expectedAttendance) * 100))
      : 0;

    return {
      department: dept,
      total_employees: item.total_employees,
      attendance_rate: rate,
      late_count: item.late_count,
      leave_count: item.leave_count,
      overtime_hours: Math.round(item.overtime_hours * 10) / 10,
    };
  });

  return result;
}
