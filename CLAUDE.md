# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Web (Next.js port 3000)
npm run dev:server   # Backend (Express + Socket.io port 5000)
npm run build        # Build all: shared → web → server
npm run lint         # Next lint (web only)
```

Install: `npm install --legacy-peer-deps`

No test runner configured yet. Server builds with `tsc`, dev server hot-reloads via `tsx watch`.

## Architecture

Monorepo (npm workspaces) with 2 apps + 1 shared package.

```
apps/
  web/          # Next.js 16 (App Router, Tailwind v4, Framer Motion)
  server/       # Express + Socket.io sidecar for real-time
packages/
  shared/       # TS types, constants, DB schema-as-code
database/
  schema.sql    # Supabase DDL (run in Supabase SQL Editor)
  seed.sql      # Demo data (run after creating Auth users)
```

### Web app structure (`apps/web/src/app/`)

```
[portal]/       # Dynamic route: employee | hrd
  dashboard/    # Stats + quick actions
  attendance/   # Employee: selfie clock in/out. HRD: attendance report
  leave/        # Employee: submit. HRD: approve/reject
  overtime/     # Employee: submit. HRD: approve/reject
  employees/    # HRD-only employee list
  profile/      # Employee profile + face registration
  layout.tsx    # Portal layout (sidebar, route guard)
login/          # Credentials login with demo account quick-fill
api/auth/       # NextAuth route handler
page.tsx        # Landing page (redirects authed users to dashboard)
```

### Shared package (`packages/shared/src/`)

- `types.ts` — Profile, Attendance, Leave, Overtime, Notification, FaceDescriptor, DashboardStats
- `constants.ts` — ROLES, ATTENDANCE_STATUSES, LEAVE_TYPES, REQUEST_STATUSES, nav link configs
- `database-schema.ts` — SQL as TS string (mirrors schema.sql, includes RLS + seed)

### Key data flow

1. **Auth**: NextAuth Credentials provider → `supabase.auth.signInWithPassword` → fetch `profiles` table → JWT token with `id` + `role` in session
2. **Face recognition**: face-api.js models loaded client-side from `/public/models/` → `detectFace()` returns `Float32Array` descriptor → stored as `number[]` in `face_descriptors` JSONB column → `compareDescriptors()` distance check against threshold (default 0.6)
3. **Attendance**: check-in with selfie capture → face match against registered descriptor → geolocation validation (Jakarta office, 100m radius) → upsert `attendance` row
4. **Real-time**: Socket.io sidecar has `/hrd` (dashboard live updates) and `/user` (per-user notifications) namespaces

### UI components (`apps/web/src/components/ui/`)

Custom components (no shadcn): Button, Card, Input, Badge, StatusBadge, EmptyState, StatCard, Avatar. Styled via `globals.css` `@theme` tokens (primary/teal, semantic colors, custom radii).

### Auth helpers (`apps/web/src/lib/auth/config.ts`)

`getUserRole(session)` and `hasRole(session, roles[])` for route/component guards. Portal layout reads role from session JWT.

### Face API lib (`apps/web/src/lib/face-api/`)

- `load-models.ts` — loads tinyFaceDetector, faceLandmark68Net, faceRecognitionNet (once, cached)
- `detect-face.ts` — detectSingleFace with TinyFaceDetectorOptions(inputSize 224), serialization helpers
- `compare-face.ts` — euclideanDistance between Float32Array descriptors

### Supabase clients

- `client.ts` — browser client (`createBrowserClient`)
- `server.ts` — server component client (`createServerClient` with cookie handling)

### Database (Supabase + PostgreSQL)

6 tables: `profiles`, `face_descriptors`, `attendance`, `leaves`, `overtimes`, `notifications`. RLS enabled in code but warning says "disabled for dev" in schema.sql. Indexes on user+date lookups. `face_descriptors` stores descriptors as JSONB (Float32Array serialized to number[]). Attendance has UNIQUE(user_id, date) constraint.

### Important setup notes

- face-api.js model weights must be placed in `apps/web/public/models/` (6 files from [face-api.js weights repo](https://github.com/justadudewhohacks/face-api.js/tree/master/weights))
- Supabase Auth users must exist before profile rows (auth.users FK constraint)
- `.env` at root, `.env.local` in apps/web — same env vars
- RLS policies not yet configured (dev mode)
