'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BellIcon, XMarkIcon, StarIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import SignOutButton from '@/app/ui/dashboard/signOutButton';
import type { DashboardUserProfile } from '@/app/lib/auth/types';
import type { Notification, NotificationFilter } from '@/app/lib/supabase/notifications';
import clsx from 'clsx';

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

function calculateTimeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const TYPE_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  checkout:       { label: 'Borrowed',      dot: 'bg-accent-amber', badge: 'bg-accent-amber/12 text-accent-amber' },
  checkin:        { label: 'Returned',       dot: 'bg-success',      badge: 'bg-success/10 text-success' },
  loan_confirmed: { label: 'Loan confirmed', dot: 'bg-success',      badge: 'bg-success/10 text-success' },
  due_soon:       { label: 'Due soon',       dot: 'bg-warning',      badge: 'bg-warning/10 text-warning' },
  hold_ready:     { label: 'Hold ready',     dot: 'bg-primary',      badge: 'bg-primary/10 text-primary dark:text-dark-primary dark:bg-dark-primary/15' },
  hold_placed:    { label: 'Hold placed',    dot: 'bg-accent-teal',  badge: 'bg-accent-teal/10 text-accent-teal' },
};

const PANEL_TABS: { value: NotificationFilter; label: string }[] = [
  { value: 'all',     label: 'All' },
  { value: 'unread',  label: 'Unread' },
  { value: 'read',    label: 'Read' },
  { value: 'flagged', label: 'Flagged' },
];

const PANEL_LIMIT = 6;

type DesktopTopBarProps = {
  user: DashboardUserProfile;
  isBypassed: boolean;
};

