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
  const [savePending, startSave] = useTransition();
  const [deletePending, startDelete] = useTransition();
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

    startSave(async () => {
      const result = await updateUserAction({
        id: user.id,
        user: {
          email: user.email.trim().toLowerCase(),
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
    setConfirmDelete(false);
    startDelete(async () => {
      const result = await deleteUserAction(user.id);
      if (!result.success) {
        setError(result.error ?? 'Failed to delete user.');
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
                  className="h-10 w-full rounded-btn border border-hairline bg-canvas px-3.5 font-sans text-body-md text-ink dark:border-dark-hairline dark:bg-dark-surface-soft dark:text-on-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-dark-canvas"
                />
              </Field>
              <Field label="Full name">
                <input
                  type="text"
                  value={user.fullName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setUser((prev) => ({
                      ...prev,
                      fullName: val,
                      profile: { ...prev.profile, display_name: val },
                    }));
                  }}
                  className="h-10 w-full rounded-btn border border-hairline bg-canvas px-3.5 font-sans text-body-md text-ink dark:border-dark-hairline dark:bg-dark-surface-soft dark:text-on-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-dark-canvas"
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
                          className="h-10 w-full rounded-btn border border-hairline bg-canvas px-3.5 font-sans text-body-md text-ink dark:border-dark-hairline dark:bg-dark-surface-soft dark:text-on-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-dark-canvas"
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
                          className="w-full rounded-btn border border-hairline bg-canvas px-3.5 py-2 font-sans text-body-md text-ink dark:border-dark-hairline dark:bg-dark-surface-soft dark:text-on-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-dark-canvas"
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
                        className="h-10 w-full rounded-btn border border-hairline bg-canvas px-3.5 font-sans text-body-md text-ink dark:border-dark-hairline dark:bg-dark-surface-soft dark:text-on-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-dark-canvas"
                      />
                    </Field>
                  );
                })}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Link
                href="/dashboard/admin/users"
                className="rounded-btn border border-hairline bg-canvas px-4 py-2 font-sans text-button text-ink transition hover:border-primary/30 hover:text-primary dark:border-dark-hairline dark:bg-dark-surface-soft dark:text-on-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-dark-canvas"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={savePending}
                className="rounded-btn bg-primary px-4 py-2 font-sans text-button text-on-primary transition hover:bg-primary-active disabled:opacity-60 dark:bg-dark-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-dark-canvas"
              >
                {savePending ? 'Saving…' : 'Save changes'}
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
                          &ldquo;{loan.book.title}&rdquo;
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
              className="inline-flex items-center gap-1.5 rounded-btn border border-primary/40 bg-canvas px-3.5 py-2 font-sans text-button text-primary transition hover:bg-primary/10 dark:border-dark-primary/40 dark:bg-dark-surface-soft dark:text-dark-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-dark-canvas"
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
        confirmText={deletePending ? 'Deleting…' : 'Delete user'}
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
