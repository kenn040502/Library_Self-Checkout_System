# Admin Users Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the 1109-line `usersManager.tsx` into a calm read-only list page, a dedicated `/admin/users/[id]` detail page, and a focused add-user modal. Add role tabs with live counts and tap-to-detail rows on desktop and mobile.

**Architecture:** List page is a server component that fetches all managed users and hands them to a client `<UsersList>` (search + role tabs + pagination + read-only table). Each row navigates to the detail page. The detail page is a server component that fetches one user plus their last 5 loans, then renders `<UserDetailForm>` (profile editor + recent activity + danger zone). Add-user moves into a modal triggered by the AdminShell `primaryAction`.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind, Supabase. Existing server actions reused unchanged: `addUserAction`, `updateUserAction`, `deleteUserAction`. Existing modal primitive: `app/ui/dashboard/confirmModal.tsx`.

**Spec:** `docs/superpowers/specs/2026-05-08-admin-users-redesign-design.md`

---

## File Structure

**New files:**
- `app/ui/dashboard/admin/userProfileFields.ts` — extracted `PROFILE_FIELD_CONFIG`, `sanitizeProfileValues`, type helpers (so both the list and the detail form can share field metadata without duplicating).
- `app/ui/dashboard/admin/roleTabs.tsx` — pill-tab role filter with live counts.
- `app/ui/dashboard/admin/usersList.tsx` — slimmed list orchestrator (search, role tab, pagination, read-only table). Replaces `usersManager.tsx`.
- `app/ui/dashboard/admin/addUserDialog.tsx` — modal for the existing add-user flow.
- `app/ui/dashboard/admin/userDetailForm.tsx` — client form rendered on the detail page (profile fields + role select + recent activity + danger zone with delete).
- `app/dashboard/admin/users/[id]/page.tsx` — server-component detail route.
- `__tests__/queries.recentLoansByUser.test.ts` — test for the new query helper.
- `__tests__/admin.userListFilter.test.ts` — pure-function tests for role-count + filter logic.

**Modified files:**
- `app/lib/supabase/queries.ts` — add `fetchManagedUserById(id)`, `fetchRecentLoansByUser(userId, limit)`, and a `RecentLoanEntry` type.
- `app/dashboard/admin/users/page.tsx` — swap `<UsersManager>` for `<UsersList>`.

**Deleted files:**
- `app/ui/dashboard/admin/usersManager.tsx`

---

## Task 1: Extract shared profile-field helpers into a standalone module

**Files:**
- Create: `app/ui/dashboard/admin/userProfileFields.ts`
- Modify: `app/ui/dashboard/admin/usersManager.tsx` (only changes its imports — content moved to the new module)

We extract before changing anything visible. After this task, the existing page should look and behave identically; only the file structure changes.

- [ ] **Step 1: Create `userProfileFields.ts` with the extracted constants and helpers.**

Copy these symbols from `usersManager.tsx` lines ~16–258 verbatim into the new file:
- type `FieldType = 'text' | 'textarea' | 'number' | 'select' | 'json' | 'boolean'`
- type `ProfileFieldConfig`
- type `ManagedRole = 'user' | 'staff' | 'admin'`
- type `ManagedUser`
- `roleOptions: ManagedRole[]`
- `visibilityOptions`
- `baseProfileFieldOrder`
- `PROFILE_FIELD_CONFIG`
- helpers: `toTitleCase`, `inferFieldType`, `toInputValue`, `sanitizeProfileRow`, `sanitizeProfileValues`, `getProfileKeys`
- type `ProfileSanitizeSuccess`, `ProfileSanitizeFailure`

Add `export` to each so they can be reused. The file is types + pure helpers — no React, no `'use client'`.

- [ ] **Step 2: Replace the inline definitions in `usersManager.tsx` with imports.**

```ts
// At the top of usersManager.tsx, remove the moved constants/types and add:
import {
  type FieldType,
  type ProfileFieldConfig,
  type ManagedRole,
  type ManagedUser,
  roleOptions,
  visibilityOptions,
  baseProfileFieldOrder,
  PROFILE_FIELD_CONFIG,
  toTitleCase,
  inferFieldType,
  toInputValue,
  sanitizeProfileRow,
  sanitizeProfileValues,
  getProfileKeys,
} from '@/app/ui/dashboard/admin/userProfileFields';
```

- [ ] **Step 3: Run the build and the existing test suite.**

Run: `pnpm build`
Expected: Build succeeds. No new errors. The page still renders the same.

Run: `pnpm test`
Expected: All existing tests pass.

- [ ] **Step 4: Commit.**

```bash
git add app/ui/dashboard/admin/userProfileFields.ts app/ui/dashboard/admin/usersManager.tsx
git commit -m "refactor(admin/users): extract profile-field helpers into reusable module"
```

---

## Task 2: Add `fetchRecentLoansByUser` query helper (TDD)

**Files:**
- Modify: `app/lib/supabase/queries.ts` (append a new function and a new type)
- Create: `__tests__/queries.recentLoansByUser.test.ts`

The detail page's "Recent activity" card needs the user's last 5 loans regardless of returned-state. The existing `fetchLoanHistory` only returns *returned* loans. We need a new helper that returns the most recent loans (active OR returned) for one user.

- [ ] **Step 1: Write the failing test.**

Create `__tests__/queries.recentLoansByUser.test.ts`:

