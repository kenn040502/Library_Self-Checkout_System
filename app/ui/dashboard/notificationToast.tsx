'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import type { Notification } from '@/app/lib/supabase/notifications';

const POLL_MS = 20_000;
const AUTO_DISMISS_MS = 6_000;

interface Toast {
  id: string;
  notification: Notification;
  dismissing: boolean;
}

const typeConfig = {
  checkout: {
    label: 'Borrowed',
    iconColor: 'text-accent-amber',
    badge: 'bg-accent-amber/12 text-accent-amber',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  checkin: {
    label: 'Returned',
    iconColor: 'text-success',
    badge: 'bg-success/10 text-success',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="m9 15 3 3m0 0 3-3m-3 3V8.25M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
  loan_confirmed: {
    label: 'Loan confirmed',
    iconColor: 'text-success',
    badge: 'bg-success/10 text-success',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
  due_soon: {
    label: 'Due soon',
    iconColor: 'text-warning',
    badge: 'bg-warning/10 text-warning',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
  hold_ready: {
    label: 'Hold ready',
    iconColor: 'text-primary dark:text-dark-primary',
    badge: 'bg-primary/10 text-primary dark:bg-dark-primary/15 dark:text-dark-primary',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    ),
  },
  hold_placed: {
    label: 'Hold placed',
    iconColor: 'text-accent-teal',
    badge: 'bg-accent-teal/10 text-accent-teal',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
      </svg>
    ),
  },
  hold_cancelled: {
    label: 'Hold cancelled',
    iconColor: 'text-error',
    badge: 'bg-error/10 text-error',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75 14.25 14.25m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
} as const;

export default function NotificationToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seenIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  const dismissToast = useCallback((toastId: string) => {
    // Trigger exit animation
    setToasts((prev) =>
      prev.map((t) => (t.id === toastId ? { ...t, dismissing: true } : t)),
    );
    // Remove after animation completes
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toastId));
    }, 350);
  }, []);

  const addToast = useCallback(
    (notification: Notification) => {
      const toastId = `toast-${notification.id}`;
      setToasts((prev) => [...prev, { id: toastId, notification, dismissing: false }]);
      setTimeout(() => dismissToast(toastId), AUTO_DISMISS_MS);
    },
    [dismissToast],
  );

  const poll = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?filter=all&limit=20');
      if (!res.ok) return;
      const { notifications } = (await res.json()) as { notifications: Notification[] };
      if (!notifications) return;

      if (!initialized.current) {
        // First load: mark everything as already seen — no toasts for old events
        notifications.forEach((n) => seenIds.current.add(n.id));
        initialized.current = true;
        return;
      }

      // Subsequent polls: show toast for any ID we haven't seen yet
      for (const n of notifications) {
        if (!seenIds.current.has(n.id)) {
          seenIds.current.add(n.id);
          addToast(n);
        }
      }
    } catch {
      // silently ignore network errors
    }
  }, [addToast]);

  useEffect(() => {
    poll();
    const timer = setInterval(poll, POLL_MS);
    return () => clearInterval(timer);
  }, [poll]);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-6 right-4 z-50 flex flex-col gap-3 md:bottom-8 md:right-8"
    >
      {toasts.map((toast) => {
        const cfg = typeConfig[toast.notification.type] ?? typeConfig.checkout;
        return (
          <div
            key={toast.id}
            className={clsx(
              'pointer-events-auto flex w-[min(20rem,calc(100vw-1.5rem))] items-start gap-3 rounded-card border border-hairline bg-canvas p-4 shadow-[0_4px_16px_rgba(20,20,19,0.08)] transition-all duration-300 dark:border-dark-hairline dark:bg-dark-canvas',
              toast.dismissing
                ? 'translate-x-4 opacity-0'
                : 'translate-x-0 opacity-100',
            )}
            style={{ transition: 'opacity 350ms ease, transform 350ms ease' }}
          >
            {/* Icon */}
            <div className={clsx('mt-0.5 flex-shrink-0', cfg.iconColor)}>{cfg.icon}</div>

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
              </div>
              <p className="mt-1 font-sans text-title-sm text-ink dark:text-on-dark">
                {toast.notification.title}
              </p>
              <p className="mt-0.5 font-sans text-body-sm leading-snug text-body dark:text-on-dark/80">
                {toast.notification.message}
              </p>
            </div>

            {/* Close */}
            <button
              onClick={() => dismissToast(toast.id)}
              className="ml-1 flex-shrink-0 rounded-full p-1 text-muted-soft transition-colors hover:bg-surface-cream-strong hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:text-on-dark-soft dark:hover:bg-dark-surface-strong dark:hover:text-on-dark dark:focus-visible:ring-offset-dark-canvas"
              aria-label="Dismiss"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
