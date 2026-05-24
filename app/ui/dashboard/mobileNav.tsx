'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  BellIcon,
  QrCodeIcon,
  BookOpenIcon,
  UserCircleIcon,
  BookmarkIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  EllipsisHorizontalIcon,
  ClockIcon,
  Cog6ToothIcon,
  ChevronRightIcon,
  XMarkIcon,
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  AcademicCapIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import MobileMenu from '@/app/ui/dashboard/mobileMenu';
import ThemeToggle from '@/app/ui/theme/themeToggle';
import NotificationPopover from '@/app/ui/dashboard/notificationPopover';
import type { DashboardUserProfile, DashboardRole } from '@/app/lib/auth/types';

type BottomNavItem = {
  key: string;
  label: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  isCenter?: boolean;
  isMoreToggle?: boolean;
};

// Tier 1 — daily nav. Student & staff have a primary FAB centre slot for their
// main action (Borrow). Admin uses five flat tabs ending with "More" — admin
// rarely scans, and Tier 2 admin tools live behind that sheet.
const BOTTOM_NAV_BY_ROLE: Record<DashboardRole, BottomNavItem[]> = {
  user: [
    { key: 'home', label: 'Home', href: '/dashboard', icon: HomeIcon },
    { key: 'browse', label: 'Browse', href: '/dashboard/book/items', icon: MagnifyingGlassIcon },
    { key: 'borrow', label: 'Borrow', href: '/dashboard/book/checkout', icon: QrCodeIcon, isCenter: true },
    { key: 'books', label: 'My Books', href: '/dashboard/my-books', icon: BookOpenIcon },
    { key: 'alerts', label: 'Notifications', href: '/dashboard/notifications', icon: BellIcon },
  ],
  staff: [
    { key: 'desk', label: 'Desk', href: '/dashboard', icon: HomeIcon },
    { key: 'return', label: 'Return', href: '/dashboard/book/checkin', icon: ArrowPathIcon },
    { key: 'borrow', label: 'Borrow', href: '/dashboard/book/checkout', icon: QrCodeIcon, isCenter: true },
    { key: 'holds', label: 'Holds', href: '/dashboard/book/holds', icon: BookmarkIcon },
    { key: 'alerts', label: 'Notifications', href: '/dashboard/notifications', icon: BellIcon },
  ],
  admin: [
    { key: 'overview', label: 'Overview', href: '/dashboard/admin', icon: HomeIcon },
    { key: 'catalogue', label: 'Catalogue', href: '/dashboard/book/items', icon: BookOpenIcon },
    { key: 'users', label: 'Users', href: '/dashboard/admin/users', icon: UserGroupIcon },
    { key: 'damage', label: 'Damage', href: '/dashboard/staff/damage-reports', icon: ExclamationTriangleIcon },
    { key: 'more', label: 'More', href: '#more', icon: EllipsisHorizontalIcon, isMoreToggle: true },
  ],
};

