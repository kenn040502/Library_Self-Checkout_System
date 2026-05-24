'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  BookOpenIcon,
  UserGroupIcon,
  UserCircleIcon,
  AcademicCapIcon,
  BellIcon,
  BookmarkIcon,
  ArrowPathIcon,
  QrCodeIcon,
  ClockIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  SunIcon,
  MoonIcon,
  ExclamationTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useTheme } from '@/app/ui/theme/themeProvider';
import type { DashboardUserProfile } from '@/app/lib/auth/types';
import type { DashboardRole } from '@/app/lib/auth/types';
import { useEffect, useState } from 'react';

type NavItem = { icon: React.ElementType; label: string; href: string; badge?: number };

const ADMIN_NAV: NavItem[] = [
  { icon: HomeIcon,                  label: 'Overview',        href: '/dashboard/admin' },
  { icon: BookOpenIcon,              label: 'Catalogue',       href: '/dashboard/book/items' },
  { icon: PlusIcon,                  label: 'Add Book',        href: '/dashboard/admin/books/new' },
  { icon: UserGroupIcon,             label: 'Users',           href: '/dashboard/admin/users' },
  { icon: BookmarkIcon,              label: 'Holds',           href: '/dashboard/book/holds' },
  { icon: QrCodeIcon,                label: 'Borrow Books',    href: '/dashboard/book/checkout' },
  { icon: ArrowPathIcon,             label: 'Return Books',    href: '/dashboard/book/checkin' },
  { icon: ExclamationTriangleIcon,   label: 'Damage Reports',  href: '/dashboard/staff/damage-reports' },
  { icon: ClockIcon,                 label: 'Loan History',    href: '/dashboard/staff/history' },
  { icon: EnvelopeIcon,              label: 'Overdue',         href: '/dashboard/admin/overdue' },
  { icon: BellIcon,                  label: 'Notifications',   href: '/dashboard/notifications' },
  { icon: Cog6ToothIcon,             label: 'Settings',        href: '/dashboard/profile' },
];

const STAFF_NAV: NavItem[] = [
  { icon: HomeIcon,                  label: 'Desk',            href: '/dashboard' },
  { icon: QrCodeIcon,                label: 'Borrow Books',    href: '/dashboard/book/checkout' },
  { icon: ArrowPathIcon,             label: 'Return Books',    href: '/dashboard/book/checkin' },
  { icon: BookmarkIcon,              label: 'Holds',           href: '/dashboard/book/holds' },
  { icon: BookOpenIcon,              label: 'Catalogue',       href: '/dashboard/book/items' },
  { icon: PlusIcon,                  label: 'Add Book',        href: '/dashboard/admin/books/new' },
  { icon: ExclamationTriangleIcon,   label: 'Damage Reports',  href: '/dashboard/staff/damage-reports' },
  { icon: ClockIcon,                 label: 'Loan History',    href: '/dashboard/staff/history' },
  { icon: EnvelopeIcon,              label: 'Overdue',         href: '/dashboard/admin/overdue' },
  { icon: BellIcon,                  label: 'Notifications',   href: '/dashboard/notifications' },
  { icon: UserCircleIcon,            label: 'Profile',         href: '/dashboard/profile' },
];

const USER_NAV: NavItem[] = [
  { icon: HomeIcon,                  label: 'Dashboard',       href: '/dashboard' },
  { icon: MagnifyingGlassIcon,       label: 'Catalogue',       href: '/dashboard/book/items' },
  { icon: QrCodeIcon,                label: 'Borrow',          href: '/dashboard/book/checkout' },
  { icon: ArrowPathIcon,             label: 'Return',          href: '/dashboard/book/checkin' },
  { icon: BookOpenIcon,              label: 'My Books',        href: '/dashboard/my-books' },
  { icon: AcademicCapIcon,           label: 'Learning hub',    href: '/dashboard/learning' },
  { icon: SparklesIcon,              label: 'Reading Assistant', href: '/dashboard/reading-assistant' },
  { icon: BellIcon,                  label: 'Notifications',   href: '/dashboard/notifications' },
  { icon: UserCircleIcon,            label: 'Profile',         href: '/dashboard/profile' },
];

function getNav(role: DashboardRole): NavItem[] {
  if (role === 'admin') return ADMIN_NAV;
  if (role === 'staff') return STAFF_NAV;
  return USER_NAV;
}


type SideNavProps = {
  user: DashboardUserProfile;
  isBypassed: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
};