```ts
import { fetchRecentLoansByUser } from '@/app/lib/supabase/queries';

jest.mock('@/app/lib/supabase/server', () => {
  const mockFrom = jest.fn();
  return {
    getSupabaseServerClient: () => ({ from: mockFrom }),
    __mockFrom: mockFrom,
  };
});

const { __mockFrom: mockFrom } = jest.requireMock('@/app/lib/supabase/server') as {
  __mockFrom: jest.Mock;
};

const buildLoanRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'loan-1',
  borrowed_at: '2026-05-01T00:00:00Z',
  due_at: '2026-05-31T00:00:00Z',
  returned_at: null,
  renewed_count: 0,
  copy: {
    id: 'copy-1',
    book: {
      id: 'book-1',
      title: 'Test Title',
      author: 'A. Author',
      isbn: '9780000000000',
      cover_image_url: null,
    },
  },
  ...overrides,
});

describe('fetchRecentLoansByUser', () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it('returns active and returned loans, newest first, limited to N', async () => {
    const rows = [
      buildLoanRow({ id: 'loan-3', borrowed_at: '2026-05-05T00:00:00Z' }),
      buildLoanRow({ id: 'loan-2', borrowed_at: '2026-05-04T00:00:00Z', returned_at: '2026-05-06T00:00:00Z' }),
      buildLoanRow({ id: 'loan-1', borrowed_at: '2026-05-03T00:00:00Z' }),
    ];

    const limit = jest.fn().mockResolvedValue({ data: rows, error: null });
    const order = jest.fn().mockReturnValue({ limit });
    const eq = jest.fn().mockReturnValue({ order });
    const select = jest.fn().mockReturnValue({ eq });
    mockFrom.mockReturnValue({ select });

    const result = await fetchRecentLoansByUser('user-1', 5);

    expect(mockFrom).toHaveBeenCalledWith('Loans');
    expect(eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(order).toHaveBeenCalledWith('borrowed_at', { ascending: false });
    expect(limit).toHaveBeenCalledWith(5);

    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({
      id: 'loan-3',
      action: 'borrowed',
      book: { id: 'book-1', title: 'Test Title' },
    });
    expect(result[1]).toMatchObject({ id: 'loan-2', action: 'returned' });
  });

  it('returns "renewed" action when renewed_count > 0 and not yet returned', async () => {
    const rows = [
      buildLoanRow({ id: 'loan-r', renewed_count: 2, returned_at: null }),
    ];
    const limit = jest.fn().mockResolvedValue({ data: rows, error: null });
    const order = jest.fn().mockReturnValue({ limit });
    const eq = jest.fn().mockReturnValue({ order });
    const select = jest.fn().mockReturnValue({ eq });
    mockFrom.mockReturnValue({ select });

    const result = await fetchRecentLoansByUser('user-1', 5);
    expect(result[0].action).toBe('renewed');
  });

  it('returns [] when supabase reports an error', async () => {
    const limit = jest.fn().mockResolvedValue({ data: null, error: { message: 'boom' } });
    const order = jest.fn().mockReturnValue({ limit });
    const eq = jest.fn().mockReturnValue({ order });
    const select = jest.fn().mockReturnValue({ eq });
    mockFrom.mockReturnValue({ select });

    const result = await fetchRecentLoansByUser('user-1', 5);
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails.**

Run: `pnpm test -- __tests__/queries.recentLoansByUser.test.ts`
Expected: FAIL with `fetchRecentLoansByUser is not a function`.

- [ ] **Step 3: Implement `fetchRecentLoansByUser` in `app/lib/supabase/queries.ts`.**

Append at the end of the file:

```ts
export type RecentLoanEntry = {
  id: string;
  borrowedAt: string;
  returnedAt: string | null;
  dueAt: string;
  renewedCount: number;
  action: 'borrowed' | 'returned' | 'renewed';
  book: {
    id: string;
    title: string;
    author: string | null;
    isbn: string | null;
    coverImageUrl: string | null;
  };
};

export async function fetchRecentLoansByUser(
  userId: string,
  limit = 5,
): Promise<RecentLoanEntry[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('Loans')
    .select(
      `
        id,
        borrowed_at,
        due_at,
        returned_at,
        renewed_count,
        copy:Copies(
          id,
          book:Books(
            id,
            title,
            author,
            isbn,
            cover_image_url
          )
        )
      `,
    )
    .eq('user_id', userId)
    .order('borrowed_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[fetchRecentLoansByUser] error', error);
    return [];
  }

  type RawRow = {
    id: string;
    borrowed_at: string;
    due_at: string;
    returned_at: string | null;
    renewed_count: number | null;
    copy?: {
      id: string;
      book?: {
        id: string;
        title: string;
        author: string | null;
        isbn: string | null;
        cover_image_url: string | null;
      } | null;
    } | null;
  };

  const rows = (data ?? []) as unknown as RawRow[];

  return rows.map((row) => {
    const renewedCount = row.renewed_count ?? 0;
    const action: RecentLoanEntry['action'] = row.returned_at
      ? 'returned'
      : renewedCount > 0
        ? 'renewed'
        : 'borrowed';
    return {
      id: row.id,
      borrowedAt: row.borrowed_at,
      returnedAt: row.returned_at,
      dueAt: row.due_at,
      renewedCount,
      action,
      book: {
        id: row.copy?.book?.id ?? '',
        title: row.copy?.book?.title ?? 'Unknown title',
        author: row.copy?.book?.author ?? null,
        isbn: row.copy?.book?.isbn ?? null,
        coverImageUrl: row.copy?.book?.cover_image_url ?? null,
      },
    };
  });
}
```

- [ ] **Step 4: Run the test again, confirm it passes.**

Run: `pnpm test -- __tests__/queries.recentLoansByUser.test.ts`
Expected: 3 PASS.

- [ ] **Step 5: Commit.**

```bash
git add app/lib/supabase/queries.ts __tests__/queries.recentLoansByUser.test.ts
git commit -m "feat(queries): fetchRecentLoansByUser helper for user detail page"
```

---

## Task 3: Add `fetchManagedUserById` query helper

**Files:**
- Modify: `app/lib/supabase/queries.ts`

Used by the detail page server component to load a single user.

- [ ] **Step 1: Implement the function in `app/lib/supabase/queries.ts`.**

Append directly after `fetchManagedUsers`:

```ts
export async function fetchManagedUserById(id: string): Promise<ManagedUserRow | null> {
  if (!id) return null;
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('Users')
    .select('*, profile:UserProfile(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error('[fetchManagedUserById] error', error);
    return null;
  }
  return (data ?? null) as ManagedUserRow | null;
}
```

- [ ] **Step 2: Verify the build still passes.**

Run: `pnpm build`
Expected: build succeeds.

- [ ] **Step 3: Commit.**

```bash
git add app/lib/supabase/queries.ts
git commit -m "feat(queries): fetchManagedUserById for admin user detail page"
```

---

## Task 4: Build `<RoleTabs>` component (TDD on the count logic)

**Files:**
- Create: `app/ui/dashboard/admin/roleTabs.tsx`
- Create: `__tests__/admin.userListFilter.test.ts`

We extract the role-counting logic into a pure function so we can test it without rendering. The component itself stays small and presentational.

- [ ] **Step 1: Write the failing test for the count helper.**

Create `__tests__/admin.userListFilter.test.ts`:

```ts
import { computeRoleCounts } from '@/app/ui/dashboard/admin/roleTabs';
import type { ManagedRole } from '@/app/ui/dashboard/admin/userProfileFields';

