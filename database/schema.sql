-- Smart HRMS Database Schema
-- Run this SQL in Supabase SQL Editor

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL UNIQUE,
  full_name   TEXT NOT NULL,
  nip         TEXT UNIQUE,
  phone       TEXT,
  role        TEXT NOT NULL CHECK (role IN ('employee', 'hrd', 'admin')),
  department  TEXT,
  position    TEXT,
  avatar_url  TEXT,
  leave_quota INTEGER DEFAULT 12,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 2. FACE DESCRIPTORS
CREATE TABLE IF NOT EXISTS face_descriptors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  descriptor    JSONB NOT NULL,
  image_url     TEXT,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- 3. ATTENDANCE
CREATE TABLE IF NOT EXISTS attendance (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in      TIMESTAMPTZ NOT NULL DEFAULT now(),
  check_out     TIMESTAMPTZ,
  selfie_url    TEXT,
  selfie_match  BOOLEAN,
  confidence    REAL,
  status        TEXT NOT NULL DEFAULT 'present'
                CHECK (status IN ('present', 'late', 'absent', 'half_day')),
  location      JSONB,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- 4. LEAVES (cuti & izin)
CREATE TABLE IF NOT EXISTS leaves (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('annual', 'sick', 'personal', 'maternity', 'other')),
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  reason          TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by     UUID REFERENCES profiles(id),
  approved_at     TIMESTAMPTZ,
  rejection_reason TEXT,
  attachment_url  TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  CHECK (end_date >= start_date)
);

-- 5. OVERTIMES
CREATE TABLE IF NOT EXISTS overtimes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  total_hours     REAL NOT NULL,
  reason          TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by     UUID REFERENCES profiles(id),
  approved_at     TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  CHECK (end_time > start_time)
);

-- 6. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  message       TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'info'
                CHECK (type IN ('info', 'approval', 'rejection', 'attendance')),
  reference_id  UUID,
  reference_type TEXT,
  is_read       BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_leaves_user ON leaves(user_id);
CREATE INDEX IF NOT EXISTS idx_leaves_status ON leaves(status);
CREATE INDEX IF NOT EXISTS idx_overtimes_user ON overtimes(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

-- ── Row Level Security ──
-- Reset bersih: hapus semua policy lama + function helper sebelum recreate.
DROP POLICY IF EXISTS profiles_self_read  ON profiles;
DROP POLICY IF EXISTS profiles_hrd_read    ON profiles;
DROP POLICY IF EXISTS profiles_hrd_modify  ON profiles;
DROP POLICY IF EXISTS profiles_hrd_all     ON profiles;
DROP POLICY IF EXISTS face_self            ON face_descriptors;
DROP POLICY IF EXISTS face_hrd             ON face_descriptors;
DROP POLICY IF EXISTS attendance_self      ON attendance;
DROP POLICY IF EXISTS attendance_hrd       ON attendance;
DROP POLICY IF EXISTS leaves_self          ON leaves;
DROP POLICY IF EXISTS leaves_hrd           ON leaves;
DROP POLICY IF EXISTS overtimes_self       ON overtimes;
DROP POLICY IF EXISTS overtimes_hrd        ON overtimes;
DROP POLICY IF EXISTS notifications_self   ON notifications;

DROP FUNCTION IF EXISTS public.is_hrd(uuid);

DO $$
BEGIN
  ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
  ALTER TABLE face_descriptors ENABLE ROW LEVEL SECURITY;
  ALTER TABLE attendance       ENABLE ROW LEVEL SECURITY;
  ALTER TABLE leaves           ENABLE ROW LEVEL SECURITY;
  ALTER TABLE overtimes        ENABLE ROW LEVEL SECURITY;
  ALTER TABLE notifications    ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Helper: cek role user dari JWT (app_metadata) sehingga policy tidak
-- menyentuh tabel profiles lagi. Recursion teratasi karena role disimpan
-- di auth.users.raw_app_meta_data, bukan di profiles.
-- auth.jwt() -> 'app_metadata' ->> 'role' mengembalikan string role user.
-- Penting: nilai role harus diset saat membuat user via
-- admin.auth.admin.createUser({ app_metadata: { role: 'hrd' } }).

-- profiles: user bisa baca miliknya sendiri; HRD/admin baca semua.
DROP POLICY IF EXISTS profiles_self_read ON profiles;
CREATE POLICY profiles_self_read ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS profiles_hrd_read ON profiles;
CREATE POLICY profiles_hrd_read ON profiles
  FOR SELECT USING (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('hrd','admin')
  );

DROP POLICY IF EXISTS profiles_hrd_modify ON profiles;
CREATE POLICY profiles_hrd_modify ON profiles
  FOR ALL USING (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('hrd','admin')
  ) WITH CHECK (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('hrd','admin')
  );

-- face_descriptors: user miliknya; HRD/admin semua.
DROP POLICY IF EXISTS face_self ON face_descriptors;
CREATE POLICY face_self ON face_descriptors
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS face_hrd ON face_descriptors;
CREATE POLICY face_hrd ON face_descriptors
  FOR ALL USING (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('hrd','admin')
  ) WITH CHECK (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('hrd','admin')
  );

-- attendance: user miliknya; HRD/admin semua.
DROP POLICY IF EXISTS attendance_self ON attendance;
CREATE POLICY attendance_self ON attendance
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS attendance_hrd ON attendance;
CREATE POLICY attendance_hrd ON attendance
  FOR ALL USING (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('hrd','admin')
  ) WITH CHECK (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('hrd','admin')
  );

-- leaves: user miliknya; HRD/admin semua.
DROP POLICY IF EXISTS leaves_self ON leaves;
CREATE POLICY leaves_self ON leaves
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS leaves_hrd ON leaves;
CREATE POLICY leaves_hrd ON leaves
  FOR ALL USING (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('hrd','admin')
  ) WITH CHECK (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('hrd','admin')
  );

-- overtimes: user miliknya; HRD/admin semua.
DROP POLICY IF EXISTS overtimes_self ON overtimes;
CREATE POLICY overtimes_self ON overtimes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS overtimes_hrd ON overtimes;
CREATE POLICY overtimes_hrd ON overtimes
  FOR ALL USING (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('hrd','admin')
  ) WITH CHECK (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('hrd','admin')
  );

-- notifications: hanya user pemilik.
DROP POLICY IF EXISTS notifications_self ON notifications;
CREATE POLICY notifications_self ON notifications
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- NOTE: RLS aktif dengan policy sederhana. Server actions memakai service-role,
-- sehingga otorisasi tetap dijaga di requireRole() di level aplikasi.
-- Idempotent: aman dijalankan berulang.
-- See: https://supabase.com/docs/guides/auth/row-level-security

-- 7. SUPABASE STORAGE BUCKET 'selfies'
INSERT INTO storage.buckets (id, name, public)
VALUES ('selfies', 'selfies', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Read Access for Selfies"
ON storage.objects FOR SELECT
USING (bucket_id = 'selfies');

CREATE POLICY "Authenticated Users Upload Selfies"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'selfies' AND auth.role() = 'authenticated');