export default function SideNav({ user, isBypassed, collapsed = false, onToggle }: SideNavProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const [hasUnread, setHasUnread] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/notifications?filter=unread&limit=1');
        if (!res.ok) return;
        const { notifications } = await res.json();
        setHasUnread(Array.isArray(notifications) && notifications.length > 0);
      } catch { /* ignore */ }
    };
    check();
    const timer = setInterval(check, 90_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (pathname === '/dashboard/notifications') setHasUnread(false);
  }, [pathname]);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const nav = getNav(user.role);
  return (
    <aside className={clsx(
      'fixed left-0 top-0 flex h-screen flex-col border-r border-hairline bg-canvas text-ink transition-[width,padding] duration-300 dark:border-dark-hairline dark:bg-dark-canvas dark:text-on-dark',
      collapsed ? 'w-16 px-2 py-4' : 'w-64 px-[18px] py-7',
    )}>
      {collapsed && onToggle && (
        <button
          type="button"
          onClick={onToggle}
          aria-label="Expand sidebar"
          title="Expand sidebar"
          className="mx-auto mb-2 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-btn border border-hairline bg-surface-card text-body transition hover:bg-surface-cream-strong hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:border-dark-hairline dark:bg-dark-surface-card dark:text-on-dark/70 dark:hover:bg-dark-surface-strong dark:hover:text-on-dark dark:focus-visible:ring-offset-dark-canvas"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      )}

      {!collapsed && (
        <div className="mb-2 flex items-center justify-between px-3">
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[1.8px] text-muted-soft dark:text-on-dark-soft">
            Workspace
          </p>
          {onToggle && (
            <button
              type="button"
              onClick={onToggle}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-btn text-muted-soft transition hover:bg-surface-cream-strong hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:text-on-dark/60 dark:hover:bg-dark-surface-strong dark:hover:text-on-dark dark:focus-visible:ring-offset-dark-canvas"
            >
              <ChevronLeftIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto scrollbar-none space-y-0.5">
        {nav.map((item) => {
          const isActive = item.href === '/dashboard'
            ? pathname === '/dashboard'
            : item.href === '/dashboard/admin'
            ? pathname === '/dashboard/admin'
            : pathname.startsWith(item.href.split('?')[0]);
          const Icon = item.icon;
          const showDot = item.label === 'Notifications' && hasUnread;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={clsx(
                'flex items-center rounded-btn font-sans text-nav-link transition-colors',
                collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5',
                isActive
                  ? 'bg-primary/10 text-primary dark:bg-dark-primary/15 dark:text-dark-primary'
                  : 'text-body hover:bg-surface-cream-strong hover:text-ink dark:text-on-dark/70 dark:hover:bg-dark-surface-strong dark:hover:text-on-dark',
              )}
            >
              <span className="relative flex-shrink-0">
                <Icon className="h-[18px] w-[18px]" />
                {showDot && (
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary ring-2 ring-canvas dark:ring-dark-canvas" />
                )}
              </span>
              {!collapsed && <span className="flex-1">{item.label}</span>}
              {!collapsed && item.badge != null && (
                <span className={clsx(
                  'rounded-pill px-1.5 py-0.5 font-mono text-[10px] font-bold',
                  isActive ? 'bg-primary text-on-primary' : 'bg-surface-cream-strong text-muted dark:bg-dark-surface-strong dark:text-on-dark-soft',
                )}>{item.badge}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom controls */}
      <div className="mt-4 space-y-2">
        <button
          type="button"
          onClick={toggleTheme}
          suppressHydrationWarning
          aria-label={hasMounted ? (isDark ? 'Switch to light mode' : 'Switch to dark mode') : 'Switch theme'}
          title={collapsed ? (hasMounted ? (isDark ? 'Light mode' : 'Dark mode') : 'Theme') : undefined}
          className={clsx(
            'flex w-full items-center justify-center rounded-btn border border-hairline bg-surface-card font-sans text-caption text-body transition hover:bg-surface-cream-strong hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:border-dark-hairline dark:bg-dark-surface-card dark:text-on-dark/70 dark:hover:bg-dark-surface-strong dark:hover:text-on-dark dark:focus-visible:ring-offset-dark-canvas',
            collapsed ? 'h-10 w-10 mx-auto p-0' : 'gap-2 px-3 py-2',
          )}
        >
          {hasMounted ? (
            isDark ? <MoonIcon className="h-4 w-4" /> : <SunIcon className="h-4 w-4" />
          ) : (
            <span className="h-4 w-4" aria-hidden />
          )}
          {!collapsed && (hasMounted ? (isDark ? 'Light mode' : 'Dark mode') : 'Theme')}
        </button>

      </div>
    </aside>
  );
}
