# Admin Users Page Redesign — Design Spec

**Date:** 2026-05-08
**Branch:** Kelvin-v3.3.0-Sprint3
**Owner:** Kelvin (project owner)
**Status:** Approved, ready for implementation plan

## Summary

Replace the single 1109-line `app/ui/dashboard/admin/usersManager.tsx`
"do everything in one screen" page with a calmer **list page** plus a
dedicated **detail page** plus a focused **add-user modal**. Add a role
filter (tabs with counts) and tap-to-detail rows on both desktop and
mobile. The whole experience must use the warm-canvas tokens documented
in `DESIGN.md` and the `AdminShell` chrome that other admin pages
already use.

## Problem

The current `/dashboard/admin/users` page has three pain points the
project owner wants fixed:

1. **The table is too cramped.** Every row exposes inline `<input>`
   elements for email, full name, student ID, plus a separate role
   badge and role `<select>` side by side, plus three action buttons,
   plus an expandable detail panel. Reading is hard; accidental edits
   are easy.
2. **There is no role filter.** With student/staff/admin all mixed in
   one list, finding "the staff member I just added" requires
   scrolling or a freeform search.
3. **The Add-user form takes the entire top of the page** even though
   admins create new accounts rarely (most users are auto-provisioned
   on first Azure AD sign-in).

Search precision (the original user message asked for search by name
or student ID) was raised but not selected as a top pain point — the
current "search by any field" already covers name/student_id; only the
placeholder copy needs to change. No new search architecture is
proposed.

## Goals

- **List page** is read-only and scannable. Each row navigates to the
  detail page on click (desktop *and* mobile).
- **Detail page** at `/dashboard/admin/users/[id]` provides editing,
  recent-activity context, and a clearly separated delete action.
- **Add user** moves into a modal triggered from the AdminShell
  primaryAction button.
- **Role filter** sits above the table as a tab group with live counts.
- All surfaces follow `DESIGN.md`: warm-canvas tokens, `AdminShell`
  chrome, `font-display` headings, `caption-uppercase` for tab labels,
  `rounded-pill` / `rounded-card`, role-tinted accents (primary for
  admin, accent-amber for staff, neutral for student).
- All existing server actions (`addUserAction`, `updateUserAction`,
  `deleteUserAction`) keep working without behavior changes — only
  their callers move.

## Non-Goals

- No change to the search algorithm. Only the placeholder text changes
  to "Search by name or student ID…".
- No new bulk operations (no multi-select, no batch role change).
- No new column sorting beyond what already exists.
- No change to how users are created in the underlying database (still
  goes through `addUserAction`).
- No change to the role permission matrix.
- No invite-by-email flow. Adding a user still creates the row directly.

## Page architecture

| Surface | Purpose | New / changed file |
|---|---|---|
| **List page** | Calm read-only directory of all users with search + role tabs + pagination | `app/dashboard/admin/users/page.tsx` (existing thin wrapper, unchanged) renders new `app/ui/dashboard/admin/usersList.tsx` (client) |
| **Detail page** | Edit one user, see recent activity, delete | New route `app/dashboard/admin/users/[id]/page.tsx` (server component) renders new `app/ui/dashboard/admin/userDetailForm.tsx` (client) |
| **Add-user modal** | Focused dialog opened from list page header | New `app/ui/dashboard/admin/addUserDialog.tsx` |

The existing `app/ui/dashboard/admin/usersManager.tsx` is **deleted**.
Its responsibilities split as follows:

- List rendering, search, role tabs, pagination → `usersList.tsx`
- The expandable `UserDetailEditor` form → `userDetailForm.tsx` (now on
  its own page)
- The always-on "Add staff member" `<section>` → `addUserDialog.tsx`
  (now a modal)
- The desktop-table inline cell `<input>` boxes → removed entirely

## List page (`/dashboard/admin/users`)

**Chrome:** `AdminShell` with `title="User Management"`,
`titleSubtitle="Admin Control Center"`, and a `primaryAction` slot
containing an "Add user" button. Clicking the button opens
`<AddUserDialog>`.

**Header strip** (above the table, inside the same card):

- **Role tabs** on the left: `All N` · `Students N` · `Staff N` ·
  `Admins N`. Tabs are pill-shaped, active tab uses primary tint
  (matching DESIGN.md). Counts reflect the *current search-filtered*
  dataset (e.g. searching "Kelvin" updates every tab's count to "users
  named Kelvin who have that role"). The role tab then narrows the
  visible rows further. Counts and selection are independent: clicking
  "Staff 2" never disables other tabs, only swaps which segment is
  shown.
- **Search input** on the right with placeholder "Search by name or
  student ID…". Search behaviour itself is unchanged from today (still
  matches across email, full name, student_id, role).

**Table (desktop):**

| Column | Content |
|---|---|
| Identity | `UserAvatar` + email |
| Name | full name (read-only text) |
| Student ID | student_id (read-only text) |
| Role | colored pill, **display only**, no `<select>` here |
| (chevron) | `ChevronRightIcon` to suggest navigation |

The whole `<tr>` is wrapped in a `<Link>` to
`/dashboard/admin/users/${user.id}`. Hover highlights the row.

**Mobile (≤md breakpoint):**

A vertical list of cards (one per user). Each card shows avatar,
name, role pill, and email. Whole card is a `<Link>` — no inline edits,
no expanding panel.

**Pagination:** unchanged — Previous / Page N of M / Next.

## Detail page (`/dashboard/admin/users/[id]`)

**Chrome:** `AdminShell` with:

- `title` = user's full name (or email if no name)
- `titleSubtitle` = "User · {ROLE}" (e.g. "User · ADMIN")
- `primaryAction` = "Back to users" link

