# Library Self-Checkout System

[![Test Build Next.js in Ubuntu](https://github.com/Kidemi04/Library_Self-Checkout_System/actions/workflows/test.yml/badge.svg)](https://github.com/Kidemi04/Library_Self-Checkout_System/actions/workflows/test.yml)

## Aim

The aim of this project is to provide a complete web-based library self-checkout system that lets students borrow, return, reserve, renew, and track books, while staff and administrators manage the catalogue, copies, users, overdue loans, damage reports, notifications, and audit history from role-based dashboards.

This repository is prepared for handover: install dependencies, fill the environment file, run one database setup command, and start the Next.js app.

## Technology Stack

- **Next.js 15** and **React 19** for the web application
- **Supabase Postgres** for the database and storage-backed library data
- **NextAuth Azure AD** for production authentication
- **Tailwind CSS** for styling
- **DeepSeek** for AI-powered reading assistance and recommendations
- Optional **SIP2**, LinkedIn Learning, YouTube, and MCP integrations

## Features

- Barcode-based checkout and check-in
- Active loans, overdue tracking, renewals, holds, and damage reports
- Student, staff, and admin dashboards with role-based access
- Book catalogue, copy management, categories, tags, and cover images
- In-app notifications for circulation events
- Reading assistant and recommendations powered by DeepSeek
- Optional LinkedIn Learning, YouTube, SIP2, and MCP recommendation integrations

## Installation Overview

For a fresh machine or client handover, follow this order:

1. Install Node.js and pnpm.
2. Install project packages with `pnpm install`.
3. Copy `.env.example` to `.env.local`.
4. Fill Supabase, Azure AD, NextAuth, DeepSeek, and optional integration values.
5. Run the all-in-one Supabase database setup script.
6. Start the development server with `pnpm dev`.
7. Verify the app with `pnpm test` and `pnpm build`.

## Requirements Before Installation

- Node.js 18+
- pnpm
- A fresh Supabase project/database
- Azure AD app registration for production login
- DeepSeek API key for AI features

Install pnpm if needed:

```bash
npm install -g pnpm
```

## 1. Install Project Packages

```bash
pnpm install
```

## 2. Create Environment File

```bash
cp .env.example .env.local
```

Fill `.env.local` before running the app. Never commit real secrets.

Minimum required values:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_URL=
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
```

Optional SIP2 values:

```env
SIP2_BASE_URL=
SIP2_API_KEY=
SIP2_TIMEOUT_MS=5000
SIP2_INSTITUTION_ID=
SIP2_TERMINAL_PASSWORD=
SIP2_PATRON_PASSWORD=
```

For local development without Azure AD, enable the dev bypass:

```env
DEV_BYPASS_AUTH=true
DEV_BYPASS_ROLE=admin
DEV_BYPASS_EMAIL=library.dev@example.com
DEV_BYPASS_NAME=Library Developer
DEV_BYPASS_USER_ID=dev-user
```

If a secret should not be shared during handover, set it to `<To-be-generated>` in the shared env file.

## 3. Set Up Supabase Database

Use a fresh Supabase database. The setup command refuses to run if `public."Users"` already exists, so it does not accidentally reinitialize an existing database.

Copy the Supabase direct/non-pooling Postgres connection string into `.env.local`:

```env
POSTGRES_URL_NON_POOLING=postgres://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres
```

Preview what will run:

```bash
pnpm db:setup:dry-run
```

Apply the complete schema:

```bash
pnpm db:setup
```

The command applies the all-in-one handoff SQL file:

- `supabase/setup.sql`

Optional: apply the schema and seed demo catalogue data from Open Library:

```bash
pnpm db:setup:with-seed
```

The seed step uses `scripts/seed-books-bulk.mjs` and requires `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`, plus `SUPABASE_SERVICE_ROLE_KEY`.

## 4. Start the Application

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## 5. Verify the Installation

Run the test suite:

```bash
pnpm test
```

Run the production build:

```bash
pnpm build
```

The installation is ready when both commands complete successfully and the app opens at [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
pnpm dev                 # Next.js dev server on 0.0.0.0
pnpm dev:webpack         # Next.js dev server without Turbopack
pnpm build               # Production build
pnpm start               # Start production build
pnpm test                # Jest tests
pnpm test:watch          # Jest watch mode
pnpm db:setup:dry-run    # Print database setup plan
pnpm db:setup            # Apply supabase/setup.sql to a fresh Supabase database
pnpm db:setup:with-seed  # Apply setup SQL and seed demo books
```

There is no lint script in this project.

## Supabase Notes

- Tables use PascalCase: `Users`, `Books`, `Copies`, `Loans`
- Columns use snake_case: `display_name`, `borrowed_at`, `target_user_id`
- Code queries should use the existing PascalCase table names, for example `from('Books')` and `from('Users')`
- The client handover setup file is `supabase/setup.sql`
- `scripts/setup-database.cjs` is the one-command database runner

Supabase is the system of record for circulation state. SIP2 is auxiliary; if SIP2 fails, the app still updates Supabase.

## Production Notes

- Use Azure AD login in production.
- Keep `SUPABASE_SERVICE_ROLE_KEY`, `AZURE_AD_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `DEEPSEEK_API_KEY`, and SIP2 credentials server-only.
- `DEV_BYPASS_AUTH` must stay disabled in production.
- LinkedIn Learning and YouTube integrations can run in stub/sample mode when API keys are not configured.

## Handover Checklist

- `.env.local` contains the real deployment values or `<To-be-generated>` placeholders.
- `pnpm db:setup` has been run once against a fresh Supabase database.
- `pnpm test` passes.
- `pnpm build` completes successfully.
- Production deployment has `DEV_BYPASS_AUTH=false` or the variable is unset.
