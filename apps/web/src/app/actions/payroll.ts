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
import { logAudit } from './_audit';

const salaryComponentSchema = z.object({
  user_id: z.string().uuid(),
  base_salary: z.number().min(0),
  allowance: z.number().min(0),
  overtime_rate_per_hour: z.number().min(0),
  late_penalty_per_minute: z.number().min(0),
});

export async function upsertSalaryComponent(input: z.infer<typeof salaryComponentSchema>): Promise<ActionResult> {
  try {
    await requireRole(['hrd', 'admin']);
    const parsed = salaryComponentSchema.parse(input);
    const supabase = await getSupabase();

    const { data, error } = await supabase
      .from('salary_components')
      .upsert(
        {
          user_id: parsed.user_id,
          base_salary: parsed.base_salary,
          allowance: parsed.allowance,
          overtime_rate_per_hour: parsed.overtime_rate_per_hour,
          late_penalty_per_minute: parsed.late_penalty_per_minute,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) return fail(error.message);
    revalidatePath('/[portal]/payroll', 'page');
    return ok(data);
  } catch (e) {
    return handleError(e, 'Gagal menyimpan komponen gaji');
  }
}

export async function listSalaryComponents() {
  await requireRole(['hrd', 'admin']);
  const supabase = await getSupabase();
  const { data } = await supabase
    .from('salary_components')
    .select('*, profiles:salary_components_user_id_fkey(full_name, nip, department)');
  return data ?? [];
}

export async function generateMonthlyPayroll(input: {
  month: number;
  year: number;
}): Promise<ActionResult<{ count: number }>> {
  try {
    await requireRole(['hrd', 'admin']);
    const { month, year } = input;
    const supabase = await getSupabase();

    // Get all active employees
    const { data: employees } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('is_active', true);

    if (!employees || employees.length === 0) return fail('Tidak ada karyawan aktif');

    const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0);
    const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

    let count = 0;

    for (const emp of employees) {
      // Get salary component
      const { data: comp } = await supabase
        .from('salary_components')
        .select('*')
        .eq('user_id', emp.id)
        .maybeSingle();

      const baseSalary = Number(comp?.base_salary ?? 3500000);
      const allowance = Number(comp?.allowance ?? 500000);
      const overtimeRate = Number(comp?.overtime_rate_per_hour ?? 25000);
      const latePenaltyPerMin = Number(comp?.late_penalty_per_minute ?? 500);

      // Get approved overtimes
      const { data: overtimes } = await supabase
        .from('overtimes')
        .select('total_hours')
        .eq('user_id', emp.id)
        .eq('status', 'approved')
        .gte('date', startDateStr)
        .lte('date', endDateStr);

      const totalOvertimeHours = (overtimes ?? []).reduce((acc, curr) => acc + (curr.total_hours || 0), 0);
      const overtimePay = totalOvertimeHours * overtimeRate;

      // Get late attendance records
      const { data: lateRecords } = await supabase
        .from('attendance')
        .select('check_in, date')
        .eq('user_id', emp.id)
        .eq('status', 'late')
        .gte('date', startDateStr)
        .lte('date', endDateStr);

      // Estimate 30 mins late average per late record for deduction calculation
      const lateCount = (lateRecords ?? []).length;
      const lateDeduction = lateCount * 30 * latePenaltyPerMin;

      const netSalary = Math.max(0, baseSalary + allowance + overtimePay - lateDeduction);

      await supabase.from('payrolls').upsert(
        {
          user_id: emp.id,
          month,
          year,
          base_salary: baseSalary,
          allowance,
          overtime_pay: overtimePay,
          late_deduction: lateDeduction,
          absence_deduction: 0,
          net_salary: netSalary,
          status: 'published',
          generated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,month,year' }
      );

      count++;
    }

    const user = await requireRole(['hrd', 'admin']);
    void logAudit({
      actor_id: user.id,
      actor_email: user.email,
      actor_role: user.role,
      action: 'payroll:generate',
      resource_type: 'payroll',
      details: { month, year, generated_count: count },
    });

    revalidatePath('/[portal]/payroll', 'page');
    return ok({ count });
  } catch (e) {
    return handleError(e, 'Gagal menggenerasi slip gaji bulanan');
  }
}

export async function listPayrolls(month?: number, year?: number) {
  await requireRole(['hrd', 'admin']);
  const supabase = await getSupabase();
  let q = supabase
    .from('payrolls')
    .select('*, profiles:payrolls_user_id_fkey(full_name, nip, department, position)')
    .order('year', { ascending: false })
    .order('month', { ascending: false });

  if (month) q = q.eq('month', month);
  if (year) q = q.eq('year', year);

  const { data } = await q;
  return data ?? [];
}

export async function getMyPayrolls() {
  const user = await requireUser();
  const supabase = await getSupabase();
  const { data } = await supabase
    .from('payrolls')
    .select('*')
    .eq('user_id', user.id)
    .order('year', { ascending: false })
    .order('month', { ascending: false });
  return data ?? [];
}
