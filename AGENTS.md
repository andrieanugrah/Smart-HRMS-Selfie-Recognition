# AGENTS.md — Smart HRMS & Selfie Recognition

## Repo topology
- Monorepo via npm workspaces: `apps/web`, `apps/server`, `packages/shared`
- Build order: `shared` first, then `web` + `server` (root `build` script does this)
- `shared` is consumed as source (no build step needed in dev — `"main": "./src/index.ts"`)

## Commands
```bash
npm install --legacy-peer-deps   # REQUIRED — React 19 peer conflicts
npm run dev                       # Next.js web only (port 3000)
npm run dev:server                # Express + Socket.io (port 5000, separate terminal)
npm run build                     # shared → web → server
npm run build:shared              # shared only
npm run build:web                 # web only
npm run build:server              # server only
npm run lint                      # next lint in apps/web (only lint target)
npm run seed:users                # creates demo accounts in Supabase
```

**No test suite exists.** There is no `test` script, no test framework configured.

## Environment setup
1. `cp .env.example .env` (root — used by server via `dotenv` resolving `../../../../.env`)
2. `cp .env.example apps/web/.env.local` (Next.js reads this)
3. Run `database/schema.sql` in Supabase SQL Editor (DDL + RLS + selfies bucket)
4. Optionally run `database/seed.sql` for starter roles/profiles

Required env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `INTERNAL_SOCKET_SECRET`, `NEXT_PUBLIC_SOCKET_URL`, `SOCKET_INTERNAL_URL`, `SERVER_PORT`, `FACE_MATCH_THRESHOLD`, `NEXT_PUBLIC_FACE_MATCH_THRESHOLD`, `FACE_ENCRYPTION_KEY`, `OFFICE_LAT/LNG/RADIUS_METERS` (and their `NEXT_PUBLIC_` variants). Also set `NEXT_PUBLIC_APP_URL` (used by the server's CORS; defaults to `http://localhost:3000`).

## Architecture

### Auth flow
- **NextAuth.js v4**, Credentials provider, JWT session strategy (7-day expiry)
- Sign-in calls Supabase Auth with service role key, then reads `profiles` table for role/department
- `requireUser()` / `requireRole()` guards in `apps/web/src/app/actions/_utils.ts` enforce app-level authorization
- Login page at `/login`; session check in `[portal]/layout.tsx` redirects unauthenticated users

### Server Actions → Supabase
- **ALL server actions use `getSupabaseAdmin()`** (service role key, bypasses RLS)
- Do NOT use `createServerSupabaseClient()` (SSR cookie client) for data mutations — that exists only for NextAuth
- Auth is enforced at the server action level via `requireRole()`, not via RLS
- RLS policies exist in `schema.sql` but are NOT enforced for server actions — `getSupabaseAdmin()` uses service role key, which bypasses RLS entirely. All authorization gates are at the application level. Treat RLS policies as stale documentation of intent, not active security controls.

### Socket.io sidecar (real-time notifications)
- Express server at port 5000 has two namespaces: `/hrd` (broadcast) and `/user` (targeted rooms)
- Next.js Server Actions emit events via HTTP POST to `SOCKET_INTERNAL_URL/emit/:namespace` with `x-internal-secret` header
- Socket emit is fire-and-forget (best-effort, 1.5s timeout) — must never block the main action path
- Users join their room by emitting `join` event with their user ID on namespace `/user`

### Route structure
- `apps/web/src/app/[portal]/` — shared layout for both roles, resolves `portal` param from URL
- `employee` and `hrd` are the only valid portal values; `admin` role is routed to `hrd` portal
- Wrong portal segment redirects user to their correct portal (not to login)
- Employee subpages: `/employee/dashboard`, `/employee/attendance`, `/employee/leave`, `/employee/overtime`, `/employee/profile`, `/employee/reports`
- HRD subpages: `/hrd/dashboard`, `/hrd/attendance`, `/hrd/leave`, `/hrd/overtime`, `/hrd/employees`, `/hrd/reports`

### Face recognition (client-side only)
- face-api.js models at `apps/web/public/models/` — 3 model files with weight shards
- `apps/web/src/lib/face-api/load-models.ts` — lazy loads TensorFlow backend (CPU), then loads models
- Face matching uses Euclidean distance between 128-d descriptors stored as JSONB in `face_descriptors` table
- Matching threshold from env `FACE_MATCH_THRESHOLD` (default 0.6, lower = stricter)

### Database tables
`profiles`, `face_descriptors`, `attendance` (unique on `user_id, date`), `leaves`, `overtimes`, `notifications` + storage bucket `selfies` (public read, authenticated upload).

## Tech stack notes
- **Next.js 16** (App Router), **Tailwind CSS v4** via `@tailwindcss/postcss` (no `tailwind.config.js`; config in CSS with `@theme`)
- **React 19**, TypeScript 5.7
- Path alias `@/*` → `apps/web/src/*`
- UI primitives: Radix UI (`@radix-ui/react-*`), `class-variance-authority`, `clsx`, `tailwind-merge`
- `next.config.ts` transpiles `shared` package, optimizes framer-motion/lucide-react/date-fns imports
- `server-only` import in server actions for compile-time safety
- `apps/web/src/lib/utils.ts` exports the `cn()` helper (clsx + tailwind-merge)

## Gotchas
- `npm install` without `--legacy-peer-deps` will fail due to React 19 and next-auth peer conflicts
- The server's `dotenv` path is `../../../../.env` relative to its compiled output in `dist/` — make sure root `.env` exists
- Server actions use service role key — never use them for user-authenticated Supabase calls that should respect RLS
- face-api.js model files are git-tracked binary files — they must exist in `apps/web/public/models/` for the face recognition feature to function
- The `[portal]` route group catches `/employee/*` and `/hrd/*` — adding a new top-level route should go outside this group
- No migration tool; `schema.sql` is idempotent (drops/recreates policies with IF EXISTS)