type MoreItem = {
  label: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

// Tier 2 — surfaced via the More sheet (admin) or the hamburger drawer.
const MORE_BY_ROLE: Record<DashboardRole, MoreItem[]> = {
  user: [
    { label: 'Recommendations', href: '/dashboard/recommendations', icon: SparklesIcon },
    { label: 'Chat Assistant', href: '/dashboard/chat', icon: ChatBubbleLeftRightIcon },
    { label: 'Learning hub', href: '/dashboard/learning', icon: AcademicCapIcon },
    { label: 'Return Books', href: '/dashboard/book/checkin', icon: ArrowPathIcon },
    { label: 'Help Centre', href: '/dashboard/faq', icon: QuestionMarkCircleIcon },
    { label: 'Profile', href: '/dashboard/profile', icon: UserCircleIcon },
  ],
  staff: [
    { label: 'Damage Reports', href: '/dashboard/staff/damage-reports', icon: ExclamationTriangleIcon },
    { label: 'Borrow History', href: '/dashboard/book/history', icon: ClockIcon },
    { label: 'Catalogue', href: '/dashboard/book/items', icon: BookOpenIcon },
    { label: 'Notifications', href: '/dashboard/notifications', icon: BellIcon },
    { label: 'Profile', href: '/dashboard/profile', icon: UserCircleIcon },
  ],
  admin: [
    { label: 'Borrow Books', href: '/dashboard/book/checkout', icon: QrCodeIcon },
    { label: 'Return Books', href: '/dashboard/book/checkin', icon: ArrowPathIcon },
    { label: 'Holds', href: '/dashboard/book/holds', icon: BookmarkIcon },
    { label: 'Borrow History', href: '/dashboard/book/history', icon: ClockIcon },
    { label: 'Notifications', href: '/dashboard/notifications', icon: BellIcon },
    { label: 'Settings', href: '/dashboard/profile', icon: Cog6ToothIcon },
  ],
};

const roleBadge = (role: DashboardRole) =>
  role === 'admin' ? 'ADMIN' : role === 'staff' ? 'STAFF' : 'STUDENT';

const moreLabel = (role: DashboardRole) =>
  role === 'user' ? 'students' : role;

type MobileNavProps = {
  user: DashboardUserProfile;
  isBypassed: boolean;
};

export default function MobileNav({ user, isBypassed }: MobileNavProps) {
  const pathname = usePathname();
  const [hasUnread, setHasUnread] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Close the sheet when the route changes (a tap inside the sheet navigates).
  useEffect(() => {
    setIsMoreOpen(false);
  }, [pathname]);

  // Lock body scroll while the sheet is open.
  useEffect(() => {
    if (isMoreOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMoreOpen]);

  // Close on Escape.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMoreOpen) setIsMoreOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMoreOpen]);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    if (href === '/dashboard/admin') return pathname === '/dashboard/admin';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const nav = BOTTOM_NAV_BY_ROLE[user.role];
  const moreItems = MORE_BY_ROLE[user.role];

  // ── More sheet (portal-mounted to body to escape any stacking context) ──
  const moreSheet = (
    <>
      <div
        aria-hidden="true"
        onClick={() => setIsMoreOpen(false)}
        className={clsx(
          'fixed inset-0 z-[9998] bg-black/45 backdrop-blur-[2px] transition-opacity duration-200 md:hidden',
          isMoreOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      />
      <aside
        id="mobile-more-sheet"
        aria-label="More navigation"
        aria-hidden={!isMoreOpen}
        className={clsx(
          'fixed inset-x-0 bottom-0 z-[9999] rounded-t-3xl border-t border-hairline bg-canvas text-ink shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.25)] transition-transform duration-300 ease-out dark:border-dark-hairline dark:bg-dark-canvas dark:text-on-dark md:hidden',
          isMoreOpen ? 'translate-y-0' : 'translate-y-full',
        )}
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 22px)' }}
      >
        <div className="flex justify-center pt-2.5">
          <span className="h-1 w-10 rounded-full bg-surface-cream-strong dark:bg-dark-surface-strong" />
        </div>

        <div className="flex items-center justify-between px-5 pt-3.5 pb-2.5">
          <p className="font-mono text-[9px] font-bold uppercase tracking-[1.8px] text-muted dark:text-on-dark-soft">
            More for {moreLabel(user.role)}
          </p>
          <button
            type="button"
            onClick={() => setIsMoreOpen(false)}
            aria-label="Close"
            className="inline-flex h-7 w-7 items-center justify-center rounded-btn bg-surface-cream-strong text-muted transition-colors hover:bg-surface-cream-strong/80 dark:bg-dark-surface-strong dark:text-on-dark-soft"
          >
            <XMarkIcon className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>

        <nav className="flex flex-col gap-0.5 px-3.5 pb-3.5 pt-1">
          {moreItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setIsMoreOpen(false)}
                className={clsx(
                  'flex items-center gap-3 rounded-[10px] px-2.5 py-3 transition-colors',
                  active
                    ? 'bg-primary/10 text-primary dark:bg-dark-primary/15 dark:text-dark-primary'
                    : 'text-ink hover:bg-surface-soft dark:text-on-dark dark:hover:bg-dark-surface-soft',
                )}
              >
                <span
                  className={clsx(
                    'inline-flex h-9 w-9 items-center justify-center rounded-[10px]',
                    active
                      ? 'bg-primary/15 text-primary dark:bg-dark-primary/20 dark:text-dark-primary'
                      : 'bg-surface-cream-strong text-body dark:bg-dark-surface-strong dark:text-on-dark/80',
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
                </span>
                <span className="flex-1 font-sans text-body-sm font-medium">{item.label}</span>
                <ChevronRightIcon className="h-3.5 w-3.5 text-muted-soft dark:text-on-dark-soft" strokeWidth={2} />
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );

  return (
    <>
      {/* ── Top header ───────────────────────────── */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-hairline bg-canvas/90 px-4 py-3 text-ink backdrop-blur-md dark:border-dark-hairline dark:bg-dark-canvas/90 dark:text-on-dark md:hidden">
        <div className="flex items-center gap-2">
          <MobileMenu user={user} />
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/dashboard">
            <Image
              src="/swinburne-logo.png"
              alt="Swinburne"
              width={100}
              height={34}
              priority
              className="h-[34px] w-auto rounded-sm"
            />
          </Link>
          <span
            className={clsx(
              'rounded-pill px-2 py-0.5 font-mono text-[9px] font-bold tracking-[1.8px]',
              user.role === 'admin'
                ? 'bg-primary/15 text-primary dark:bg-dark-primary/20 dark:text-dark-primary'
                : user.role === 'staff'
                ? 'bg-accent-amber/15 text-accent-amber'
                : 'bg-surface-cream-strong text-muted dark:bg-dark-surface-strong dark:text-on-dark-soft',
            )}
          >
            {roleBadge(user.role)}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {isBypassed && (
            <span className="rounded-pill border border-warning/40 bg-warning/10 px-2 py-0.5 font-mono text-[9px] font-bold tracking-wider text-warning">
              DEV
            </span>
          )}
          <NotificationPopover hasUnread={hasUnread} onAllRead={() => setHasUnread(false)} />
          <ThemeToggle size="sm" />
        </div>
      </header>

      {/* ── Bottom navigation ────────────────────── */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-canvas/90 backdrop-blur-xl dark:border-dark-hairline dark:bg-dark-canvas/90 md:hidden"
        aria-label="Primary mobile"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 10px)' }}
      >
        <div className="mx-auto flex max-w-md items-end justify-around gap-1 px-4 pt-2">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = item.isMoreToggle ? isMoreOpen : isActive(item.href);
            const showDot = item.key === 'alerts' && hasUnread;

            if (item.isCenter) {
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className="flex flex-1 flex-col items-center gap-1"
                  aria-current={active ? 'page' : undefined}
                >
                  <div className="-mt-4 flex h-[50px] w-[50px] items-center justify-center rounded-[16px] bg-primary text-on-primary shadow-[0_6px_16px_-6px_rgba(184,58,53,0.55)] ring-4 ring-canvas transition hover:bg-primary-active dark:bg-dark-primary dark:ring-dark-canvas">
                    <Icon className="h-[22px] w-[22px]" strokeWidth={2} />
                  </div>
                  <span
                    className={clsx(
                      'font-sans text-[10px] font-semibold',
                      active ? 'text-primary dark:text-dark-primary' : 'text-muted-soft dark:text-on-dark-soft',
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            }

            if (item.isMoreToggle) {
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setIsMoreOpen((prev) => !prev)}
                  aria-expanded={isMoreOpen}
                  aria-controls="mobile-more-sheet"
                  suppressHydrationWarning
                  className={clsx(
                    'flex flex-1 flex-col items-center gap-0.5 py-1 transition-colors',
                    active ? 'text-primary dark:text-dark-primary' : 'text-muted dark:text-on-dark-soft',
                  )}
                >
                  <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2 : 1.6} />
                  <span className={clsx('font-sans text-[10px]', active ? 'font-semibold' : 'font-medium')}>
                    {item.label}
                  </span>
                </button>
              );
            }

            return (
              <Link
                key={item.key}
                href={item.href}
                className={clsx(
                  'flex flex-1 flex-col items-center gap-0.5 py-1',
                  active ? 'text-primary dark:text-dark-primary' : 'text-muted dark:text-on-dark-soft',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <span className="relative">
                  <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2 : 1.6} />
                  {showDot && (
                    <span className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-primary ring-2 ring-canvas dark:ring-dark-canvas" />
                  )}
                </span>
                <span className={clsx('font-sans text-[10px]', active ? 'font-semibold' : 'font-medium')}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {mounted && createPortal(moreSheet, document.body)}
    </>
  );
}
