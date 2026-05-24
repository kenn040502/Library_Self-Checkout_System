'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import type { Notification } from '@/app/lib/supabase/notifications';

const POLL_INTERVAL_MS = 30_000;

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const typeConfig = {
  checkout: {
    label: 'Borrowed',
    dot: 'bg-accent-amber',
    badge: 'bg-accent-amber/12 text-accent-amber',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  checkin: {
    label: 'Returned',
    dot: 'bg-success',
    badge: 'bg-success/10 text-success',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="m9 15 3 3m0 0 3-3m-3 3V8.25M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
  loan_confirmed: {
    label: 'Loan confirmed',
    dot: 'bg-success',
    badge: 'bg-success/10 text-success',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
  due_soon: {
    label: 'Due soon',
    dot: 'bg-warning',
    badge: 'bg-warning/10 text-warning',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
  hold_ready: {
    label: 'Hold ready',
    dot: 'bg-primary',
    badge: 'bg-primary/10 text-primary dark:text-dark-primary dark:bg-dark-primary/15',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    ),
  },
  hold_placed: {
    label: 'Hold placed',
    dot: 'bg-accent-teal',
    badge: 'bg-accent-teal/10 text-accent-teal',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
      </svg>
    ),
  },
  hold_cancelled: {
    label: 'Hold cancelled',
    dot: 'bg-error',
    badge: 'bg-error/10 text-error',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75 14.25 14.25m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
} as const;

export default function NotificationPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  // Only run client-side calculations after component mounts to avoid hydration mismatches
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=5');
      if (!res.ok) return;
      const { notifications: data } = (await res.json()) as { notifications: Notification[] };
      setNotifications(data ?? []);
      setUnreadCount((data ?? []).filter((n) => !n.is_read).length);
    } catch {
      // silently ignore network errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const markOneRead = async (id: string) => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId: id }),
    });
    refresh();
  };

  const markAllRead = async () => {
    setMarking(true);
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAll: true }),
    });
    await refresh();
    setMarking(false);
  };

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="font-sans text-title-lg text-ink dark:text-on-dark">
            Notifications
          </h2>
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
              className="font-sans text-body-sm font-medium text-primary transition-colors hover:text-primary-active disabled:opacity-50 dark:text-dark-primary"
            >
              {marking ? 'Marking…' : 'Mark all as read'}
            </button>
          )}
          <Link
            href="/dashboard/notifications"
            className="font-sans text-body-sm font-medium text-muted transition-colors hover:text-primary dark:text-on-dark-soft dark:hover:text-dark-primary"
          >
            View all →
          </Link>
        </div>
      </div>

      {/* Panel */}
      <div className="overflow-hidden rounded-card border border-hairline bg-surface-card dark:border-dark-hairline dark:bg-dark-surface-card">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <svg className="h-5 w-5 animate-spin text-muted-soft dark:text-on-dark-soft" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <p className="font-sans text-body-md text-muted dark:text-on-dark-soft">
              No recent notifications
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-hairline dark:divide-dark-hairline">
            {notifications.map((n) => {
              const cfg = typeConfig[n.type] ?? typeConfig.checkout;
              return (
                <li
                  key={n.id}
                  className={clsx(
                    'flex items-start gap-4 px-5 py-4 transition-colors',
                    'hover:bg-surface-cream-strong dark:hover:bg-dark-surface-strong',
                    !n.is_read && 'bg-primary/5 dark:bg-dark-primary/10',
                  )}
                >
                  {/* Type icon */}
                  <div
                    className={clsx(
                      'mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full',
                      cfg.badge,
                    )}
                  >
                    {cfg.icon}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={clsx(
                          'inline-flex items-center rounded-pill px-2 py-0.5 font-sans text-caption-uppercase',
                          cfg.badge,
                        )}
                      >
                        {cfg.label}
                      </span>
                      {!n.is_read && (
                        <span className={clsx('h-2 w-2 rounded-full', cfg.dot)} />
                      )}
                    </div>
                    <p className={clsx(
                      'mt-1 truncate font-sans text-title-sm text-ink dark:text-on-dark',
                      !n.is_read && 'font-semibold',
                    )}>
                      {n.title}
                    </p>
                    <p className="mt-0.5 truncate font-sans text-body-sm text-body dark:text-on-dark-soft">
                      {n.message}
                    </p>
                  </div>

                  {/* Time + mark read */}
                  <div className="flex flex-shrink-0 flex-col items-end gap-2">
                    <span className="font-sans text-caption text-muted-soft dark:text-on-dark-soft">
                      {isMounted ? timeAgo(n.created_at) : 'just now'}
                    </span>
                    {!n.is_read && (
                      <button
                        onClick={() => markOneRead(n.id)}
                        className="font-sans text-caption text-muted-soft transition-colors hover:text-primary dark:text-on-dark-soft dark:hover:text-dark-primary"
                        title="Mark as read"
                      >
                        ✓
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}