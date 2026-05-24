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
