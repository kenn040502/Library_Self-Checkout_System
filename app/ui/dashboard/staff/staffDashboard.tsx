'use client';

import { useState } from 'react';
import {
  QrCodeIcon,
  BookOpenIcon,
  BookmarkIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import AdminShell from '@/app/ui/dashboard/adminShell';
import type { DashboardSummary, Loan } from '@/app/lib/supabase/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type ReadyHoldLite = {
  id: string;
  patron: string;
  bookTitle: string;
  expiresAt: string | null;
};

type StaffDashboardProps = {
  userName: string | null;
  summary: DashboardSummary;
  recentLoans: Loan[];
  readyHolds: ReadyHoldLite[];
  readyHoldsCount: number;
};

const expiresFmt = new Intl.DateTimeFormat('en-MY', { day: 'numeric', month: 'short' });

function formatExpires(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.valueOf())) return '—';
  return expiresFmt.format(d);
}

function formatActivity(loan: Loan): {
  type: 'checkout' | 'return';
  patron: string;
  book: string;
  barcode: string;
  minutesAgo: number;
} {
  const type: 'checkout' | 'return' = loan.returnedAt ? 'return' : 'checkout';
  const anchor = loan.returnedAt ?? loan.borrowedAt;
  const minutesAgo = Math.max(0, Math.round((Date.now() - new Date(anchor).getTime()) / 60_000));
  return {
    type,
    patron: loan.borrowerName ?? 'Unknown patron',
    book: loan.book?.title ?? 'Unknown book',
    barcode: loan.copy?.barcode ?? '—',
    minutesAgo,
  };
}