export default function DesktopTopBar({ user, isBypassed }: DesktopTopBarProps) {
  const pathname = usePathname();
  const [hasUnread, setHasUnread] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [panelFilter, setPanelFilter] = useState<NotificationFilter>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const initials = getInitials(user.name);

  // Only run client-side calculations after component mounts to avoid hydration mismatches
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Background unread poll (every 90s) — keeps the dot accurate
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/notifications?filter=unread&limit=1');
        if (!res.ok) return;
        const { notifications: data } = await res.json();
        setHasUnread(Array.isArray(data) && data.length > 0);
      } catch { /* ignore */ }
    };
    check();
    const timer = setInterval(check, 90_000);
    return () => clearInterval(timer);
  }, []);

  // Clear dot when visiting the full notifications page
  useEffect(() => {
    if (pathname === '/dashboard/notifications') {
      setHasUnread(false);
      setIsOpen(false);
    }
  }, [pathname]);

  const fetchNotifications = useCallback(async (filter: NotificationFilter) => {
    setLoading(true);
    try {
      // Use limit=50 so server-side JS filter has enough rows to work with;
      // we slice to PANEL_LIMIT in the UI.
      const res = await fetch(`/api/notifications?limit=50&filter=${filter}`);
      if (!res.ok) return;
      const { notifications: data } = (await res.json()) as { notifications: Notification[] };
      setNotifications((data ?? []).slice(0, PANEL_LIMIT));
      if (filter === 'all' || filter === 'unread') {
        setHasUnread((data ?? []).some((n) => !n.is_read));
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  // Fetch whenever panel opens or filter tab changes
  useEffect(() => {
    if (isOpen) fetchNotifications(panelFilter);
  }, [isOpen, panelFilter, fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  const markAllRead = async () => {
    setMarking(true);
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAll: true }),
    });
    await fetchNotifications(panelFilter);
    setMarking(false);
  };

  const markOneRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId: id }),
    });
  };

  const toggleFlag = async (id: string, currentFlagged: boolean) => {
    setNotifications((prev) =>
      prev.map((n) => n.id === id ? { ...n, is_flagged: !currentFlagged } : n),
    );
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId: id, flagged: !currentFlagged }),
    });
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <header className="hidden md:flex items-center justify-between gap-2 sticky top-0 z-30 border-b border-hairline bg-canvas/90 px-6 py-3 backdrop-blur-md dark:border-dark-hairline dark:bg-dark-canvas/90">
      <Link href="/dashboard" className="flex items-center gap-3">
        <Image
          src="/swinburne-logo.png"
          alt="Swinburne University of Technology Sarawak Campus"
          width={320}
          height={150}
          className="h-16 w-auto"
          priority
        />
      </Link>

      <div className="flex items-center gap-2">
        {isBypassed && (
          <span className="rounded-pill border border-warning/40 bg-warning/10 px-2 py-0.5 font-mono text-[9px] font-bold tracking-wider text-warning">
            DEV
          </span>
        )}

      {/* Notification bell + dropdown */}
      <div className="relative" ref={panelRef}>
        <button
          type="button"
          aria-label="Notifications"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((v) => !v)}
          className={clsx(
            'relative flex h-8 w-8 items-center justify-center rounded-xl border transition',
            isOpen
              ? 'border-primary/30 bg-primary/8 text-primary dark:border-dark-primary/40 dark:bg-dark-primary/15 dark:text-dark-primary'
              : 'border-hairline bg-canvas text-muted hover:border-primary/20 hover:text-ink dark:border-dark-hairline dark:bg-dark-surface-card dark:text-on-dark-soft dark:hover:text-on-dark',
          )}
        >
          <BellIcon className="h-4 w-4" />
          {hasUnread && (
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary ring-2 ring-canvas dark:ring-dark-canvas" />
          )}
        </button>

        {/* Dropdown panel */}
        {isOpen && (
          <div className="absolute right-0 top-[calc(100%+8px)] w-[380px] overflow-hidden rounded-card border border-hairline bg-canvas shadow-[0_8px_32px_-8px_rgba(0,0,0,0.18)] dark:border-dark-hairline dark:bg-dark-canvas dark:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)]">

            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-hairline px-4 py-3 dark:border-dark-hairline">
              <div className="flex items-center gap-2">
                <span className="font-sans text-title-sm font-semibold text-ink dark:text-on-dark">
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-pill bg-primary px-1.5 font-sans text-caption font-bold text-on-primary">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    disabled={marking}
                    className="font-sans text-caption font-medium text-primary transition-colors hover:text-primary-active disabled:opacity-50 dark:text-dark-primary"
                  >
                    {marking ? 'Marking…' : 'Mark all read'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close"
                  className="flex h-6 w-6 items-center justify-center rounded-lg text-muted transition hover:text-ink dark:text-on-dark-soft dark:hover:text-on-dark"
                >
                  <XMarkIcon className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Filter tabs */}
            <div className="flex border-b border-hairline dark:border-dark-hairline">
              {PANEL_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setPanelFilter(tab.value)}
                  className={clsx(
                    'flex-1 px-2 py-2 font-sans text-[11px] font-semibold transition-colors',
                    panelFilter === tab.value
                      ? 'border-b-2 border-primary text-primary dark:border-dark-primary dark:text-dark-primary'
                      : 'text-muted hover:text-ink dark:text-on-dark-soft dark:hover:text-on-dark',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Notification list */}
            <div className="max-h-[380px] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <svg className="h-5 w-5 animate-spin text-muted-soft dark:text-on-dark-soft" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="font-sans text-body-sm text-muted dark:text-on-dark-soft">
                    {panelFilter === 'unread'  ? 'No unread notifications'
                      : panelFilter === 'read'    ? 'No read notifications'
                      : panelFilter === 'flagged' ? 'No flagged notifications'
                      : 'No recent notifications'}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-hairline dark:divide-dark-hairline">
                  {notifications.map((n) => {
                    const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.checkout;
                    return (
                      <li
                        key={n.id}
                        className={clsx(
                          'group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-soft dark:hover:bg-dark-surface-soft',
                          !n.is_read && 'bg-primary/5 dark:bg-dark-primary/10',
                        )}
                      >
                        {/* Unread dot */}
                        <span className={clsx(
                          'mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full',
                          n.is_read ? 'bg-transparent' : cfg.dot,
                        )} />

                        {/* Content — clicking marks as read */}
                        <button
                          type="button"
                          onClick={() => { if (!n.is_read) markOneRead(n.id); }}
                          className="min-w-0 flex-1 text-left"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className={clsx(
                              'inline-flex items-center rounded-pill px-1.5 py-0.5 font-sans text-[9px] font-bold uppercase tracking-wide',
                              cfg.badge,
                            )}>
                              {cfg.label}
                            </span>
                            {n.is_flagged && (
                              <StarSolid className="h-3 w-3 text-warning" />
                            )}
                          </div>
                          <p className={clsx(
                            'mt-0.5 truncate font-sans text-body-sm text-ink dark:text-on-dark',
                            !n.is_read && 'font-semibold',
                          )}>
                            {n.title}
                          </p>
                          <p className="truncate font-sans text-caption text-muted dark:text-on-dark-soft">
                            {n.message}
                          </p>
                        </button>

                        {/* Time + star action */}
                        <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                          <span className="font-sans text-caption text-muted-soft dark:text-on-dark-soft">
                            {isMounted ? calculateTimeAgo(n.created_at) : 'just now'}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleFlag(n.id, n.is_flagged)}
                            title={n.is_flagged ? 'Remove flag' : 'Flag'}
                            className="flex h-5 w-5 items-center justify-center rounded transition opacity-0 group-hover:opacity-100 hover:bg-surface-cream-strong dark:hover:bg-dark-surface-strong"
                          >
                            {n.is_flagged
                              ? <StarSolid className="h-3.5 w-3.5 text-warning" />
                              : <StarIcon className="h-3.5 w-3.5 text-muted-soft dark:text-on-dark-soft" />
                            }
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Panel footer */}
            <div className="border-t border-hairline px-4 py-2.5 dark:border-dark-hairline">
              <Link
                href="/dashboard/notifications"
                onClick={() => setIsOpen(false)}
                className="block text-center font-sans text-body-sm font-medium text-primary transition-colors hover:text-primary-active dark:text-dark-primary"
              >
                View all notifications →
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <span className="h-5 w-px bg-hairline dark:bg-dark-hairline" aria-hidden />

      {/* Profile avatar + name */}
      <Link
        href="/dashboard/profile"
        aria-label="Profile"
        className="flex items-center gap-2 rounded-xl border border-hairline bg-canvas px-2.5 py-1.5 transition hover:border-primary/20 hover:bg-surface-cream-strong dark:border-dark-hairline dark:bg-dark-surface-card dark:hover:bg-dark-surface-strong"
      >
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-on-primary">
          {initials}
        </div>
        <span className="hidden lg:block max-w-[140px] truncate font-sans text-body-sm font-medium text-ink dark:text-on-dark">
          {user.name ?? user.email ?? 'Library Member'}
        </span>
      </Link>

      {/* Sign out */}
        <SignOutButton
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-hairline bg-canvas text-muted transition hover:border-primary/20 hover:text-ink disabled:cursor-not-allowed dark:border-dark-hairline dark:bg-dark-surface-card dark:text-on-dark-soft dark:hover:text-on-dark"
          labelClassName="hidden"
        />
      </div>
    </header>
  );
}