# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager: **pnpm**.

- `pnpm dev` — Next.js dev server with Turbopack, bound to `0.0.0.0` (so phones on the LAN can hit the dev box for barcode-scanner testing).
- `pnpm build` — Production build (`next build`).
- `pnpm start` — Run the production build.
- `pnpm test` — Jest (jsdom env, Next.js preset). Single test: `pnpm test -- __tests__/lib.barcode.test.ts` or by name with `-t "..."`.
- `pnpm test:watch` — Jest watch mode.
- There is **no lint script**. Don't run `next lint` unless the user adds one.

The repo also ships an MCP server at `mcp/server.mjs` (stdio transport, exposes Supabase library data). Run with `node mcp/server.mjs`.

## Architecture

Next.js 15 App Router + React 19 + TypeScript + Tailwind, talking to Supabase (Postgres) and a SIP2 emulator. Authentication is **NextAuth (beta) with Azure AD** as the primary provider. Production is Swinburne Sarawak's library — assume student-facing daily use.

**Path alias:** `@/*` → repo root (configured in `tsconfig.json` and `jest.config.ts`). Always import via `@/...` rather than long relative paths.

### Auth flow — read this before touching session code

1. `auth.ts` (root) defines NextAuth options. The Azure AD `signIn` callback **upserts a row in the `Users` table** via the Supabase service-role client and stamps `id`/`role` onto the JWT. Email is normalized to lowercase everywhere.
2. `middleware.ts` wraps routes under `/dashboard`, `/profile`, `/api/{checkin,checkout,sip2,books}` and enforces role gates: `/dashboard/admin` → admin only, `/dashboard/staff` → staff or admin.
3. `app/lib/auth/session.ts` — `getDashboardSession()` is what server components call. It reads the NextAuth session, then enriches from the `MyProfile` Supabase view. Layout under `app/dashboard/layout.tsx` uses this and redirects to `/login` if absent.
4. `app/lib/auth/env.ts` — dev bypass. When `NODE_ENV=development` and `DEV_BYPASS_AUTH=true`, both middleware and `getDashboardSession` short-circuit and synthesize a user from `DEV_BYPASS_*` env vars. This is the way to develop without Azure AD.
5. Role helpers `requireUser` / `requireStaff` / `requireAdmin` in `auth.ts` throw `UnauthorizedError` / `ForbiddenError` — use them in server actions.

Roles in code are normalized to `'user' | 'staff' | 'admin'` (`DashboardRole` in `app/lib/auth/types.ts`). Legacy `'librarian'` and `'student'` strings still appear in env/DB and get coerced to `staff` / `user` respectively.

### Supabase access

- **Server-only client**: `app/lib/supabase/server.ts` → `getSupabaseServerClient()`. Uses `SUPABASE_SERVICE_ROLE_KEY`. Synchronous, no singleton, no cookie/session handling. Server components, server actions, API routes, and `auth.ts` all go through this.
- **Browser client**: `app/lib/supabase/client.ts` (uses `NEXT_PUBLIC_*` vars). Use sparingly — prefer server actions.
- **Domain queries**: `app/lib/supabase/queries.ts`, `updates.ts`, `notifications.ts`. Shared types in `app/lib/supabase/types.ts` (`Book`, `Copy`, `Loan`, `OverdueLoan`, `HistoryLoan`, etc.). `CopyStatus` is the lowercase TypeScript enum (`'available' | 'on_loan' | ...`); the SQL enum is uppercase (`AVAILABLE`/`ON_LOAN`/...) — convert at boundaries.
- **Audit log**: server actions write to `audit_log` via the `logAuditEvent` helper in `app/dashboard/actions.ts`. Preserve this when extending circulation flows.

### Circulation flow (the core domain)

`app/dashboard/actions.ts` is the heart: server actions for checkout / checkin / renew / hold / damage report. They:

1. Authenticate via `auth()`.
2. Call SIP2 (`lib/sip2.ts`) **with a 5-second timeout** — SIP2 is treated as auxiliary, Supabase is the source of truth. If SIP2 fails, the action still updates Supabase and logs.
3. Mutate Supabase tables (`Loans`, `Copies`, `Holds`, `DamageReports`).
4. Write notifications via `app/lib/supabase/notifications.ts`.
5. `revalidatePath` the affected dashboard routes.

Loan policy constants live in `app/dashboard/loanPolicy.ts` (`STUDENT_LOAN_LIMIT=3`, `MAX_LOAN_DAYS=30`, damage-report caps). Reference these — don't inline numbers.

SIP2 date format is `YYYYMMDDZZZZHHMMSS` (4-digit local TZ offset, no sign). See `formatSipDate` in `app/dashboard/actions.ts`.

### Routing layout

- `app/dashboard/` — student/user shell. Sub-routes: `book/`, `my-books/`, `notifications/`, `recommendations/`, `learning/`, `chat/`, `faq/`, `cameraScan/`, `profile/`.
- `app/dashboard/admin/` — admin-only (books CRUD, users, overdue export).
- `app/dashboard/staff/` — staff+admin (damage-reports, history).
- `app/api/` — REST endpoints; the protected ones are listed in `middleware.ts`'s matcher.
- `app/ui/dashboard/` — large shared UI component library, including `dashboardShell.tsx`, `sidenav.tsx`, the `primitives/` set, and feature-specific components. Most flows use server components + small `'use client'` islands (forms, scanners).
- `app/ui/magicUi/` — animated primitives (shimmer button, blur-fade, glass card, bento grid). Used for the "premium" surfaces.
- `app/ui/theme/` — `next-themes` provider + toggle. Tailwind has both light (cream/coral) and dark variants; check `tailwind.config.ts` and `DESIGN.md` before introducing new colors.

