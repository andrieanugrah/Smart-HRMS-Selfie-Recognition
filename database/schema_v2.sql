-- Smart HRMS Database Schema v2 (Extension)
-- Run this SQL in Supabase SQL Editor to add Shift, Payroll, Reimbursement, and Announcement tables

-- 1. SHIFTS
CREATE TABLE IF NOT EXISTS shifts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  start_time            TIME NOT NULL,
  end_time              TIME NOT NULL,
  grace_period_minutes  INTEGER DEFAULT 15,
  is_active             BOOLEAN DEFAULT true,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

-- Seed default shifts if empty
INSERT INTO shifts (name, start_time, end_time, grace_period_minutes)
SELECT 'Shift Normal (Pagi)', '08:00:00', '17:00:00', 15
WHERE NOT EXISTS (SELECT 1 FROM shifts WHERE name = 'Shift Normal (Pagi)');

INSERT INTO shifts (name, start_time, end_time, grace_period_minutes)
SELECT 'Shift Siang', '13:00:00', '21:00:00', 15
WHERE NOT EXISTS (SELECT 1 FROM shifts WHERE name = 'Shift Siang');

INSERT INTO shifts (name, start_time, end_time, grace_period_minutes)
SELECT 'Shift Malam', '21:00:00', '06:00:00', 10
WHERE NOT EXISTS (SELECT 1 FROM shifts WHERE name = 'Shift Malam');

-- 2. USER SHIFTS (Penugasan Shift per Karyawan)
CREATE TABLE IF NOT EXISTS user_shifts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shift_id      UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- 3. SALARY COMPONENTS (Komponen Gaji Karyawan)
CREATE TABLE IF NOT EXISTS salary_components (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  base_salary             NUMERIC(12, 2) NOT NULL DEFAULT 0,
  allowance               NUMERIC(12, 2) NOT NULL DEFAULT 0,
  overtime_rate_per_hour  NUMERIC(12, 2) NOT NULL DEFAULT 0,
  late_penalty_per_minute NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

-- 4. PAYROLLS (Slip Gaji Bulanan)
CREATE TABLE IF NOT EXISTS payrolls (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  month               INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year                INTEGER NOT NULL,
  base_salary         NUMERIC(12, 2) NOT NULL DEFAULT 0,
  allowance           NUMERIC(12, 2) NOT NULL DEFAULT 0,
  overtime_pay        NUMERIC(12, 2) NOT NULL DEFAULT 0,
  late_deduction      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  absence_deduction   NUMERIC(12, 2) NOT NULL DEFAULT 0,
  net_salary          NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'paid')),
  generated_at        TIMESTAMPTZ DEFAULT now(),
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, month, year)
);

-- 5. REIMBURSEMENTS (Klaim Biaya Operasional/Medis)
CREATE TABLE IF NOT EXISTS reimbursements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category          TEXT NOT NULL CHECK (category IN ('medical', 'transport', 'operational', 'meal', 'other')),
  amount            NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  date              DATE NOT NULL DEFAULT CURRENT_DATE,
  description       TEXT NOT NULL,
  receipt_url       TEXT,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by       UUID REFERENCES profiles(id),
  approved_at       TIMESTAMPTZ,
  rejection_reason  TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- 6. ANNOUNCEMENTS (Papan Pengumuman Perusahaan)
CREATE TABLE IF NOT EXISTS announcements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  urgency     TEXT NOT NULL DEFAULT 'info' CHECK (urgency IN ('info', 'warning', 'urgent')),
  is_pinned   BOOLEAN DEFAULT false,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Seed starter announcement
INSERT INTO announcements (author_id, title, content, urgency, is_pinned)
SELECT id, 'Selamat Datang di Smart HRMS 2.0', 'Platform HRMS telah diperbarui dengan modul Shift Kerja, Payroll Digital, Reimbursement, dan Papan Pengumuman.', 'info', true
FROM profiles WHERE role IN ('hrd', 'admin') LIMIT 1;
