'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  BookOpenIcon,
  MagnifyingGlassIcon,
  QrCodeIcon,
  ArrowPathIcon,
  BookmarkIcon,
  BellIcon,
  UserCircleIcon,
  SparklesIcon,
  AcademicCapIcon,
  ChatBubbleLeftRightIcon,
  QuestionMarkCircleIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  Cog6ToothIcon,
  ArrowRightStartOnRectangleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import type { DashboardUserProfile, DashboardRole } from '@/app/lib/auth/types';

type DrawerItem = {
  label: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

// Full per-role nav surfaced inside the drawer (Tier 1 + Tier 2 combined,
// flat — no dropdowns). Order matches the design's hamburger drawer.
const FULL_NAV: Record<DashboardRole, DrawerItem[]> = {
  user: [
    { label: 'Home', href: '/dashboard', icon: HomeIcon },
    { label: 'Browse Books', href: '/dashboard/book/items', icon: MagnifyingGlassIcon },
    { label: 'Borrow', href: '/dashboard/book/checkout', icon: QrCodeIcon },
    { label: 'Return', href: '/dashboard/book/checkin', icon: ArrowPathIcon },
    { label: 'My Books', href: '/dashboard/my-books', icon: BookOpenIcon },
    { label: 'Recommendations', href: '/dashboard/recommendations', icon: SparklesIcon },
    { label: 'Learning hub', href: '/dashboard/learning', icon: AcademicCapIcon },
    { label: 'Chat Assistant', href: '/dashboard/chat', icon: ChatBubbleLeftRightIcon },
    { label: 'Help Centre', href: '/dashboard/faq', icon: QuestionMarkCircleIcon },
    { label: 'Notifications', href: '/dashboard/notifications', icon: BellIcon },
    { label: 'Profile', href: '/dashboard/profile', icon: UserCircleIcon },
  ],
  staff: [
    { label: 'Desk', href: '/dashboard', icon: HomeIcon },
    { label: 'Borrow Books', href: '/dashboard/book/checkout', icon: QrCodeIcon },
    { label: 'Return Books', href: '/dashboard/book/checkin', icon: ArrowPathIcon },
    { label: 'Holds', href: '/dashboard/book/holds', icon: BookmarkIcon },
    { label: 'Catalogue', href: '/dashboard/book/items', icon: BookOpenIcon },
    { label: 'Damage Reports', href: '/dashboard/staff/damage-reports', icon: ExclamationTriangleIcon },
    { label: 'Borrow History', href: '/dashboard/book/history', icon: ClockIcon },
    { label: 'Notifications', href: '/dashboard/notifications', icon: BellIcon },
    { label: 'Profile', href: '/dashboard/profile', icon: UserCircleIcon },
  ],
  admin: [
    { label: 'Overview', href: '/dashboard/admin', icon: HomeIcon },
    { label: 'Catalogue', href: '/dashboard/book/items', icon: BookOpenIcon },
    { label: 'Manage Users', href: '/dashboard/admin/users', icon: UserGroupIcon },
    { label: 'Holds', href: '/dashboard/book/holds', icon: BookmarkIcon },
    { label: 'Borrow Books', href: '/dashboard/book/checkout', icon: QrCodeIcon },
    { label: 'Return Books', href: '/dashboard/book/checkin', icon: ArrowPathIcon },
    { label: 'Damage Reports', href: '/dashboard/staff/damage-reports', icon: ExclamationTriangleIcon },
    { label: 'Borrow History', href: '/dashboard/book/history', icon: ClockIcon },
    { label: 'Notifications', href: '/dashboard/notifications', icon: BellIcon },
    { label: 'Settings', href: '/dashboard/profile', icon: Cog6ToothIcon },
  ],
};

const ROLE_BADGE: Record<
  DashboardRole,
  { label: string; cardClass: string; textClass: string }
> = {
  user: {
    label: 'STUDENT',
    cardClass: 'border-hairline dark:border-dark-hairline',
    textClass: 'text-muted dark:text-on-dark-soft',
  },
  staff: {
    label: 'STAFF',
    cardClass: 'border-accent-amber/30 bg-accent-amber/[0.08]',
    textClass: 'text-accent-amber',
  },
  admin: {
    label: 'ADMIN',
    cardClass:
      'border-primary/30 bg-primary/[0.06] dark:border-dark-primary/30 dark:bg-dark-primary/[0.08]',
    textClass: 'text-primary dark:text-dark-primary',
  },
};

const getInitials = (name: string | null) => {
  if (!name) return '··';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '··';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function MobileMenu({ user }: { user: DashboardUserProfile }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [signingOut, startSignOut] = React.useTransition();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const closeMenu = React.useCallback(() => setIsOpen(false), []);
  const toggleMenu = () => setIsOpen((prev) => !prev);

  // Close on route change.
  React.useEffect(() => {
    closeMenu();
  }, [pathname, closeMenu]);

  // Lock body scroll while open.
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Escape closes the drawer.
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) closeMenu();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeMenu]);

  const handleSignOut = () => {
    startSignOut(async () => {
      await signOut({ redirect: false });
      window.location.href = '/api/auth/azure-signout';
    });
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    if (href === '/dashboard/admin') return pathname === '/dashboard/admin';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const items = FULL_NAV[user.role];
  const badge = ROLE_BADGE[user.role];
  const initials = getInitials(user.name);
  const displayName = user.name ?? 'Guest user';
  const displayEmail = user.email ?? '';

  const triggerClasses =
    'inline-flex items-center justify-center rounded-btn p-2 text-ink transition-colors hover:bg-surface-cream-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-on-dark dark:hover:bg-dark-surface-strong';

  const portalContent = (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={closeMenu}
        className={clsx(
          'fixed inset-0 z-[9998] bg-black/55 transition-opacity duration-300 dark:bg-black/70 md:hidden',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      />

      {/* Drawer */}
      <aside
        id="mobile-menu-drawer"
        aria-label="Site navigation"
        aria-hidden={!isOpen}
        className={clsx(
          'fixed inset-y-0 left-0 z-[9999] flex w-[308px] flex-col border-r border-hairline bg-canvas text-ink shadow-[0_0_30px_rgba(0,0,0,0.25)] transition-transform duration-300 ease-in-out dark:border-dark-hairline dark:bg-dark-canvas dark:text-on-dark md:hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Header: close + caption */}
        <div className="flex items-center justify-between border-b border-hairline px-[18px] py-3.5 dark:border-dark-hairline">
          <button
            type="button"
            onClick={closeMenu}
            aria-label="Close menu"
            className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-btn text-muted transition-colors hover:bg-surface-cream-strong hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-on-dark-soft dark:hover:bg-dark-surface-strong dark:hover:text-on-dark"
          >
            <XMarkIcon className="h-[18px] w-[18px]" strokeWidth={2} />
          </button>
        </div>

        {/* Role badge card */}
        {/* Items */}
        <nav className="flex-1 overflow-y-auto px-3 pb-2">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={closeMenu}
                aria-current={active ? 'page' : undefined}
                className={clsx(
                  'mb-0.5 flex items-center gap-3 rounded-btn px-3 py-2.5 transition-colors',
                  active
                    ? 'bg-primary/10 text-primary dark:bg-dark-primary/15 dark:text-dark-primary'
                    : 'text-body hover:bg-surface-cream-strong hover:text-ink dark:text-on-dark/80 dark:hover:bg-dark-surface-strong dark:hover:text-on-dark',
                )}
              >
                <Icon
                  className="h-[18px] w-[18px] flex-shrink-0"
                  strokeWidth={active ? 2 : 1.7}
                />
                <span
                  className={clsx(
                    'font-sans text-[14px]',
                    active ? 'font-semibold' : 'font-medium',
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* User card + sign out */}
        <div className="border-t border-hairline p-3 dark:border-dark-hairline">
          <div className="flex items-center gap-2.5 rounded-btn border border-hairline p-2.5 dark:border-dark-hairline">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary font-sans text-[12px] font-bold text-on-primary dark:bg-dark-primary">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-sans text-[13px] font-semibold text-ink dark:text-on-dark">
                {displayName}
              </p>
              {displayEmail && (
                <p className="truncate font-mono text-[10px] text-muted dark:text-on-dark-soft">
                  {displayEmail}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              aria-label={signingOut ? 'Signing out' : 'Sign out'}
              className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-btn text-muted transition-colors hover:bg-surface-cream-strong hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60 dark:text-on-dark-soft dark:hover:bg-dark-surface-strong dark:hover:text-on-dark"
            >
              <ArrowRightStartOnRectangleIcon
                className="h-4 w-4"
                strokeWidth={1.8}
              />
            </button>
          </div>
        </div>

        {/* Brand stripe */}
        <div
          aria-hidden="true"
          className="h-1 w-full bg-gradient-to-r from-primary via-primary/30 to-transparent dark:from-dark-primary dark:via-dark-primary/30"
        />
      </aside>
    </>
  );

  return (
    <>
      <button
        type="button"
        onClick={toggleMenu}
        className={triggerClasses}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isOpen}
        aria-controls="mobile-menu-drawer"
        suppressHydrationWarning
      >
        {isOpen ? (
          <XMarkIcon className="h-6 w-6" aria-hidden="true" />
        ) : (
          <Bars3Icon className="h-6 w-6" aria-hidden="true" />
        )}
      </button>

      {mounted && createPortal(portalContent, document.body)}
    </>
  );
}
