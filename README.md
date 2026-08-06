# Kivara — Luxury Tour Company Platform

A full-stack luxury travel platform for a Zambia-based tour company (brand: **Kivara**). It combines a public marketing site (properties, packages, experiences, destinations, journeys, blog) with a complete admin back office (bookings, finance, guest profiles, suppliers, content, AI-powered journey design) backed by Supabase.

## Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router) + React 19, TypeScript |
| Styling | Tailwind CSS v4, `tailwind-merge` + `clsx` (`cn`), framer-motion |
| Database / Auth / Storage | [Supabase](https://supabase.com) (Postgres + RLS, Auth, Storage) — 14 migrations |
| Admin UI | Tiptap rich text, Recharts dashboards, lucide-react icons |
| Documents | `@react-pdf/renderer` (quote & invoice PDFs), iCal exports |
| AI concierge | OpenRouter (journey engine, guest profiler, quote engine, sales funnel) |
| Email | Brevo (`@getbrevo/brevo`) transactional |
| E2E | Playwright (`e2e/`) |

## Getting Started

### 1. Environment variables

Copy the template and fill in real values — **never** commit `.env.local` (it is gitignored):

```bash
cp .env.example .env.local
```

All variables are documented inline in [`.env.example`](.env.example). Required at minimum:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase project URL + anon key
- `SUPABASE_SERVICE_ROLE_KEY` — server-only key powering the admin panel, data merges, documents, and AI workflows
- `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SITE_PHONE`, `NEXT_PUBLIC_WHATSAPP_NUMBER`, `NEXT_PUBLIC_GA_ID` — site identity
- `OPENROUTER_API_KEY` — AI concierge
- `NEXT_BREVO_KEY` — transactional email
- `CRON_SECRET`, `ADMIN_SEED_SECRET` — protect cron + seed endpoints

The build does not require env vars to succeed — missing variables only fail (with a descriptive error) when the related code path is actually used.

### 2. Database

Apply the migrations in order against your Supabase project (or run `supabase db push` from the `supabase/` folder):

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

The schema covers: properties, packages, experiences, destinations, journeys, guest profiles, bookings (incl. provisional holds + deposit tracking), finance (expenses, invoices, transactions), media, blog/journal posts, audit log, platform settings, admin profiles (with RLS).

### 3. Run

```bash
npm install
npm run dev        # http://localhost:3000
```

Other scripts:

```bash
npm run build      # production build (next build --webpack)
npm run start      # serve the production build
npm run lint       # ESLint (project is lint-clean: 0 problems)
```

### 4. Seed the admin user

Seed a first admin profile (used by the `requireAdmin` guard on every admin API route):

```bash
curl -X POST http://localhost:3000/api/admin/seed \
  -H "Content-Type: application/json" \
  -H "x-admin-seed-secret: <ADMIN_SEED_SECRET>" \
  -d '{"email":"you@example.com","password":"a-strong-password"}'
```

## Project Structure

```
src/
├── app/
│   ├── (public pages)      home, properties, packages, experiences, destinations,
│   │                       journeys, blog, faq, south-luangwa, contact…
│   ├── admin/              private admin panel (see below)
│   ├── api/
│   │   ├── admin/          CRUD APIs (all guarded by requireAdmin)
│   │   ├── ai/             AI concierge endpoints (workflow, orchestrator, quotes,
│   │   │                   receipts, prospect, alternatives, reminders)
│   │   ├── cron/           scheduled jobs (release provisional holds)
│   │   ├── data/           public read APIs (properties, packages, experiences…)
│   │   ├── documents/      quote/invoice PDF generation + download
│   │   ├── inquiry/        public inquiry form (email + DB)
│   │   └── newsletter/     newsletter signups
├── lib/
│   ├── supabase/           client (memoized, env-guarded), server, admin clients
│   ├── ai/                 journey-engine, orchestrator, quote-engine,
│   │                       guest-profiler, sales-funnel, llm (OpenRouter)
│   ├── documents/          quote/invoice PDFs, itinerary
│   ├── services/           shared domain services
│   ├── voice/              voice-input transform
│   └── …                   use-api-data / use-public-data hooks, api-helpers,
│                           audit, csv, email, workflow-persistence, constants
├── components/             layout (Navbar, SiteShell), UI cards, SEO (JSON-LD)
supabase/
└── migrations/             001–014: schema, RLS, seed data
e2e/                        Playwright specs (admin auth, admin API auth)
```

### Admin panel (`/admin`)

Modules: dashboard, bookings (with provisional holds & deposits), properties, packages, tours, experiences, destinations, journeys, guests, inquiries, suppliers, finance (expenses / invoices / transactions), media, blog, AI journeys, users, audit log, settings.

Every admin API route is protected by the `requireAdmin` guard (`src/lib/api-helpers.ts`): it validates the Supabase session, looks up the caller's `admin_profiles` row, and writes an audit-log entry. The admin UI session is managed by `AdminAuthGuard` + `AdminShell`.

## Conventions

- **Type safety** — `no-explicit-any` is an error. Prefer concrete row interfaces or `Record<string, unknown>` with narrowing; `as any` / `@ts-ignore` are never used.
- **React hooks** — strict react-hooks rules: no setState synchronously in effects, no refs/pure-function calls during render (`useId()` for generated ids). State synced from props uses the render-phase derived-state pattern.
- **Env access** — validated lazily (at first use), never at module load, so the build and unrelated code paths work without env vars.
- **Images** — `next/image` with Supabase remote patterns; a `scripts/existing_images.txt` manifest tracks assets referenced by content (run the image-audit script to keep it in sync).

## Deployment

The app deploys as a standard Next.js app (e.g. Vercel). Set all env vars from `.env.example` in the deployment environment, apply migrations to the production Supabase project, and configure the cron endpoints (`/api/cron/release-provisional-holds`, `/api/ai/trigger-reminders`) with the `CRON_SECRET` header.