**Cards in order:**

1. **Identity card.** Avatar (using existing `UserAvatar`, sized "lg",
   tone matching role), full name as display heading, email and
   student_id as monospace metadata.

2. **Profile card** — editable form, replaces the existing
   `UserDetailEditor`:
   - Email (`<input type="email">`)
   - Full name (`<input type="text">`)
   - Student ID (`<input type="text">`)
   - Role (the new `RoleSelect` primitive)
   - All extended `user_profile` fields the existing `UserDetailEditor`
     exposes today (the implementation plan will enumerate the exact
     field list from `UserDetailEditor`'s current schema; the redesign
     must not lose any field that's editable today).
   - Footer: `[Cancel]` returns to `/dashboard/admin/users`,
     `[Save changes]` calls `updateUserAction` (existing).

3. **Recent activity card.** Last 5 loans for this user, newest first.
   Each row shows: book title, action (Borrowed / Returned / Renewed),
   relative timestamp ("7d ago"). No "View all activity" link in this
   release — keep the card simple. If the user has no loan history,
   render a muted empty state: "No loan activity yet."
   - Requires a new query helper:
     `fetchRecentLoansByUser(userId: string, limit = 5)` in
     `app/lib/supabase/queries.ts`. Pulls from the same `Loans` table
     as existing history queries; minimal new code.

4. **Danger zone card.** Sole control: a destructive "Delete account"
   button. On click, opens a confirmation modal ("Delete {name}? This
   cannot be undone."). Calls `deleteUserAction` on confirmation. On
   success: redirects to `/dashboard/admin/users` with a success
   toast.

## Add-user modal

Triggered from the list page's `primaryAction` button.

**Fields** (same as today):

- Email (validated against `@swinburne.edu.my` for staff/admin —
  existing rule, preserved)
- Full name
- Role (`RoleSelect`)

**Flow:**

1. Click "Add user" → modal opens, focuses email input.
2. Submit → confirmation step ("About to create '{email}' with role
   '{role}'. Proceed?") — preserves existing two-step confirmation
   from `usersManager.tsx`.
3. On confirm → `addUserAction` (existing).
4. On success → modal closes, the new user is optimistically prepended
   to the local list, success message shown.
5. On error → error message inside the modal; modal stays open.

**Cancel** anywhere → modal closes, no state changes.

## Data flow

- **List page:**
  `app/dashboard/admin/users/page.tsx` (server component) calls the
  existing `fetchManagedUsers()` and passes the result to
  `<UsersList initialUsers=...>`. `UsersList` owns local state for
  `searchTerm`, `roleFilter` ('all' | 'user' | 'staff' | 'admin'), and
  `page`. All filtering happens client-side on the in-memory array,
  same as today.
- **Detail page:** new server component fetches one user by id (new
  helper `fetchManagedUserById(id)`) plus recent loans (new helper
  `fetchRecentLoansByUser`). Renders `<UserDetailForm initialUser=...
  recentLoans=...>`.
- **Mutations:** all three existing server actions (`addUserAction`,
  `updateUserAction`, `deleteUserAction`) keep their current
  signatures. After a mutation, callers either optimistically update
  the local array (list page) or `router.refresh()` (detail page).

## What gets removed

- `app/ui/dashboard/admin/usersManager.tsx` (whole file)
- `UserDetailEditor` inline expansion (functionality moves to detail
  page)
- The always-on `<section>` for "Add staff member" (moves to modal)
- The per-cell `<input>` boxes in the desktop table
- The expanded-row `<tr>` markup in the table

## What stays

- `app/dashboard/admin/users/page.tsx` (the thin server-component
  wrapper)
- `app/ui/dashboard/primitives/RoleSelect.tsx` (just built)
- `app/ui/dashboard/primitives/RoleBadge.tsx` (used in detail page
  header)
- `UserAvatar` primitive
- All three server actions
- The mobile vs desktop responsive split (mobile becomes tap-to-detail
  list; desktop becomes tap-to-detail table)

## Design tokens & visual references

All surfaces use the existing tokens from `DESIGN.md`:

- `bg-canvas` / `bg-surface-card` / `bg-dark-canvas` /
  `bg-dark-surface-card` for backgrounds
- `border-hairline` / `border-dark-hairline` for separators
- `text-ink` / `text-on-dark` for primary text
- `text-muted-soft` / `text-on-dark-soft` for de-emphasized text
- `font-display` (Copernicus serif) for h1/h2 headings
- `font-sans` for body, `font-mono` for code/IDs
- `caption-uppercase` (12px tracked) for tab labels and column headers
- `rounded-pill` for tabs and badges, `rounded-card` for sections,
  `rounded-btn` for buttons and inputs
- Primary tint (`#cc785c`) for active states, accent-amber
  (`#e8a55a`) for staff role, neutral hairline for student role

## Testing

- Existing tests over server actions stay valid (signatures unchanged).
- **New tests:**
  - Detail page route: renders the form for a known user id; renders
    `notFound()` for an unknown id.
  - `fetchRecentLoansByUser` returns at most `limit` rows ordered by
    most recent first.
  - Role-tab filter: counts equal the underlying segments;
    selecting a tab narrows the visible rows.
- Manual verification:
  - Add user flow end-to-end as admin
  - Edit user flow end-to-end as admin
  - Delete user flow end-to-end with confirmation
  - Mobile (narrow viewport): tap a card, lands on detail page

## Out of scope (future ideas)

These came up in brainstorming but are explicitly deferred:

- "View all activity" deep-link from the Recent activity card
- Bulk operations (multi-select rows + batch role change)
- Column sorting beyond defaults
- Sending password reset / invite emails
- Soft-delete instead of hard-delete
