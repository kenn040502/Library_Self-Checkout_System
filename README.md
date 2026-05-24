# Library Self-Checkout System

[![Test Build Next.js in Ubuntu](https://github.com/Kidemi04/Library_Self-Checkout_System/actions/workflows/test.yml/badge.svg)](https://github.com/Kidemi04/Library_Self-Checkout_System/actions/workflows/test.yml)

Web-based library self-checkout platform built with **Next.js 15 (App Router)**, **Supabase**, **NextAuth (Azure AD)**, and a mobile-friendly dashboard for circulation workflows.

---

## Features

- **Library Circulation**
  - Checkout / check-in flow
  - Active loans & overdue tracking
  - Hold placement and queue processing
  - Copy status and damage reporting workflows

- **Catalog Management**
  - Book listing, search, and detail pages
  - Copy record management (barcode-based)
  - Tag/category support for books

- **Authentication & Roles**
  - Azure AD login via NextAuth
  - Role-based access (`user`, `staff`, `admin`)
  - Profile management and user administration

- **Integrations**
  - Supabase (PostgreSQL + Storage)
  - LinkedIn Learning module (live API or local stub)
  - SIP2 support (external circulation interoperability)
  - Optional MCP recommendation server (`mcp/server.mjs`)

---

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Next.js Route Handlers / Server Actions
- **Database**: Supabase (PostgreSQL)
- **Auth**: NextAuth v5 beta + Azure AD
- **Testing**: Jest + Testing Library

---

## Getting Started

### 1) Prerequisites

- Node.js 18+
- pnpm
- Supabase project
- Azure AD App Registration

Install pnpm (if needed):

```bash
npm install -g pnpm
```

### 2) Installation

```bash
git clone https://github.com/Kidemi04/Library_Self-Checkout_System.git
cd Library_Self-Checkout_System
pnpm install
```

### 3) Environment Variables

Copy and configure env file:

```bash
cp .env.example .env.local
```

Then fill values in `.env.local`.

### 4) Run development server

```bash
pnpm dev
```

Open: `http://localhost:3000`

---

## Environment Variables Reference

Main variables from `.env.example`:

### Supabase / Database

```env
POSTGRES_URL=
POSTGRES_PRISMA_URL=
POSTGRES_URL_NON_POOLING=
POSTGRES_USER=
POSTGRES_HOST=
POSTGRES_PASSWORD=
POSTGRES_DATABASE=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### NextAuth + Azure AD

```env
AZURE_AD_CLIENT_ID=
AZURE_AD_CLIENT_SECRET=
AZURE_AD_TENANT_ID=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
AUTH_URL=http://localhost:3000/api/auth
```

### AI Recommendation Providers

```env
LLM_PROVIDER=lmstudio

LMSTUDIO_BASE_URL=http://localhost:1234/v1
LMSTUDIO_MODEL=google/gemma-4-e4b

GEMINI_API_BASE_URL=https://generativelanguage.googleapis.com/v1beta
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
```

### LinkedIn Learning

```env
LINKEDIN_LEARNING_CLIENT_ID=
LINKEDIN_LEARNING_CLIENT_SECRET=
LINKEDIN_LEARNING_ORGANIZATION_URN=
LINKEDIN_LEARNING_DEFAULT_LOCALE=en_US
LINKEDIN_LEARNING_API_VERSION=202404
LINKEDIN_LEARNING_USE_STUB=true
LINKEDIN_LEARNING_SCOPE="learning openid profile r_liteprofile r_emailaddress organization_learning"
```

### SIP2 / Optional MCP

```env
SIP2_BASE_URL=
SIP2_API_KEY=

MCP_RECOMMENDATIONS_ENABLED=false
MCP_SERVER_COMMAND=
MCP_SERVER_ARGS=["mcp/server.mjs"]
```

### Dev Testing

```env
DEV_AZURE_EMAIL_SUFFIX=
```

---

## Supabase Naming Convention (Project Standard)

> **Required convention for this project:**

- **Table names**: `PascalCase`
- **Column names**: `snake_case`
- **Enum type names**: `snake_case`
- **Enum values**: `snake_case`

### Example

```sql
-- enum type uses snake_case
CREATE TYPE copy_status AS ENUM (
  'available',
  'on_loan',
  'lost',
  'damaged',
  'processing',
  'hold_shelf'
);

-- table uses PascalCase
CREATE TABLE "Copies" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL,
  barcode text NOT NULL UNIQUE,
  status copy_status NOT NULL DEFAULT 'available',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### Current code style alignment

In code, Supabase queries follow PascalCase table names, for example:

- `from('Books')`
- `from('Copies')`
- `from('Users')`
- `from('Loans')`
- `from('UserProfile')`

Please keep all future schema changes aligned with this naming rule.

---

## Scripts

From `package.json`:

```bash
pnpm dev        # Start local dev server
pnpm build      # Production build
pnpm start      # Run production build
pnpm test       # Run Jest tests
pnpm test:watch # Run tests in watch mode
```

---

## Testing

This project uses Jest + Testing Library. Existing tests are under `__tests__/`.

Run all tests:

```bash
pnpm test
```

---

## Notes

- Supabase is the system of record for circulation state.
- SIP2 integration is auxiliary and can be configured per environment.
- LinkedIn Learning supports both real API mode and local stub mode.
- Keep secrets in `.env.local` only (do not commit secrets).
