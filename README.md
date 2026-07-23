# Smart HRMS & Selfie Recognition

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## 🇬🇧 English

A web-based Human Resource Management System (HRMS) featuring facial recognition attendance, office geolocation radius validation, and real-time leave and overtime management.

### 🛠️ Tech Stack
- **Frontend**: Next.js 16 (App Router), Tailwind CSS v4, Framer Motion, Lucide Icons
- **Realtime Backend**: Express.js + Socket.io (Sidecar Server)
- **Database & Auth**: Supabase (PostgreSQL, Auth, Storage) + NextAuth.js (JWT)
- **Face Recognition**: face-api.js (Client-side TensorFlow.js vector matching)
- **Architecture**: Monorepo (npm workspaces)

### 📁 Monorepo Structure
```text
smart-hrms/
├── apps/
│   ├── web/          # Next.js 16 App Router (Port 3000)
│   └── server/       # Express + Socket.io Sidecar Server (Port 5000)
├── packages/
│   └── shared/       # Shared TypeScript types, constants & timezone utilities
├── database/
│   ├── schema.sql    # Supabase DDL, RLS policies & Storage bucket setup
│   └── seed.sql      # Seed data (roles & user profiles)
└── .env.example      # Environment variables template
```

### ✨ Key Features
#### 🧑‍💼 Employee Portal (`/employee/*`)
- **Selfie Attendance**: Clock-in & clock-out with 128-d face descriptor matching and office geolocation validation.
- **Leave Requests**: Annual & sick leave submission with automatic business day calculation and quota validation.
- **Overtime Requests**: Overtime hours submission and tracking.
- **Biometric Profile**: Face descriptor sample registration on user profile.

#### 👨‍💼 HRD Portal (`/hrd/*`)
- **Real-time Dashboard**: Live daily attendance stats, visual analytics, and pending approval queues.
- **Attendance Records**: Visual audit logs of employee selfie photos and punctuality status.
- **Approval Management**: Atomic approval/rejection for leave and overtime requests with race condition protection.
- **Employee Management**: Manage user profiles, departments, roles, and biometric resets.

### 🚀 Quick Start
1. **Install Dependencies**
   ```bash
   npm install --legacy-peer-deps
   ```
2. **Configure Environment Variables**
   ```bash
   cp .env.example .env
   cp .env.example apps/web/.env.local
   ```
3. **Setup Database & Storage**: Run [database/schema.sql](database/schema.sql) in Supabase SQL Editor.
4. **Run Application**
   ```bash
   npm run dev
   ```

---

<a name="bahasa-indonesia"></a>
## 🇮🇩 Bahasa Indonesia

Aplikasi Sistem Informasi SDM (HRMS) berbasis web dengan fitur presensi wajah (Face Recognition), validasi lokasi kantor (Geolocation Radius), serta manajemen cuti & lembur secara real-time.

### 🛠️ Tech Stack
- **Frontend**: Next.js 16 (App Router), Tailwind CSS v4, Framer Motion, Lucide Icons
- **Backend Realtime**: Express.js + Socket.io (Sidecar Server)
- **Database & Auth**: Supabase (PostgreSQL, Auth, Storage) + NextAuth.js (JWT)
- **Face Recognition**: face-api.js (Client-side TensorFlow.js vector matching)
- **Arsitektur**: Monorepo (npm workspaces)

### ✨ Fitur Utama
#### 🧑‍💼 Portal Karyawan (`/employee/*`)
- **Presensi Selfie AI**: Check-in & Check-out menggunakan pencocokan vektor wajah 128-d & validasi radius kantor.
- **Pengajuan Cuti**: Pengajuan cuti tahunan/sakit dengan kalkulasi hari kerja otomatis & proteksi sisa kuota.
- **Pengajuan Lembur**: Tracking & pengajuan jam lembur kerja.
- **Registrasi Wajah**: Pengambilan sampel deskriptor biometrik wajah pada profil karyawan.

#### 👨‍💼 Portal HRD (`/hrd/*`)
- **Dashboard Real-time**: Statistik kehadiran harian, grafik absensi, & daftar antrean persetujuan.
- **Rekap Presensi & Selfie**: Audit foto bukti presensi karyawan beserta status terlambat/tepat waktu.
- **Manajemen Persetujuan**: Approval/Rejection cuti & lembur dengan pencegahan race condition.
- **Kelola Karyawan**: Manajemen akun, jabatan, departemen, & reset sampel wajah.

### 🚀 Cara Menjalankan
1. **Instal Dependensi**
   ```bash
   npm install --legacy-peer-deps
   ```
2. **Konfigurasi Environment Variables**
   ```bash
   cp .env.example .env
   cp .env.example apps/web/.env.local
   ```
3. **Setup Database & Storage**: Jalankan [database/schema.sql](database/schema.sql) pada Supabase SQL Editor.
4. **Menjalankan Dev Server**
   ```bash
   npm run dev
   ```
