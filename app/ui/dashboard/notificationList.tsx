'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { InboxIcon, MagnifyingGlassIcon, ArrowsUpDownIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import type { Notification } from '@/app/lib/supabase/notifications';
import type { NotificationFilterType } from '@/app/ui/dashboard/notificationFilter';
import NotificationItem from '@/app/ui/dashboard/primitives/NotificationItem';
import FilterPills from '@/app/ui/dashboard/primitives/FilterPills';

function shortTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatDateTime(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Returns a day-group bucket label: Today / Yesterday / DD MMM. */
function dayBucket(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Earlier';
  const today = new Date();
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (isSameDay(d, today)) return 'Today';
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (isSameDay(d, y)) return 'Yesterday';
  return d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });
}

function NotificationDetails({ n }: { n: Notification }) {
  const m = n.metadata ?? {};
  const rows: { label: string; value: string }[] = [];
  if (m.bookTitle) rows.push({ label: 'Book', value: m.bookTitle });
  if (m.bookAuthor) rows.push({ label: 'Author', value: m.bookAuthor });
  if (m.barcode) rows.push({ label: 'Barcode', value: m.barcode });
  if (m.patronName) rows.push({ label: 'Borrower', value: m.patronName });
  if (m.patronIdentifier) rows.push({ label: 'Borrower ID', value: m.patronIdentifier });
  if (m.dueAt) rows.push({ label: 'Due date', value: formatDateTime(m.dueAt) });
  if (m.expiresAt) rows.push({ label: 'Pickup expires', value: formatDateTime(m.expiresAt) });
  if (m.loanId) rows.push({ label: 'Loan ID', value: m.loanId });
  if (m.holdId) rows.push({ label: 'Hold ID', value: m.holdId });
  rows.push({ label: 'Received', value: formatDateTime(n.created_at) });

  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
      {rows.map(({ label, value }) => (
        <div key={label}>
          <dt className="font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">
            {label}
          </dt>
          <dd className="mt-0.5 break-all font-mono text-code text-ink dark:text-on-dark">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

type InboxFilter = 'all' | 'unread' | 'read' | 'flagged';
type SortField = 'date' | 'title';
type SortOrder = 'desc' | 'asc';

interface Props {
  filter?: NotificationFilterType;
  searchQuery?: string;
}

export default function NotificationList({ filter: initialFilter = 'all', searchQuery: initialSearch = '' }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<InboxFilter>(
    (['all', 'unread', 'read', 'flagged'] as string[]).includes(initialFilter ?? '') ? (initialFilter as InboxFilter) : 'all',
  );
  const [search, setSearch] = useState<string>(initialSearch);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/notifications?filter=all&limit=200`);
      if (!res.ok) return;
      const { notifications: data } = (await res.json()) as { notifications: Notification[] };
      setNotifications(data ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  // ── Read / unread ────────────────────────────────────────────
  const markRead = async (id: string) => {
    setMarking(id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId: id }),
    });
    await refresh();
    setMarking(null);
  };

  const markAllRead = async () => {
    setMarking('all');
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationIds: unreadIds }),
    });
    await refresh();
    setMarking(null);
  };

  const toggleRead = useCallback(async (id: string, currentRead: boolean) => {
    setNotifications((prev) =>
      prev.map((n) => n.id === id ? { ...n, is_read: !currentRead } : n),
    );
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        currentRead
          ? { notificationId: id, markUnread: true }
          : { notificationId: id },
      ),
    });
  }, []);

  // ── Flag / unflag ────────────────────────────────────────────
  const toggleFlag = useCallback(async (id: string, currentFlagged: boolean) => {
    setNotifications((prev) =>
      prev.map((n) => n.id === id ? { ...n, is_flagged: !currentFlagged } : n),
    );
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId: id, flagged: !currentFlagged }),
    });
  }, []);

  // ── Derived counts ───────────────────────────────────────────
  const unreadCount  = notifications.filter((n) => !n.is_read).length;
  const readCount    = notifications.filter((n) => n.is_read).length;
  const flaggedCount = notifications.filter((n) => n.is_flagged).length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matches = notifications.filter((n) => {
      if (filter === 'unread'  && n.is_read)    return false;
      if (filter === 'read'    && !n.is_read)   return false;
      if (filter === 'flagged' && !n.is_flagged) return false;
      if (!q) return true;
      return (
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q) ||
        (n.metadata?.bookTitle ?? '').toLowerCase().includes(q) ||
        (n.metadata?.bookAuthor ?? '').toLowerCase().includes(q)
      );
    });

    const direction = sortOrder === 'asc' ? 1 : -1;
    return [...matches].sort((a, b) => {
      if (sortField === 'title') {
        return a.title.localeCompare(b.title) * direction;
      }
      return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * direction;
    });
  }, [notifications, filter, search, sortField, sortOrder]);

  // Group filtered notifications by day bucket, preserving server order (newest first).
  const groups = useMemo(() => {
    const map = new Map<string, Notification[]>();
    for (const n of filtered) {
      const key = dayBucket(n.created_at);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(n);
    }
    return [...map.entries()];
  }, [filtered]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <svg
          className="h-6 w-6 animate-spin text-muted-soft dark:text-on-dark-soft"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search + sort bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-soft dark:text-on-dark-soft" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, message, book…"
            className="w-full rounded-btn border border-hairline bg-canvas py-2 pl-9 pr-3 font-sans text-body-sm text-ink placeholder:text-muted-soft focus:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-dark-hairline dark:bg-dark-canvas dark:text-on-dark dark:placeholder:text-on-dark-soft"
          />
        </div>
        <div className="flex items-center gap-1 rounded-btn border border-hairline bg-surface-card px-1 py-1 font-sans text-body-sm dark:border-dark-hairline dark:bg-dark-surface-card">
          <ArrowsUpDownIcon className="mx-1 h-4 w-4 text-ink/40 dark:text-on-dark/50" />
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            suppressHydrationWarning
            className="cursor-pointer border-0 bg-transparent pl-2 pr-7 text-ink outline-none focus:ring-0 dark:text-on-dark"
            aria-label="Sort field"
          >
            <option value="date">Date</option>
            <option value="title">Action</option>
          </select>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            suppressHydrationWarning
            className="cursor-pointer border-0 bg-transparent pl-2 pr-7 text-ink outline-none focus:ring-0 dark:text-on-dark"
            aria-label="Sort order"
          >
            <option value="desc">Newest</option>
            <option value="asc">Oldest</option>
          </select>
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            window.setTimeout(() => window.location.reload(), 80);
          }}
          aria-label="Refresh notifications"
          title="Refresh"
          suppressHydrationWarning
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-btn border border-hairline bg-surface-card text-ink transition hover:bg-surface-cream-strong dark:border-dark-hairline dark:bg-dark-surface-card dark:text-on-dark dark:hover:bg-dark-surface-strong"
        >
          <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter pills + Mark all read */}
      <div className="flex items-center justify-between gap-3">
        <FilterPills<InboxFilter>
          options={[
            { value: 'all',     label: 'All',     count: notifications.length },
            { value: 'unread',  label: 'Unread',  count: unreadCount },
            { value: 'read',    label: 'Read',    count: readCount },
            { value: 'flagged', label: 'Flagged', count: flaggedCount },
          ]}
          value={filter}
          onChange={setFilter}
        />
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            disabled={marking === 'all'}
            className="inline-flex h-9 items-center gap-1.5 rounded-pill border border-hairline bg-surface-card px-3 font-sans text-caption-uppercase text-ink transition hover:text-primary disabled:opacity-50 dark:border-dark-hairline dark:bg-dark-surface-card dark:text-on-dark dark:hover:text-dark-primary"
          >
            {marking === 'all' ? 'Marking…' : 'Mark all read'}
          </button>
        )}
      </div>

      {/* Grouped list */}
      <div className="overflow-hidden rounded-card border border-hairline bg-surface-card dark:border-dark-hairline dark:bg-dark-surface-card">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <InboxIcon className="h-9 w-9 text-muted-soft dark:text-on-dark-soft" />
            <div>
              <p className="font-display text-display-sm text-ink dark:text-on-dark">
                All caught up
              </p>
              <p className="mt-1 font-sans text-body-sm text-muted dark:text-on-dark-soft">
                {search.trim()
                  ? 'No notifications match your search.'
                  : filter === 'unread'
                  ? 'No unread notifications'
                  : filter === 'read'
                  ? 'No read notifications'
                  : filter === 'flagged'
                  ? 'No flagged notifications'
                  : 'No notifications yet'}
              </p>
            </div>
          </div>
        ) : (
          groups.map(([dayLabel, items], gi) => (
            <div key={dayLabel}>
              <div
                className={`border-b border-hairline-soft bg-surface-cream-strong/60 px-5 py-2 font-sans text-caption-uppercase text-muted dark:border-dark-hairline dark:bg-dark-surface-strong/60 dark:text-on-dark-soft ${
                  gi > 0 ? 'border-t' : ''
                }`}
              >
                {dayLabel}
              </div>
              <ul className="divide-y divide-hairline-soft dark:divide-dark-hairline">
                {items.map((n) => (
                  <li key={n.id}>
                    <NotificationItem
                      type={n.type}
                      title={n.title}
                      body={n.message}
                      timeLabel={shortTime(n.created_at)}
                      read={n.is_read}
                      flagged={n.is_flagged}
                      onClick={() => {
                        setExpandedId((prev) => (prev === n.id ? null : n.id));
                        if (!n.is_read) markRead(n.id);
                      }}
                      onToggleFlag={() => toggleFlag(n.id, n.is_flagged)}
                      onToggleRead={() => toggleRead(n.id, n.is_read)}
                      expanded={expandedId === n.id}
                      details={
                        <div className="space-y-3">
                          <NotificationDetails n={n} />
                          {!n.is_read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markRead(n.id);
                              }}
                              disabled={marking === n.id}
                              className="rounded-btn bg-surface-cream-strong px-3 py-1.5 font-sans text-caption-uppercase text-ink transition hover:bg-primary/10 hover:text-primary disabled:opacity-50 dark:bg-dark-surface-strong dark:text-on-dark dark:hover:bg-primary/15"
                            >
                              {marking === n.id ? '…' : 'Mark as read'}
                            </button>
                          )}
                        </div>
                      }
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
