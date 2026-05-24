'use client';

import { useMemo, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRightIcon, PlusIcon } from '@heroicons/react/24/outline';
import AdminShell from '@/app/ui/dashboard/adminShell';
import UserAvatar from '@/app/ui/dashboard/primitives/UserAvatar';
import RoleBadge from '@/app/ui/dashboard/primitives/RoleBadge';
import RoleTabs, { computeRoleCounts, type RoleTab } from '@/app/ui/dashboard/admin/roleTabs';
import AddUserDialog from '@/app/ui/dashboard/admin/addUserDialog';
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

  const router = useRouter();
  const [showAddDialog, setShowAddDialog] = useState(false);

  const searchActive = searchTerm.trim().length > 0;

  const searchFiltered = useMemo(() => {
    if (!searchActive) return rows;
    const q = searchTerm.trim().toLowerCase();
    return rows.filter((row) =>
      row.email.toLowerCase().includes(q) ||
      row.fullName.toLowerCase().includes(q) ||
      row.studentId.toLowerCase().includes(q) ||
      row.role.toLowerCase().includes(q),
    );
  }, [rows, searchTerm, searchActive]);
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
            onClick={() => setShowAddDialog(true)}
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
                  <tr
                    key={row.id}
                    onClick={() => router.push(`/dashboard/admin/users/${row.id}`)}
                    className="cursor-pointer transition hover:bg-canvas/60 dark:hover:bg-dark-surface-soft/60"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          name={row.fullName || row.email}
                          size="md"
                          tone={row.role === 'admin' ? 'red' : row.role === 'staff' ? 'gold' : 'charcoal'}
                        />
                        <span className="truncate font-mono text-body-sm">{row.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 truncate">
                      {row.fullName || <span className="text-muted-soft">—</span>}
                    </td>
                    <td className="px-6 py-4 font-mono text-code">
                      {row.studentId || <span className="text-muted-soft">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      <RoleBadge role={row.role} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/dashboard/admin/users/${row.id}`}
                        aria-label={`View ${row.email}`}
                        onClick={(event) => event.stopPropagation()}
                        className="inline-flex"
                      >
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
      <AddUserDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onAdded={() => router.refresh()}
      />
    </>
  );
}