const u = (role: ManagedRole) => ({ id: role + Math.random(), role } as { id: string; role: ManagedRole });

describe('computeRoleCounts', () => {
  it('counts users by role and reports total', () => {
    const users = [u('user'), u('user'), u('user'), u('staff'), u('staff'), u('admin')];
    expect(computeRoleCounts(users)).toEqual({ all: 6, user: 3, staff: 2, admin: 1 });
  });

  it('returns all-zeros for empty list', () => {
    expect(computeRoleCounts([])).toEqual({ all: 0, user: 0, staff: 0, admin: 0 });
  });
});
```

- [ ] **Step 2: Run, confirm it fails (module not found).**

Run: `pnpm test -- __tests__/admin.userListFilter.test.ts`
Expected: FAIL — `Cannot find module 'app/ui/dashboard/admin/roleTabs'`.

- [ ] **Step 3: Create `app/ui/dashboard/admin/roleTabs.tsx`.**

```tsx
'use client';

import clsx from 'clsx';
import type { ManagedRole } from '@/app/ui/dashboard/admin/userProfileFields';

export type RoleTab = 'all' | ManagedRole;

export type RoleCounts = { all: number; user: number; staff: number; admin: number };

export function computeRoleCounts<T extends { role: ManagedRole | string | null }>(users: T[]): RoleCounts {
  const counts: RoleCounts = { all: users.length, user: 0, staff: 0, admin: 0 };
  for (const user of users) {
    if (user.role === 'admin') counts.admin += 1;
    else if (user.role === 'staff') counts.staff += 1;
    else counts.user += 1;
  }
  return counts;
}

const TABS: ReadonlyArray<{ key: RoleTab; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'user', label: 'Students' },
  { key: 'staff', label: 'Staff' },
  { key: 'admin', label: 'Admins' },
];

type Props = {
  active: RoleTab;
  counts: RoleCounts;
  onChange: (tab: RoleTab) => void;
};

