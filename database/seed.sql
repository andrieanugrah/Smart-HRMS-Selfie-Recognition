-- Smart HRMS Seed Data
-- Note: For local dev with Supabase, you have two options:
--
-- OPTION A (Recommended for demo): Quick-create accounts via the Supabase dashboard
--   1. Dashboard → Authentication → Users → Add user (email confirm: auto)
--      Create: hr@company.com / password: 123456, role: HRD
--              employee@company.com / password: 123456, role: Employee
--   2. Get the UUIDs from the users list
--   3. Run the INSERT statements below (replace UUIDs)
--
-- OPTION B (Bulk seed) — run via psql with service-role key.

-- ─── Required Profile Columns ──────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS leave_quota INTEGER DEFAULT 12;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- ─── Helper: When you have a user UUID, insert profile like this ──────
-- INSERT INTO profiles (id, email, full_name, nip, role, department, position, leave_quota)
-- VALUES
--   ('00000000-0000-0000-0000-000000000001', 'hr@company.com', 'Siti Rahmadhani', 'HRD-001', 'hrd', 'Human Resources', 'HR Manager', 12),
--   ('00000000-0000-0000-0000-000000000002', 'employee@company.com', 'Budi Santoso', 'EMP-001', 'employee', 'Engineering', 'Software Engineer', 12)
-- ON CONFLICT (id) DO NOTHING;

-- ─── Sample Leave Requests (run AFTER inserting users) ───────────────
-- INSERT INTO leaves (user_id, type, start_date, end_date, reason, status) VALUES
--   ('00000000-0000-0000-0000-000000000002', 'annual', '2026-08-01', '2026-08-03', 'Liburan keluarga', 'pending'),
--   ('00000000-0000-0000-0000-000000000002', 'sick', '2026-07-20', '2026-07-21', 'Demam', 'approved');

-- ─── Sample Overtime ─────────────────────────────────────────────────
-- INSERT INTO overtimes (user_id, date, start_time, end_time, total_hours, reason, status) VALUES
--   ('00000000-0000-0000-0000-000000000002', '2026-07-18', '18:00', '21:00', 3, 'Deploy production release', 'pending');

-- ─── Storage buckets ─────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public) VALUES
  ('selfies', 'selfies', false)
ON CONFLICT (id) DO NOTHING;

-- ─── RLS Policies (optional, app uses service-role for writes) ───────
-- Currently RLS is DISABLED per schema.sql.
-- For production enable RLS, see: https://supabase.com/docs/guides/auth/row-level-security

-- ─── Storage policies for selfies bucket ─────────────────────────────
-- Reset bersih policy lama.
DROP POLICY IF EXISTS selfies_owner_all ON storage.objects;
DROP POLICY IF EXISTS selfies_hrd_read  ON storage.objects;

-- Owner: user dapat upload/read ke folder dengan nama user_id mereka.
CREATE POLICY selfies_owner_all ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'selfies'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'selfies'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- HRD/admin dapat membaca semua selfie untuk review.
-- Memakai auth.jwt() agar tidak membaca profiles (menghindari recursion).
DROP POLICY IF EXISTS selfies_hrd_read ON storage.objects;
CREATE POLICY selfies_hrd_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'selfies'
    AND coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('hrd','admin')
  );

-- ─── Backfill app_metadata.role untuk user auth yang sudah ada ───────
-- Jalankan sekali setelah schema.sql untuk memastikan user demo lama
-- memiliki role di JWT, sehingga policy baru mengenali HRD/admin.
-- Cocokkan dengan email profile agar konsisten.
UPDATE auth.users u
SET raw_app_meta_data =
  coalesce(u.raw_app_meta_data, '{}'::jsonb) ||
  jsonb_build_object('role', p.role)
FROM public.profiles p
WHERE p.id = u.id
  AND (u.raw_app_meta_data ->> 'role') IS DISTINCT FROM p.role;

-- ─── Note for Quick Demo Login ───────────────────────────────────────
-- The login page advertises these credentials:
--   hr@company.com      (HRD)
--   employee@company.com (Employee)
-- Both with password: 123456
--
-- IMPORTANT: Supabase Auth users must exist before profile rows.
-- Create them in Dashboard → Authentication → Users first.
