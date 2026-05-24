'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { BellIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { Notification } from '@/app/lib/supabase/notifications';

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const typeConfig: Record<string, { badge: string; icon: React.ReactNode }> = {
  checkout: {
    badge: 'bg-accent-amber/12 text-accent-amber',
    icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3 w-3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" /></svg>,
  },
  checkin: {
    badge: 'bg-success/10 text-success',
    icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3 w-3"><path strokeLinecap="round" strokeLinejoin="round" d="m9 15 3 3m0 0 3-3m-3 3V8.25M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>,
  },
  loan_confirmed: {
    badge: 'bg-success/10 text-success',
    icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3 w-3"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>,
  },
  due_soon: {
    badge: 'bg-warning/10 text-warning',
    icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3 w-3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>,
  },
  hold_ready: {
    badge: 'bg-primary/10 text-primary dark:bg-dark-primary/15 dark:text-dark-primary',
    icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3 w-3"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>,
  },
  hold_placed: {
    badge: 'bg-accent-teal/10 text-accent-teal',
    icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3 w-3"><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" /></svg>,
  },
};

const fallbackConfig = {
  badge: 'bg-surface-cream-strong text-muted dark:bg-dark-surface-strong dark:text-on-dark-soft',
  icon: <BellIcon className="h-3 w-3" />,
};

type Props = {
  hasUnread: boolean;
  onAllRead?: () => void;
};

export default function NotificationPopover({ hasUnread, onAllRead }: Props) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications?limit=5');
      if (!res.ok) return;
      const { notifications: data } = await res.json();
      setNotifications(data ?? []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const handleMarkAllRead = async () => {
    setMarking(true);
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      onAllRead?.();
    } catch { /* ignore */ } finally {
      setMarking(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div ref={panelRef} className="relative">
      {/* Bell trigger */}
      <button
        type="button"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        suppressHydrationWarning
        className="relative flex h-8 w-8 items-center justify-center rounded-xl border border-hairline bg-canvas text-muted transition hover:border-primary/20 hover:text-ink dark:border-dark-hairline dark:bg-dark-surface-card dark:text-on-dark-soft dark:hover:text-on-dark"
      >
        <BellIcon className="h-4 w-4" />
        {hasUnread && (
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary ring-2 ring-canvas dark:ring-dark-canvas" />
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          className="fixed right-4 top-[57px] z-50 w-72 rounded-card border border-hairline bg-surface-card shadow-[0_4px_24px_rgba(20,20,19,0.12)] dark:border-dark-hairline dark:bg-dark-surface-card md:hidden"
          style={{ animation: 'notifPanelIn 0.25s cubic-bezier(0.16,1,0.3,1) both' }}
        >
          <style>{`
            @keyframes notifPanelIn {
              from { opacity: 0; transform: translateY(-6px) scale(0.97); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>

          {/* Header */}
          <div className="flex items-center justify-between rounded-t-card bg-primary px-3 py-2">
            <div className="flex items-center gap-2">
              <p className="font-sans text-[11px] font-semibold text-on-primary">Notifications</p>
              {unreadCount > 0 && (
                <span className="rounded-pill bg-on-primary/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-on-primary">
                  {unreadCount}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="flex h-6 w-6 items-center justify-center rounded-full text-on-primary/70 transition hover:bg-on-primary/15 hover:text-on-primary"
            >
              <XMarkIcon className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Notification list */}
          <div className="max-h-72 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-hairline border-t-primary dark:border-dark-hairline dark:border-t-dark-primary" />
              </div>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-8 text-center font-sans text-[12px] text-muted dark:text-on-dark-soft">
                No notifications yet.
              </p>
            ) : (
              <ul className="divide-y divide-hairline dark:divide-dark-hairline">
                {notifications.map(n => {
                  const cfg = typeConfig[n.type] ?? fallbackConfig;
                  return (
                    <li
                      key={n.id}
                      className={`flex gap-2.5 px-3 py-2.5 ${!n.is_read ? 'bg-primary/[0.03] dark:bg-primary/[0.06]' : ''}`}
                    >
                      <span className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${cfg.badge}`}>
                        {cfg.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-1">
                          <p className={`truncate font-sans text-[12px] font-semibold text-ink dark:text-on-dark ${!n.is_read ? 'text-ink dark:text-on-dark' : 'text-body dark:text-on-dark/70'}`}>
                            {n.title}
                          </p>
                          {!n.is_read && (
                            <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary dark:bg-dark-primary" />
                          )}
                        </div>
                        <p className="line-clamp-2 font-sans text-[11px] leading-snug text-muted dark:text-on-dark-soft">
                          {n.message}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] text-muted-soft dark:text-on-dark-soft">
                          {timeAgo(n.created_at)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between rounded-b-card border-t border-hairline px-3 py-2 dark:border-dark-hairline">
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={marking || unreadCount === 0}
              className="font-sans text-[10px] text-muted transition hover:text-ink disabled:opacity-40 dark:text-on-dark-soft dark:hover:text-on-dark"
            >
              Mark all read
            </button>
            <Link
              href="/dashboard/notifications"
              onClick={() => setOpen(false)}
              className="font-sans text-[10px] font-semibold text-primary hover:underline dark:text-dark-primary"
            >
              View all →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