### Server-action result convention

Server actions return `ActionState = { status: 'idle'|'success'|'error', message: string }` from `app/dashboard/actionState.ts`, used with React `useActionState`. Helpers `success(msg)` / `failure(msg)` are defined locally in each actions file.

### Tests

Jest + Testing Library, jsdom. Tests live in `__tests__/` at the repo root, named `<thing>.test.{ts,tsx,jsx}`. The Next.js Jest preset is loaded via `next/jest.js` so `@/` aliases work in tests. There is **no global setup file**.

### Database schema and migrations

Migrations live in `supabase/migrations/` (timestamped filenames, e.g. `20260428_search_books_rpc.sql`). The base schema is documented in `README.md` (books / copies / users / user_profiles / loans plus enums). Recent migrations add: notifications, damage reports, extended book categories, loan reminder tracking, and a `search_books` RPC.

**Naming convention (project-wide, see `README.md`)**: tables use **PascalCase** (`Users`, `Books`, `Copies`, `Loans`, `UserProfile`); columns / enum types / enum values use **snake_case** (`copy_status`, `display_name`, `'on_loan'`). The auth/profile flow specifically reads from views `Users`, `UserProfile`, `MyProfile` — match this casing exactly when writing Supabase queries in auth/session code.

### Scripts

`scripts/` contains seeders/verifiers (`seed-books.mjs`, `seed-books-bulk.mjs`, `fill-cover-images.mjs`, `verify-*.mjs`) — run with `node scripts/<name>.mjs`. They expect the same Supabase env vars as the app.

## Environment variables (must-knows)

The app reads these without sensible defaults — the app will throw or refuse to sign in if they're missing in production:

- `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — service-role key is server-only.
- `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `AZURE_AD_TENANT_ID`, `NEXTAUTH_SECRET` (auto-set to `'dev-secret'` in development).
- Optional dev bypass: `DEV_BYPASS_AUTH`, `DEV_BYPASS_ROLE` (`user`|`staff`|`admin`), `DEV_BYPASS_EMAIL`, `DEV_BYPASS_NAME`, `DEV_BYPASS_USER_ID`.
- SIP2: `SIP2_BASE_URL`, `SIP2_API_KEY`, `SIP2_TIMEOUT_MS` (default 5000), `SIP2_INSTITUTION_ID`, `SIP2_TERMINAL_PASSWORD`, `SIP2_PATRON_PASSWORD`.
- AI / LLM provider — DeepSeek is the only LLM provider (server-only):
  - `DEEPSEEK_API_KEY` (required for any AI surface to work; server-only)
  - `DEEPSEEK_MODEL` (default `deepseek-v4-flash`)
  - `DEEPSEEK_API_BASE_URL` (default `https://api.deepseek.com`)
  - `DEEPSEEK_TIMEOUT_MS` (default 15000), `DEEPSEEK_STREAM_TIMEOUT_MS` (default 30000)
  - `app/lib/ai/deepseek.ts` is the single LLM client (`callDeepSeekJson` / `streamDeepSeekText`). `app/lib/recommendations/ai.ts` is a thin library-domain layer over it: a classify pass (JSON) and a streaming-answer pass (SSE text). `/api/reading-assistant` is a `text/event-stream` endpoint — not JSON.
- LinkedIn Learning (optional, has stub mode): `LINKEDIN_LEARNING_*` — set `LINKEDIN_LEARNING_USE_STUB=true` to use the bundled sample catalogue. See `README.md` for the full list.
- Optional LinkedIn auth provider: `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` (only enables the provider when both are set).
- Optional MCP recommendations: `MCP_RECOMMENDATIONS_ENABLED=false` (toggle), `MCP_SERVER_COMMAND`, `MCP_SERVER_ARGS` (defaults to `["mcp/server.mjs"]`).

## Conventions to follow

- Tailwind tokens are domain-specific (`bg-canvas`, `text-ink`, `bg-dark-canvas`, `text-on-dark`, swin-* legacy colors, plus the warm-canvas palette in `DESIGN.md`). Reuse tokens; don't introduce raw hex values without checking `DESIGN.md` and `tailwind.config.ts`.
- Server actions and API handlers should normalize email to lowercase before any DB lookup (matches what the auth callbacks store).
- Never call SIP2 without a timeout — copy the `AbortController` pattern from `lib/sip2.ts`.
- Never call the LLM without a timeout — `app/lib/ai/deepseek.ts` is the only place that talks to a model and it always uses an `AbortController` (same rule as SIP2).
- When adding a protected route, update **both** `middleware.ts` (`protectedPrefixes` + `matcher`) and any role rule in `roleGuardRules`.
- Several files at the auth boundary use `// @ts-nocheck` (`auth.ts`, `middleware.ts`) due to NextAuth beta typing churn — preserve this pragma when editing rather than fighting the types.