function formatTimeAgo(minutes: number): string {
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function StaffDashboard({
  userName,
  summary,
  recentLoans,
  readyHolds,
  readyHoldsCount,
}: StaffDashboardProps) {
  const router = useRouter();
  const [scanInput, setScanInput] = useState('');
  const firstName = userName?.split(' ')[0] ?? 'Staff';
  const h = new Date().getHours();
  const tod = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';

  // Semantic icon colors per spec §3.5: in-flight (checked out) → accent-amber,
  // success (available) → success, attention (holds ready) → accent-teal, alert (overdue) → primary.
  const stats = [
    { label: 'Checked out', value: summary.activeLoans, icon: BookOpenIcon, color: 'text-accent-amber' },
    { label: 'Available',   value: summary.availableBooks, icon: ArrowPathIcon, color: 'text-success' },
    { label: 'Holds ready', value: readyHoldsCount, icon: BookmarkIcon, color: 'text-accent-teal' },
    { label: 'Overdue',     value: summary.overdueLoans, icon: ExclamationTriangleIcon, color: 'text-primary' },
  ];

  const activity = recentLoans.map((loan) => ({ id: loan.id, ...formatActivity(loan) }));

  const handleScan = (mode: 'checkout' | 'checkin') => {
    const q = scanInput.trim();
    const target = mode === 'checkout' ? '/dashboard/book/checkout' : '/dashboard/book/checkin';
    const href = q ? `${target}?q=${encodeURIComponent(q)}` : target;
    router.push(href);
  };

  return (
    <AdminShell
      titleSubtitle="Staff Desk"
      title={`${tod}, ${firstName}`}
      description="Process borrowals and returns. Scan a barcode or search by patron name."
      primaryAction={
        <Link
          href="/dashboard/book/checkout"
          className="inline-flex h-10 items-center gap-1.5 rounded-btn bg-primary px-4 font-sans text-button text-on-primary transition hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-dark-canvas"
        >
          <QrCodeIcon className="h-4 w-4" />
          Quick scan
        </Link>
      }
    >
      {/* Scan form + stats */}
      <div className="mb-7 grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
        {/* Scan hero — solid bg-primary per spec §6.4 (drop gradient + boxShadow) */}
        <div className="relative overflow-hidden rounded-card bg-primary p-7 text-on-primary">
          <div className="absolute -right-8 -top-8 h-44 w-44 rounded-full bg-on-primary/10" aria-hidden="true" />
          <p className="relative mb-2 font-sans text-caption-uppercase opacity-80">
            Self-Service Desk · Scan to Process
          </p>
          <h2 className="relative mb-5 font-display text-display-md tracking-tight">
            Quick checkout or return
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleScan('checkout');
            }}
            suppressHydrationWarning
            className="relative flex items-center gap-2.5 rounded-btn border border-on-primary/25 bg-on-primary/15 py-1 pl-3.5 pr-1.5"
          >
            <QrCodeIcon className="h-4 w-4 opacity-80" />
            <label htmlFor="staff-scan" className="sr-only">Scan barcode or type SWI code</label>
            <input
              id="staff-scan"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              placeholder="Scan barcode or type SWI-xxxxx…"
              autoComplete="off"
              suppressHydrationWarning
              className="flex-1 bg-transparent font-sans text-body-sm text-on-primary placeholder:text-on-primary/55 outline-none"
            />
            <button
              type="submit"
              suppressHydrationWarning
              className="inline-flex h-9 items-center rounded-btn bg-on-primary px-4 font-sans text-button text-primary transition hover:bg-on-primary/90"
            >
              Process
            </button>
          </form>
          <div className="relative mt-3.5 flex gap-2">
            <button
              type="button"
              onClick={() => handleScan('checkout')}
              suppressHydrationWarning
              className="rounded-btn border border-on-primary/25 bg-on-primary/15 px-3 py-1.5 font-sans text-caption-uppercase transition hover:bg-on-primary/25"
            >
              Checkout
            </button>
            <button
              type="button"
              onClick={() => handleScan('checkin')}
              suppressHydrationWarning
              className="rounded-btn border border-on-primary/25 bg-on-primary/15 px-3 py-1.5 font-sans text-caption-uppercase transition hover:bg-on-primary/25"
            >
              Return
            </button>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3.5 rounded-card border border-hairline bg-surface-card p-6 dark:border-dark-hairline dark:bg-dark-surface-card">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="rounded-card border border-hairline-soft bg-surface-cream-strong p-3.5 dark:border-dark-hairline dark:bg-dark-surface-strong"
              >
                <Icon className={`mb-2 h-4 w-4 ${s.color}`} />
                <p className="font-display text-display-sm text-ink dark:text-on-dark">
                  {s.value}
                </p>
                <p className="mt-1 font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">
                  {s.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity + holds to shelve */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[3fr_2fr]">
        {/* Activity today */}
        <div className="rounded-card border border-hairline bg-surface-card p-6 dark:border-dark-hairline dark:bg-dark-surface-card">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-display-sm text-ink dark:text-on-dark tracking-tight">
                Recent activity
              </h2>
              <p className="mt-0.5 font-mono text-code text-muted dark:text-on-dark-soft">
                Last {activity.length} transaction{activity.length === 1 ? '' : 's'}
              </p>
            </div>
            <Link
              href="/dashboard/staff/history"
              className="inline-flex h-9 items-center rounded-btn border border-hairline bg-surface-card px-3 font-sans text-caption-uppercase text-ink transition hover:bg-surface-cream-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:border-dark-hairline dark:bg-dark-surface-card dark:text-on-dark dark:hover:bg-dark-surface-strong dark:focus-visible:ring-offset-dark-canvas"
            >
              Full history
            </Link>
          </div>
          <div>
            {activity.length === 0 ? (
              <p className="py-6 text-center font-sans text-body-sm text-muted dark:text-on-dark-soft">
                No recent transactions yet.
              </p>
            ) : (
              activity.map((q, i) => (
                <div
                  key={q.id}
                  className={`flex items-center gap-3.5 py-3 ${i < activity.length - 1 ? 'border-b border-hairline-soft dark:border-dark-hairline' : ''}`}
                >
                  <span
                    className={`h-2 w-2 flex-shrink-0 rounded-full ${q.type === 'checkout' ? 'bg-accent-amber' : 'bg-success'}`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-sans text-body-sm font-semibold text-ink dark:text-on-dark">
                      {q.patron} —{' '}
                      <span className="font-display italic font-normal">{q.book}</span>
                    </p>
                    <p className="font-mono text-caption-uppercase text-muted dark:text-on-dark-soft">
                      {q.type === 'checkout' ? 'Checkout' : 'Return'} · {q.barcode}
                    </p>
                  </div>
                  <span className="font-mono text-code text-muted-soft dark:text-on-dark-soft">
                    {formatTimeAgo(q.minutesAgo)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Holds to shelve */}
        <div className="rounded-card border border-hairline bg-surface-card p-6 dark:border-dark-hairline dark:bg-dark-surface-card">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-display-sm text-ink dark:text-on-dark tracking-tight">
                Holds to shelve
              </h2>
              <p className="mt-0.5 font-mono text-code text-muted dark:text-on-dark-soft">
                {readyHoldsCount} ready for pickup
              </p>
            </div>
            <Link
              href="/dashboard/book/holds"
              className="inline-flex h-9 items-center rounded-btn border border-hairline bg-surface-card px-3 font-sans text-caption-uppercase text-ink transition hover:bg-surface-cream-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:border-dark-hairline dark:bg-dark-surface-card dark:text-on-dark dark:hover:bg-dark-surface-strong dark:focus-visible:ring-offset-dark-canvas"
            >
              Manage
            </Link>
          </div>
          <div>
            {readyHolds.length === 0 ? (
              <p className="py-6 text-center font-sans text-body-sm text-muted dark:text-on-dark-soft">
                No holds awaiting pickup.
              </p>
            ) : (
              readyHolds.map((hold, i) => (
                <div
                  key={hold.id}
                  className={`py-3.5 ${i < readyHolds.length - 1 ? 'border-b border-hairline-soft dark:border-dark-hairline' : ''}`}
                >
                  <p className="font-display text-title-md text-ink dark:text-on-dark tracking-tight">
                    {hold.bookTitle}
                  </p>
                  <p className="mt-0.5 font-mono text-code text-muted dark:text-on-dark-soft">
                    Patron: {hold.patron}
                    {hold.expiresAt && ` · Expires ${formatExpires(hold.expiresAt)}`}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
