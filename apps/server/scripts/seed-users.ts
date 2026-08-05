import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const seedPassword = process.env.SEED_PASSWORD;

if (!url || !serviceKey || !seedPassword) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, dan SEED_PASSWORD harus di-set di .env');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const USERS = [
  {
    email: 'hr@company.com',
    password: seedPassword,
    full_name: 'Siti Rahmadhani',
    nip: 'HRD-001',
    role: 'hrd' as const,
    department: 'Human Resources',
    position: 'HR Manager',
  },
  {
    email: 'employee@company.com',
    password: seedPassword,
    full_name: 'Budi Santoso',
    nip: 'EMP-001',
    role: 'employee' as const,
    department: 'Engineering',
    position: 'Software Engineer',
  },
];

async function seed() {
  for (const u of USERS) {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', u.email)
      .maybeSingle();

    if (existing) {
      console.log(`[skip] ${u.email} sudah ada`);
      continue;
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.full_name },
      app_metadata: { role: u.role },
    });

    if (authError || !authData.user) {
      console.error(`[fail] ${u.email}:`, authError?.message);
      continue;
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      email: u.email,
      full_name: u.full_name,
      nip: u.nip,
      role: u.role,
      department: u.department,
      position: u.position,
      leave_quota: 12,
      annual_leave_quota: 12,
      used_leave_days: 0,
      is_active: true,
    });

    if (profileError) {
      console.error(`[fail] profile ${u.email}:`, profileError.message);
      await supabase.auth.admin.deleteUser(authData.user.id).catch(() => undefined);
      continue;
    }

    console.log(`[ok] ${u.role}: ${u.email} / ${u.password}`);
  }
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
