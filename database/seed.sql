-- Smart HRMS Seed Data
--
-- 1. Jalankan `database/schema.sql` terlebih dahulu di Supabase SQL Editor.
-- 2. Buat akun demo dengan menjalankan dari root project:
--      npm run seed:users
--    Atau dari apps/server:
--      npm run seed:users
--    Pastikan root `.env` berisi NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY.
--
-- Akun demo yang akan dibuat:
--   hr@company.com      (HRD)      password: 123456
--   employee@company.com (Employee) password: 123456

-- ─── Required Profile Columns (idempotent) ─────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS leave_quota INTEGER DEFAULT 12;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_encrypted BOOLEAN DEFAULT false;

-- ─── Sample Leave Requests (run AFTER running seed:users) ──────────────
-- INSERT INTO leaves (user_id, type, start_date, end_date, reason, status) VALUES
--   ('<employee-uuid>', 'annual', '2026-08-01', '2026-08-03', 'Liburan keluarga', 'pending'),
--   ('<employee-uuid>', 'sick', '2026-07-20', '2026-07-21', 'Demam', 'approved');

-- ─── Sample Overtime ─────────────────────────────────────────────────
-- INSERT INTO overtimes (user_id, date, start_time, end_time, total_hours, reason, status) VALUES
--   ('<employee-uuid>', '2026-07-18', '18:00', '21:00', 3, 'Deploy production release', 'pending');

-- ─── Storage buckets (idempotent) ──────────────────────────────────────
INSERT INTO storage.buckets (id, name, public) VALUES
  ('selfies', 'selfies', true),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- ─── Backfill app_metadata.role untuk user auth yang sudah ada ─────────
UPDATE auth.users u
SET raw_app_meta_data =
  coalesce(u.raw_app_meta_data, '{}'::jsonb) ||
  jsonb_build_object('role', p.role)
FROM public.profiles p
WHERE p.id = u.id
  AND (u.raw_app_meta_data ->> 'role') IS DISTINCT FROM p.role;
