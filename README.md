# Library Self-Checkout System

[![Test Build Next.js in Ubuntu](https://github.com/Kidemi04/Library_Self-Checkout_System/actions/workflows/test.yml/badge.svg)](https://github.com/Kidemi04/Library_Self-Checkout_System/actions/workflows/test.yml)

Web-based library self-checkout platform built with **Next.js 15**, **React 19**, **Supabase**, **NextAuth Azure AD**, and **Tailwind CSS**.

## Features

- Barcode-based checkout and check-in
- Active loans, overdue tracking, renewals, holds, and damage reports
- Student, staff, and admin dashboards with role-based access
- Book catalogue, copy management, categories, tags, and cover images
- In-app notifications for circulation events
- Reading assistant and recommendations powered by DeepSeek
- Optional LinkedIn Learning, YouTube, SIP2, and MCP recommendation integrations

## Requirements

- Node.js 18+
- pnpm
- Supabase project
- Azure AD app registration for production login
- DeepSeek API key for AI features

Install pnpm if needed:

```bash
npm install -g pnpm
```

## Local Setup

```bash
pnpm install
cp .env.example .env.local
```

Fill `.env.local` before running the app. Never commit real secrets.

For local development without Azure AD, enable the dev bypass:

```env
DEV_BYPASS_AUTH=true
DEV_BYPASS_ROLE=admin
DEV_BYPASS_EMAIL=library.dev@example.com
DEV_BYPASS_NAME=Library Developer
DEV_BYPASS_USER_ID=dev-user
```

Start the dev server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database Setup

Use a fresh Supabase project/database. The setup script refuses to run if `public."Users"` already exists, so it does not accidentally reinitialize an existing database.

1. Copy the Supabase direct/non-pooling Postgres connection string into `.env.local`:

```env
POSTGRES_URL_NON_POOLING=postgres://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres
```

2. Check the SQL plan:

```bash
pnpm db:setup:dry-run
```

3. Apply the schema:

```bash
pnpm db:setup
```

This applies:

- `supabase/schema.sql`
- `supabase/migrations/20260507_notification_flags.sql`
- `supabase/migrations/20260511_drop_ai_chat_history.sql`
- `supabase/migrations/20260524_general_chat_history_metadata.sql`
- `supabase/migrations/20260604_damage_reports_resolution.sql`

To also seed demo catalogue data from Open Library, first fill:

```env
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Then run:

```bash
pnpm db:setup:with-seed
```

The seed step is optional and uses `scripts/seed-books-bulk.mjs`.

## Environment Variables

Use `.env.example` as the source of truth. Important values:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
POSTGRES_URL_NON_POOLING=

AZURE_AD_CLIENT_ID=
AZURE_AD_CLIENT_SECRET=
AZURE_AD_TENANT_ID=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
AUTH_URL=http://localhost:3000/api/auth

DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_API_BASE_URL=https://api.deepseek.com

SIP2_BASE_URL=
SIP2_API_KEY=
SIP2_TIMEOUT_MS=5000
```

If a secret should not be shared during handover, set it to `<To-be-generated>` in the shared env file.

## Scripts

```bash
pnpm dev                 # Next.js dev server on 0.0.0.0
pnpm dev:webpack         # Next.js dev server without Turbopack
pnpm build               # Production build
pnpm start               # Start production build
pnpm test                # Jest tests
pnpm test:watch          # Jest watch mode
pnpm db:setup:dry-run    # Print database setup plan
pnpm db:setup            # Apply database schema to a fresh Supabase database
pnpm db:setup:with-seed  # Apply database schema and seed demo books
```

There is no lint script in this project.

## Supabase Naming Convention

- Tables use PascalCase: `Users`, `Books`, `Copies`, `Loans`
- Columns use snake_case: `display_name`, `borrowed_at`, `target_user_id`
- Code queries should use the existing PascalCase table names, for example `from('Books')` and `from('Users')`

Supabase is the system of record for circulation state. SIP2 is auxiliary; if SIP2 fails, the app still updates Supabase.

## Production Notes

- Use Azure AD login in production.
- Keep `SUPABASE_SERVICE_ROLE_KEY`, `AZURE_AD_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `DEEPSEEK_API_KEY`, and SIP2 credentials server-only.
- `DEV_BYPASS_AUTH` must stay disabled in production.
- LinkedIn Learning and YouTube integrations can run in stub/sample mode when API keys are not configured.