export default function RoleTabs({ active, counts, onChange }: Props) {
  return (
    <div className="inline-flex flex-wrap items-center gap-1.5 rounded-pill border border-hairline bg-canvas p-1 dark:border-dark-hairline dark:bg-dark-surface-soft">
      {TABS.map((tab) => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={clsx(
              'rounded-pill px-3 py-1 font-sans text-caption-uppercase font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-dark-canvas',
              isActive
                ? 'bg-primary text-on-primary shadow-sm dark:bg-dark-primary'
                : 'text-muted hover:bg-surface-cream-strong hover:text-ink dark:text-on-dark-soft dark:hover:bg-dark-surface-strong dark:hover:text-on-dark',
            )}
          >
            <span>{tab.label}</span>
            <span className={clsx('ml-2 font-mono text-[11px]', isActive ? 'opacity-80' : 'opacity-60')}>
              {counts[tab.key]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run the count-logic test, confirm it passes.**

Run: `pnpm test -- __tests__/admin.userListFilter.test.ts`
Expected: 2 PASS.

- [ ] **Step 5: Commit.**

```bash
git add app/ui/dashboard/admin/roleTabs.tsx __tests__/admin.userListFilter.test.ts
git commit -m "feat(admin/users): RoleTabs component with role counts"
```

---

## Task 5: Build `<UsersList>` — the slimmed list orchestrator

**Files:**
- Create: `app/ui/dashboard/admin/usersList.tsx`

This component owns the state for `searchTerm`, `roleFilter`, and `currentPage`, renders the AdminShell (with Add-user button in `primaryAction`), the role tabs, the search input, the read-only table, the mobile card list, and the pagination. Each row navigates to `/dashboard/admin/users/${id}`.

The Add-user button initially does nothing — Task 6 wires it up to the dialog.

- [ ] **Step 1: Create the file.**

```tsx
'use client';

import { useMemo, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { ChevronRightIcon, PlusIcon } from '@heroicons/react/24/outline';
import AdminShell from '@/app/ui/dashboard/adminShell';
import UserAvatar from '@/app/ui/dashboard/primitives/UserAvatar';
import RoleBadge from '@/app/ui/dashboard/primitives/RoleBadge';
import RoleTabs, { computeRoleCounts, type RoleTab } from '@/app/ui/dashboard/admin/roleTabs';
import type { ManagedUserRow } from '@/app/lib/supabase/queries';
import type { ManagedRole } from '@/app/ui/dashboard/admin/userProfileFields';

type Props = {
  initialUsers: ManagedUserRow[];
};

const PAGE_SIZE = 10;

const normalizeRole = (raw: string | null | undefined): ManagedRole => {
  const v = (raw ?? '').toLowerCase();
  if (v === 'admin') return 'admin';
  if (v === 'staff' || v === 'librarian') return 'staff';
  return 'user';
};

type ListRow = {
  id: string;
  email: string;
  fullName: string;
  studentId: string;
  role: ManagedRole;
};

const toListRow = (raw: ManagedUserRow): ListRow => {
  const profile = (raw.profile ?? {}) as Record<string, unknown>;
  return {
    id: raw.id,
    email: raw.email,
    fullName:
      (typeof profile.display_name === 'string' && profile.display_name) ||
      (typeof raw.display_name === 'string' && raw.display_name) ||
      '',
    studentId: typeof profile.student_id === 'string' ? profile.student_id : '',
    role: normalizeRole(raw.role),
  };
};

export default function UsersList({ initialUsers }: Props) {
  const rows = useMemo(() => initialUsers.map(toListRow), [initialUsers]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleTab>('all');
  const [page, setPage] = useState(1);

  const searchActive = searchTerm.trim().length > 0;

  const matchesSearch = (row: ListRow): boolean => {
    if (!searchActive) return true;
    const q = searchTerm.trim().toLowerCase();
    return (
      row.email.toLowerCase().includes(q) ||
      row.fullName.toLowerCase().includes(q) ||
      row.studentId.toLowerCase().includes(q) ||
      row.role.toLowerCase().includes(q)
    );
  };

  const searchFiltered = useMemo(() => rows.filter(matchesSearch), [rows, searchTerm]);
  const counts = useMemo(() => computeRoleCounts(searchFiltered), [searchFiltered]);

  const visibleRows = useMemo(() => {
    if (roleFilter === 'all') return searchFiltered;
    return searchFiltered.filter((row) => row.role === roleFilter);
  }, [searchFiltered, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const paginated = visibleRows.slice(start, start + PAGE_SIZE);

  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(1);
  };
  const handleRoleChange = (tab: RoleTab) => {
    setRoleFilter(tab);
    setPage(1);
  };

  return (
    <>
      <title>Manage Users | Admin</title>
      <AdminShell
        titleSubtitle="Admin Control Center"
        title="User Management"
        description="Review and manage every account that can sign in to the library system."
        primaryAction={
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-btn bg-primary hover:bg-primary-active px-3.5 py-2.5 font-sans text-button text-on-primary transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-dark-canvas"
            // Wired up in Task 6
            onClick={() => undefined}
          >
            <PlusIcon className="h-4 w-4" />
            Add user
          </button>
        }
      >
        <section className="overflow-hidden rounded-card border border-hairline bg-surface-card dark:border-dark-hairline dark:bg-dark-surface-card">
          <header className="flex flex-col gap-4 border-b border-hairline-soft px-6 py-5 md:flex-row md:items-center md:justify-between dark:border-dark-hairline">
            <RoleTabs active={roleFilter} counts={counts} onChange={handleRoleChange} />
            <div className="w-full md:w-80">
              <label className="sr-only" htmlFor="users-search">Search users</label>
              <input
                id="users-search"
                type="search"
                value={searchTerm}
                onChange={handleSearch}
                placeholder="Search by name or student ID…"
                className="h-10 w-full rounded-btn border border-hairline bg-canvas px-3.5 font-sans text-body-md text-ink placeholder:text-muted-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:border-dark-hairline dark:bg-dark-surface-soft dark:text-on-dark dark:placeholder:text-on-dark-soft dark:focus-visible:ring-offset-dark-canvas"
              />
            </div>
          </header>

          {/* Desktop table */}
          <table className="hidden min-w-full divide-y divide-hairline-soft md:table dark:divide-dark-hairline">
            <thead>
              <tr className="bg-canvas/50 text-left font-mono text-[11px] uppercase tracking-wider text-muted-soft dark:bg-dark-surface-soft dark:text-on-dark-soft">
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Student ID</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline-soft font-sans text-body-sm text-ink dark:divide-dark-hairline dark:text-on-dark">
              {paginated.length === 0 ? (
                <tr>
                  <td className="px-6 py-8 text-center text-muted dark:text-on-dark-soft" colSpan={5}>
                    {searchActive || roleFilter !== 'all' ? 'No users match these filters.' : 'No users found.'}
                  </td>
                </tr>
              ) : (
                paginated.map((row) => (
                  <tr key={row.id} className="transition hover:bg-canvas/60 dark:hover:bg-dark-surface-soft/60">
                    <td className="px-6 py-4">
                      <Link href={`/dashboard/admin/users/${row.id}`} className="flex items-center gap-3">
                        <UserAvatar
                          name={row.fullName || row.email}
                          size="md"
                          tone={row.role === 'admin' ? 'red' : row.role === 'staff' ? 'gold' : 'charcoal'}
                        />
                        <span className="truncate font-mono text-body-sm">{row.email}</span>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/dashboard/admin/users/${row.id}`} className="block truncate">
                        {row.fullName || <span className="text-muted-soft">—</span>}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/dashboard/admin/users/${row.id}`} className="block font-mono text-code">
                        {row.studentId || <span className="text-muted-soft">—</span>}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/dashboard/admin/users/${row.id}`}>
                        <RoleBadge role={row.role} />
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/dashboard/admin/users/${row.id}`} className="inline-flex" aria-label="Edit user">
                        <ChevronRightIcon className="h-5 w-5 text-muted-soft" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Mobile cards */}
          <div className="divide-y divide-hairline-soft bg-surface-card dark:divide-dark-hairline dark:bg-dark-surface-card md:hidden">
            {paginated.length === 0 ? (
              <p className="px-4 py-8 text-center text-muted dark:text-on-dark-soft">
                {searchActive || roleFilter !== 'all' ? 'No users match these filters.' : 'No users found.'}
              </p>
            ) : (
              paginated.map((row) => (
                <Link
                  key={row.id}
                  href={`/dashboard/admin/users/${row.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition hover:bg-canvas/60 dark:hover:bg-dark-surface-soft/60"
                >
                  <UserAvatar
                    name={row.fullName || row.email}
                    size="lg"
                    tone={row.role === 'admin' ? 'red' : row.role === 'staff' ? 'gold' : 'charcoal'}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-title-md text-ink dark:text-on-dark">
                      {row.fullName || 'Unnamed user'}
                    </p>
                    <p className="truncate font-mono text-[11px] text-muted dark:text-on-dark-soft">
                      {row.email}
                    </p>
                  </div>
                  <RoleBadge role={row.role} />
                  <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-muted-soft" />
                </Link>
              ))
            )}
          </div>

          {/* Pagination */}
          {visibleRows.length > 0 && (
            <footer className="flex flex-col gap-3 border-t border-hairline-soft px-6 py-4 md:flex-row md:items-center md:justify-between dark:border-dark-hairline">
              <p className="font-mono text-[11px] text-muted dark:text-on-dark-soft">
                Showing {start + 1}–{Math.min(start + PAGE_SIZE, visibleRows.length)} of {visibleRows.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={safePage === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-btn border border-hairline bg-canvas px-3 py-1 font-sans text-caption font-semibold uppercase text-ink transition hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-hairline dark:bg-dark-surface-soft dark:text-on-dark"
                >
                  Previous
                </button>
                <span className="font-mono text-[11px] text-muted dark:text-on-dark-soft">
                  Page {safePage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={safePage === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-btn border border-hairline bg-canvas px-3 py-1 font-sans text-caption font-semibold uppercase text-ink transition hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-hairline dark:bg-dark-surface-soft dark:text-on-dark"
                >
                  Next
                </button>
              </div>
            </footer>
          )}
        </section>
      </AdminShell>
    </>
  );
}
```

- [ ] **Step 2: Verify build passes (Add-user button is wired in Task 6).**

Run: `pnpm build`
Expected: build succeeds; `usersList.tsx` compiles. Existing page is unchanged.

- [ ] **Step 3: Commit.**

```bash
git add app/ui/dashboard/admin/usersList.tsx
git commit -m "feat(admin/users): UsersList component (read-only, role tabs, tap-to-detail)"
```

---

## Task 6: Build `<AddUserDialog>` modal and wire it into UsersList

**Files:**
- Create: `app/ui/dashboard/admin/addUserDialog.tsx`
- Modify: `app/ui/dashboard/admin/usersList.tsx` (open the dialog from the Add-user button + accept onAdded callback)

The modal mirrors the existing two-step flow in `usersManager.tsx`: collect email/name/role → confirm → call `addUserAction` → on success close + return the new user upward.

- [ ] **Step 1: Create `app/ui/dashboard/admin/addUserDialog.tsx`.**

```tsx
'use client';

import { useEffect, useState, useTransition, type FormEvent } from 'react';
import { addUserAction } from '@/app/actions/addUser';
import RoleSelect from '@/app/ui/dashboard/primitives/RoleSelect';
import { roleOptions, type ManagedRole } from '@/app/ui/dashboard/admin/userProfileFields';

type Props = {
  open: boolean;
  onClose: () => void;
  // addUserAction returns only `{ success, error }` (see app/actions/addUser.ts);
  // it does NOT return the inserted user. So the consumer should call router.refresh()
  // when this fires to re-fetch the list from the server, rather than trying to
  // optimistically prepend a partial row without an id.
  onAdded: () => void;
};

const initialState = { email: '', fullName: '', role: 'user' as ManagedRole };

export default function AddUserDialog({ open, onClose, onAdded }: Props) {
  const [form, setForm] = useState(initialState);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Reset state every time the dialog opens.
  useEffect(() => {
    if (open) {
      setForm(initialState);
      setConfirming(false);
      setError(null);
    }
  }, [open]);

  // Lock background scroll while open.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  if (!open) return null;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const trimmedEmail = form.email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError('Email is required.');
      return;
    }
    if (
      (form.role === 'staff' || form.role === 'admin') &&
      !trimmedEmail.endsWith('@swinburne.edu.my')
    ) {
      setError('Staff and admin must use their Swinburne Outlook email addresses.');
      return;
    }
    setConfirming(true);
  };

  const handleConfirm = () => {
    startTransition(async () => {
      const trimmedName = form.fullName.trim();
      const result = await addUserAction({
        email: form.email.trim().toLowerCase(),
        display_name: trimmedName || undefined,
        role: form.role,
      });
      if (!result.success) {
        setError(result.error ?? 'Failed to add user.');
        setConfirming(false);
        return;
      }
      onAdded();
      onClose();
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 dark:bg-dark-canvas/60"
    >
      <div className="w-full max-w-md overflow-hidden rounded-card border border-hairline bg-canvas shadow-lg dark:border-dark-hairline dark:bg-dark-surface-card">
        <header className="flex items-center justify-between border-b border-hairline-soft px-6 py-4 dark:border-dark-hairline">
          <h2 className="font-display text-display-sm text-ink dark:text-on-dark">
            {confirming ? 'Confirm new user' : 'Add user'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="font-sans text-caption text-muted hover:text-ink dark:text-on-dark-soft dark:hover:text-on-dark"
          >
            Close
          </button>
        </header>

        <div className="px-6 py-5">
          {error && (
            <p className="mb-4 rounded-btn border border-primary/30 bg-primary/10 px-3 py-2 font-sans text-body-sm text-primary dark:text-dark-primary">
              {error}
            </p>
          )}

          {!confirming ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                <span className="mb-1 block font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">Email</span>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="person@swinburne.edu.my"
                  className="h-10 w-full rounded-btn border border-hairline bg-canvas px-3.5 font-sans text-body-md text-ink placeholder:text-muted-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:border-dark-hairline dark:bg-dark-surface-soft dark:text-on-dark"
                />
              </label>
              <label className="block">
                <span className="mb-1 block font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">Full name</span>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                  placeholder="Full name"
                  className="h-10 w-full rounded-btn border border-hairline bg-canvas px-3.5 font-sans text-body-md text-ink placeholder:text-muted-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:border-dark-hairline dark:bg-dark-surface-soft dark:text-on-dark"
                />
              </label>
              <label className="block">
                <span className="mb-1 block font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">Role</span>
                <RoleSelect
                  value={form.role}
                  onChange={(role) => setForm((prev) => ({ ...prev, role }))}
                  options={roleOptions}
                />
              </label>
              <p className="font-sans text-caption text-muted dark:text-on-dark-soft">
                Staff and admin must use their Swinburne Outlook email addresses.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-btn border border-hairline bg-canvas px-4 py-2 font-sans text-button text-ink transition hover:border-primary/30 hover:text-primary dark:border-dark-hairline dark:bg-dark-surface-soft dark:text-on-dark"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-btn bg-primary px-4 py-2 font-sans text-button text-on-primary transition hover:bg-primary-active dark:bg-dark-primary"
                >
                  Continue
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="font-sans text-body-md text-ink dark:text-on-dark">
                You are about to create an account for{' '}
                <span className="font-semibold">{form.email.trim().toLowerCase()}</span>{' '}
                with the role <span className="font-semibold">{form.role}</span>. Proceed?
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setConfirming(false)}
                  className="rounded-btn border border-hairline bg-canvas px-4 py-2 font-sans text-button text-ink transition disabled:opacity-50 dark:border-dark-hairline dark:bg-dark-surface-soft dark:text-on-dark"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={handleConfirm}
                  className="rounded-btn bg-primary px-4 py-2 font-sans text-button text-on-primary transition hover:bg-primary-active disabled:opacity-50 dark:bg-dark-primary"
                >
                  {pending ? 'Creating…' : 'Create user'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire the dialog into `UsersList`.**

In `app/ui/dashboard/admin/usersList.tsx`:

(a) Add the imports at the top:

```ts
import { useRouter } from 'next/navigation';
import AddUserDialog from '@/app/ui/dashboard/admin/addUserDialog';
```

(b) Inside the component, add the router and dialog state:

```ts
const router = useRouter();
const [showAddDialog, setShowAddDialog] = useState(false);
```

(c) Update the Add-user button `onClick`:

```tsx
onClick={() => setShowAddDialog(true)}
```

(d) Below the closing `</AdminShell>`, before the outer `</>`:

```tsx
<AddUserDialog
  open={showAddDialog}
  onClose={() => setShowAddDialog(false)}
  onAdded={() => router.refresh()}
/>
```

(`router.refresh()` re-fetches the server component above us so the new
user appears without a hard reload.)

- [ ] **Step 3: Run the build, confirm no errors.**

Run: `pnpm build`
Expected: build succeeds. Note: existing page still renders the old UsersManager — we wire the new list in Task 9.

- [ ] **Step 4: Commit.**

```bash
git add app/ui/dashboard/admin/addUserDialog.tsx app/ui/dashboard/admin/usersList.tsx
git commit -m "feat(admin/users): AddUserDialog modal wired into UsersList"
```

---

## Task 7: Build `<UserDetailForm>` for the detail page

**Files:**
- Create: `app/ui/dashboard/admin/userDetailForm.tsx`

The detail form has three cards:
1. Profile (email, full name, student ID, role + every other `user_profile` field driven by `PROFILE_FIELD_CONFIG`)
2. Recent activity (read-only list of last 5 loans)
3. Danger zone (Delete account button + confirmation modal)

It calls `updateUserAction` for save and `deleteUserAction` for delete.

- [ ] **Step 1: Create the file.**

```tsx
'use client';

import { useMemo, useState, useTransition, type ChangeEvent, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, TrashIcon } from '@heroicons/react/24/outline';
import AdminShell from '@/app/ui/dashboard/adminShell';
import UserAvatar from '@/app/ui/dashboard/primitives/UserAvatar';
import RoleSelect from '@/app/ui/dashboard/primitives/RoleSelect';
import RoleBadge from '@/app/ui/dashboard/primitives/RoleBadge';
import ConfirmModal from '@/app/ui/dashboard/confirmModal';
import {
  type ManagedRole,
  type ManagedUser,
  type FieldType,
  PROFILE_FIELD_CONFIG,
  inferFieldType,
  toInputValue,
  sanitizeProfileRow,
  sanitizeProfileValues,
  toTitleCase,
  roleOptions,
  getProfileKeys,
} from '@/app/ui/dashboard/admin/userProfileFields';
import { updateUserAction } from '@/app/actions/updateUser';
import { deleteUserAction } from '@/app/actions/deleteUser';
import type { ManagedUserRow, RecentLoanEntry } from '@/app/lib/supabase/queries';

type Props = {
  user: ManagedUserRow;
  recentLoans: RecentLoanEntry[];
};

const buildManagedUser = (raw: ManagedUserRow): ManagedUser => {
  const profile = sanitizeProfileRow(raw.profile as Record<string, unknown> | null | undefined);
  const profileFieldTypes: Record<string, FieldType> = {};
  const profileValues: Record<string, string> = {};
  Object.entries(profile).forEach(([key, value]) => {
    const type = inferFieldType(key, value);
    profileFieldTypes[key] = type;
    profileValues[key] = toInputValue(value, type);
  });
  const role: ManagedRole =
    raw.role === 'admin' ? 'admin' : raw.role === 'staff' || raw.role === 'librarian' ? 'staff' : 'user';
  return {
    id: raw.id,
    email: raw.email,
    role,
    fullName:
      (typeof profileValues.display_name === 'string' && profileValues.display_name) ||
      (typeof raw.display_name === 'string' && raw.display_name) ||
      '',
    accountDisplayName:
      (typeof raw.display_name === 'string' && raw.display_name) || '',
    createdAt: raw.created_at ?? null,
    updatedAt: raw.updated_at ?? null,
    profile: profileValues,
    profileFieldTypes,
  };
};

const formatRelative = (iso: string): string => {
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
};

const ACTION_LABEL: Record<RecentLoanEntry['action'], string> = {
  borrowed: 'Borrowed',
  returned: 'Returned',
  renewed: 'Renewed',
};

export default function UserDetailForm({ user: initial, recentLoans }: Props) {
  const router = useRouter();
  const [user, setUser] = useState<ManagedUser>(() => buildManagedUser(initial));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const profileKeys = useMemo(() => getProfileKeys(user), [user]);

  const updateField = (patch: Partial<ManagedUser>) => setUser((prev) => ({ ...prev, ...patch }));
  const updateProfileValue = (key: string, value: string) => {
    setUser((prev) => ({
      ...prev,
      profile: { ...prev.profile, [key]: value },
      // Sync the top-level fullName when display_name is edited.
      ...(key === 'display_name' ? { fullName: value } : {}),
    }));
  };

  const handleSave = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setStatus(null);

    const sanitized = sanitizeProfileValues(user.profile, user.profileFieldTypes);
    if (!sanitized.ok) {
      setError(sanitized.error);
      return;
    }

    startTransition(async () => {
      const result = await updateUserAction({
        id: user.id,
        user: {
          email: user.email,
          role: user.role,
          display_name: user.fullName,
        },
        profile: sanitized.payload,
      });
      if (!result.success) {
        setError(result.error ?? 'Failed to save changes.');
        return;
      }
      setStatus('Changes saved.');
      router.refresh();
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteUserAction(user.id);
      if (!result.success) {
        setError(result.error ?? 'Failed to delete user.');
        setConfirmDelete(false);
        return;
      }
      router.replace('/dashboard/admin/users');
    });
  };

  return (
    <>
      <title>{`${user.fullName || user.email} | User detail`}</title>
      <AdminShell
        titleSubtitle={`User · ${user.role.toUpperCase()}`}
        title={user.fullName || user.email}
        description={user.email}
        primaryAction={
          <Link
            href="/dashboard/admin/users"
            className="inline-flex items-center gap-1.5 rounded-btn border border-hairline dark:border-dark-hairline bg-surface-card dark:bg-dark-surface-card px-3.5 py-2.5 font-sans text-button text-ink/80 dark:text-on-dark/80 transition hover:border-primary/30 hover:text-ink dark:hover:text-on-dark"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to users
          </Link>
        }
      >
        <form onSubmit={handleSave} className="space-y-6">
          {/* Identity */}
          <section className="flex items-center gap-4 rounded-card border border-hairline bg-surface-card p-5 dark:border-dark-hairline dark:bg-dark-surface-card">
            <UserAvatar
              name={user.fullName || user.email}
              size="lg"
              tone={user.role === 'admin' ? 'red' : user.role === 'staff' ? 'gold' : 'charcoal'}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-display-sm text-ink dark:text-on-dark">
                {user.fullName || 'Unnamed user'}
              </p>
              <p className="truncate font-mono text-code text-muted dark:text-on-dark-soft">{user.email}</p>
            </div>
            <RoleBadge role={user.role} />
          </section>

          {(error || status) && (
            <p
              className={
                error
                  ? 'rounded-btn border border-primary/30 bg-primary/10 px-3 py-2 font-sans text-body-sm text-primary dark:text-dark-primary'
                  : 'rounded-btn border border-success/30 bg-success/10 px-3 py-2 font-sans text-body-sm text-success'
              }
            >
              {error ?? status}
            </p>
          )}

          {/* Profile card */}
          <section className="rounded-card border border-hairline bg-surface-card p-6 dark:border-dark-hairline dark:bg-dark-surface-card">
            <h2 className="mb-4 font-display text-display-sm text-ink dark:text-on-dark">Profile</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Email">
                <input
                  type="email"
                  value={user.email}
                  onChange={(e) => updateField({ email: e.target.value })}
                  className="h-10 w-full rounded-btn border border-hairline bg-canvas px-3.5 font-sans text-body-md text-ink dark:border-dark-hairline dark:bg-dark-surface-soft dark:text-on-dark"
                />
              </Field>
              <Field label="Full name">
                <input
                  type="text"
                  value={user.fullName}
                  onChange={(e) => updateField({ fullName: e.target.value })}
                  className="h-10 w-full rounded-btn border border-hairline bg-canvas px-3.5 font-sans text-body-md text-ink dark:border-dark-hairline dark:bg-dark-surface-soft dark:text-on-dark"
                />
              </Field>
              <Field label="Role">
                <RoleSelect
                  value={user.role}
                  onChange={(role) => updateField({ role })}
                  options={roleOptions}
                />
              </Field>
              {profileKeys
                .filter((key) => key !== 'display_name')
                .map((key) => {
                  const config = PROFILE_FIELD_CONFIG[key];
                  const type = user.profileFieldTypes[key] ?? config?.type ?? inferFieldType(key, user.profile[key]);
                  const label = config?.label ?? toTitleCase(key);
                  const value = user.profile[key] ?? '';

                  if (type === 'select' && config?.options) {
                    return (
                      <Field key={key} label={label} description={config.description}>
                        <select
                          value={value}
                          onChange={(e: ChangeEvent<HTMLSelectElement>) => updateProfileValue(key, e.target.value)}
                          className="h-10 w-full rounded-btn border border-hairline bg-canvas px-3.5 font-sans text-body-md text-ink dark:border-dark-hairline dark:bg-dark-surface-soft dark:text-on-dark"
                        >
                          <option value="">—</option>
                          {config.options.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </Field>
                    );
                  }

                  if (type === 'textarea' || type === 'json') {
                    return (
                      <Field key={key} label={label} description={config?.description} wide>
                        <textarea
                          value={value}
                          rows={config?.rows ?? 4}
                          onChange={(e) => updateProfileValue(key, e.target.value)}
                          maxLength={config?.maxLength}
                          placeholder={config?.placeholder}
                          className="w-full rounded-btn border border-hairline bg-canvas px-3.5 py-2 font-sans text-body-md text-ink dark:border-dark-hairline dark:bg-dark-surface-soft dark:text-on-dark"
                        />
                      </Field>
                    );
                  }

                  return (
                    <Field key={key} label={label} description={config?.description}>
                      <input
                        type={type === 'number' ? 'number' : 'text'}
                        value={value}
                        onChange={(e) => updateProfileValue(key, e.target.value)}
                        maxLength={config?.maxLength}
                        placeholder={config?.placeholder}
                        className="h-10 w-full rounded-btn border border-hairline bg-canvas px-3.5 font-sans text-body-md text-ink dark:border-dark-hairline dark:bg-dark-surface-soft dark:text-on-dark"
                      />
                    </Field>
                  );
                })}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Link
                href="/dashboard/admin/users"
                className="rounded-btn border border-hairline bg-canvas px-4 py-2 font-sans text-button text-ink transition hover:border-primary/30 hover:text-primary dark:border-dark-hairline dark:bg-dark-surface-soft dark:text-on-dark"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={pending}
                className="rounded-btn bg-primary px-4 py-2 font-sans text-button text-on-primary transition hover:bg-primary-active disabled:opacity-60 dark:bg-dark-primary"
              >
                {pending ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </section>

          {/* Recent activity */}
          <section className="rounded-card border border-hairline bg-surface-card p-6 dark:border-dark-hairline dark:bg-dark-surface-card">
            <h2 className="mb-3 font-display text-display-sm text-ink dark:text-on-dark">Recent activity</h2>
            {recentLoans.length === 0 ? (
              <p className="font-sans text-body-md text-muted dark:text-on-dark-soft">No loan activity yet.</p>
            ) : (
              <ul className="divide-y divide-hairline-soft dark:divide-dark-hairline">
                {recentLoans.map((loan) => {
                  const stamp = loan.action === 'returned' && loan.returnedAt ? loan.returnedAt : loan.borrowedAt;
                  return (
                    <li key={loan.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate font-sans text-body-md text-ink dark:text-on-dark">
                          <span className="font-semibold">{ACTION_LABEL[loan.action]}</span>{' '}
                          “{loan.book.title}”
                        </p>
                        {loan.book.author && (
                          <p className="truncate font-mono text-code text-muted dark:text-on-dark-soft">
                            {loan.book.author}
                          </p>
                        )}
                      </div>
                      <span className="font-mono text-[11px] text-muted-soft dark:text-on-dark-soft">
                        {formatRelative(stamp)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Danger zone */}
          <section className="rounded-card border border-primary/30 bg-primary/5 p-6 dark:border-dark-primary/30 dark:bg-dark-primary/10">
            <h2 className="mb-1 font-display text-display-sm text-primary dark:text-dark-primary">Danger zone</h2>
            <p className="mb-4 font-sans text-body-md text-ink/80 dark:text-on-dark/80">
              Deleting an account permanently removes the user and disconnects their loan history.
            </p>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 rounded-btn border border-primary/40 bg-canvas px-3.5 py-2 font-sans text-button text-primary transition hover:bg-primary/10 dark:border-dark-primary/40 dark:bg-dark-surface-soft dark:text-dark-primary"
            >
              <TrashIcon className="h-4 w-4" />
              Delete account
            </button>
          </section>
        </form>
      </AdminShell>

      <ConfirmModal
        isOpen={confirmDelete}
        type="danger"
        title="Delete user"
        message={`Delete ${user.fullName || user.email}? This cannot be undone.`}
        confirmText={pending ? 'Deleting…' : 'Delete user'}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
      />
    </>
  );
}

type FieldProps = {
  label: string;
  description?: string;
  wide?: boolean;
  children: React.ReactNode;
};

function Field({ label, description, wide, children }: FieldProps) {
  return (
    <label className={wide ? 'block md:col-span-2' : 'block'}>
      <span className="mb-1 block font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">{label}</span>
      {children}
      {description && (
        <span className="mt-1 block font-sans text-caption text-muted-soft dark:text-on-dark-soft">{description}</span>
      )}
    </label>
  );
}
```

- [ ] **Step 2: Verify build passes (no consumer yet — Task 8 wires it).**

Run: `pnpm build`
Expected: build succeeds.

- [ ] **Step 3: Commit.**

```bash
git add app/ui/dashboard/admin/userDetailForm.tsx
git commit -m "feat(admin/users): UserDetailForm with profile, recent activity, danger zone"
```

---

## Task 8: Create the detail page route `/dashboard/admin/users/[id]`

**Files:**
- Create: `app/dashboard/admin/users/[id]/page.tsx`

Server component that loads the user + their recent loans and renders `<UserDetailForm>`.

- [ ] **Step 1: Create the file.**

```tsx
import { notFound, redirect } from 'next/navigation';
import { getDashboardSession } from '@/app/lib/auth/session';
import { fetchManagedUserById, fetchRecentLoansByUser } from '@/app/lib/supabase/queries';
import UserDetailForm from '@/app/ui/dashboard/admin/userDetailForm';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminUserDetailPage({ params }: PageProps) {
  const { user } = await getDashboardSession();
  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect('/dashboard');

  const { id } = await params;
  const target = await fetchManagedUserById(id);
  if (!target) notFound();

  const recentLoans = await fetchRecentLoansByUser(id, 5);

  return <UserDetailForm user={target} recentLoans={recentLoans} />;
}
```

- [ ] **Step 2: Run the build.**

Run: `pnpm build`
Expected: build succeeds. The new route appears in the build output as `/dashboard/admin/users/[id]`.

- [ ] **Step 3: Commit.**

```bash
git add app/dashboard/admin/users/[id]/page.tsx
git commit -m "feat(admin/users): /admin/users/[id] detail route"
```

---

## Task 9: Wire `<UsersList>` into the existing list page

**Files:**
- Modify: `app/dashboard/admin/users/page.tsx`

Replace the `UsersManager` import + render with `UsersList`.

- [ ] **Step 1: Replace the file content.**

```tsx
import { redirect } from 'next/navigation';
import { getDashboardSession } from '@/app/lib/auth/session';
import { fetchManagedUsers } from '@/app/lib/supabase/queries';
import UsersList from '@/app/ui/dashboard/admin/usersList';

export default async function UsersPage() {
  const { user } = await getDashboardSession();
  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect('/dashboard');

  const initialUsers = await fetchManagedUsers();

  return <UsersList initialUsers={initialUsers} />;
}
```

- [ ] **Step 2: Run the build.**

Run: `pnpm build`
Expected: build succeeds. Both `/dashboard/admin/users` and `/dashboard/admin/users/[id]` show up in the route table.

- [ ] **Step 3: Commit.**

```bash
git add app/dashboard/admin/users/page.tsx
git commit -m "feat(admin/users): swap UsersManager for new UsersList"
```

---

## Task 10: Delete the obsolete `usersManager.tsx`

**Files:**
- Delete: `app/ui/dashboard/admin/usersManager.tsx`

Nothing imports it anymore. Confirm with grep before deleting.

- [ ] **Step 1: Verify zero imports remain.**

Run: `grep -rn "usersManager" app/ __tests__/ 2>/dev/null`
Expected: no matches (or only references in `userProfileFields.ts` comments, which are fine).

If there is a stale import, fix it before deleting.

- [ ] **Step 2: Delete the file and rebuild.**

```bash
git rm app/ui/dashboard/admin/usersManager.tsx
pnpm build
```

Expected: build still passes.

- [ ] **Step 3: Commit.**

```bash
git commit -m "chore(admin/users): delete obsolete usersManager.tsx"
```

---

## Task 11: Build verification + manual smoke test

**Files:**
- None (verification only)

- [ ] **Step 1: Run the full test suite.**

Run: `pnpm test`
Expected: all tests pass, including the two new tests added in this plan.

- [ ] **Step 2: Run the production build.**

Run: `pnpm build`
Expected: clean build; both `/dashboard/admin/users` and `/dashboard/admin/users/[id]` appear in the route table.

- [ ] **Step 3: Manual smoke test against the running dev server.**

Run: `pnpm dev`

As an admin (use `DEV_BYPASS_AUTH=true DEV_BYPASS_ROLE=admin` if not signed in via Azure AD):

1. Visit `/dashboard/admin/users` — list renders with role tabs and search.
2. Type a name in search — counts on each tab update; row count updates.
3. Click "Staff" tab — only staff rows visible; counts unchanged.
4. Click any row — navigates to `/dashboard/admin/users/[id]`.
5. On detail page: change the role via `RoleSelect`, click Save — success message appears.
6. Click "Back to users" — returns to list.
7. From list, click "Add user" — modal opens; complete the flow; new user appears at the top of the list.
8. From a detail page, click "Delete account" — confirm modal opens; cancel; click again, confirm — redirected to list, user gone.
9. Resize browser to mobile width — list shows card-style rows; tap a card to land on detail page; layout looks clean (no inline cell editing).

If everything passes, the implementation is done.

- [ ] **Step 4: Final commit (if any cleanup needed) and push.**

```bash
git push
```

---

## Self-review

This plan covers every spec section:

| Spec section | Tasks |
|---|---|
| Page architecture | 5, 7, 8, 9, 10 |
| List page layout | 4, 5 |
| Detail page | 7, 8 |
| Add-user modal | 6 |
| Data flow | 2, 3, 9 |
| What gets removed | 10 |
| Recent activity card | 2, 7 |
| Role tabs with counts | 4 |
| Tap-to-detail (mobile + desktop) | 5 |
| Danger zone delete | 7 |
| Tests | 2 (query helper), 4 (count logic), 11 (manual smoke) |

No placeholders. Every code-bearing step contains the actual code.
Type names are consistent across tasks (`ManagedRole`, `ManagedUser`,
`ManagedUserRow`, `RecentLoanEntry`, `RoleTab`, `RoleCounts`).
