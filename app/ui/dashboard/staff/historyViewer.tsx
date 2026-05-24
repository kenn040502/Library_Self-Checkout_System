'use client';

import { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import clsx from 'clsx';
import type {
  HistoryPage,
  HistoryStatusFilter,
  HistoryRange,
} from '@/app/lib/supabase/types';
import BookCover, { getBookGradient } from '@/app/ui/dashboard/primitives/BookCover';
import Chip from '@/app/ui/dashboard/primitives/Chip';

type Props = {
  result: HistoryPage;
  initialFilters: {
    status: HistoryStatusFilter;
    range: HistoryRange;
    rangeStart?: string;
    rangeEnd?: string;
    borrowerQ?: string;
    bookQ?: string;
    handlerQ?: string;
    page: number;
    pageSize: number;
  };
};

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

const STATUS_LABEL: Record<string, string> = {
  borrowed: 'Active',
  returned: 'Returned',
  overdue: 'Overdue',
};

// Chip tone enum is 'default' | 'danger' | 'gold' | 'success' | 'warn'.
// 'gold' is the legacy prop name that resolves to accent-amber per Chat 6 retention.
const STATUS_TONE: Record<string, 'gold' | 'success' | 'danger'> = {
  borrowed: 'gold',
  returned: 'success',
  overdue: 'danger',
};

export default function HistoryViewer({ result, initialFilters }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [borrowerQ, setBorrowerQ] = useState(initialFilters.borrowerQ ?? '');
  const [bookQ, setBookQ] = useState(initialFilters.bookQ ?? '');
  const [handlerQ, setHandlerQ] = useState(initialFilters.handlerQ ?? '');

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value && value !== '') next.set(key, value);
    else next.delete(key);
    next.delete('page');
    router.push(`${pathname}?${next.toString()}`);
  };

  const goToPage = (n: number) => {
    const next = new URLSearchParams(params.toString());
    next.set('page', String(n));
    router.push(`${pathname}?${next.toString()}`);
  };

  const setPageSize = (size: number) => {
    const next = new URLSearchParams(params.toString());
    next.set('pageSize', String(size));
    next.delete('page'); // reset to first page so we don't land past the new last page
    router.push(`${pathname}?${next.toString()}`);
  };

  // CSV export is handled by the sibling route handler at /dashboard/staff/history/export.
  const exportHref = `${pathname}/export?${params.toString()}`;

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  const STATUSES: Array<[HistoryStatusFilter, string]> = [
    ['all', 'All'],
    ['borrowed', 'Active'],
    ['returned', 'Returned'],
    ['overdue', 'Overdue'],
  ];
  const RANGES: Array<[HistoryRange, string]> = [
    ['30d', '30 days'],
    ['6m', '6 months'],
    ['semester', 'Semester'],
    ['all', 'All time'],
  ];

  const inputClass =
    'w-full rounded-btn border border-hairline bg-canvas px-3.5 h-10 font-sans text-body-sm text-ink placeholder:text-muted-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus:border-primary/40 dark:border-dark-hairline dark:bg-dark-canvas dark:text-on-dark dark:placeholder:text-on-dark-soft';

  const pillBase =
    'rounded-pill px-3 py-1.5 font-sans text-caption-uppercase transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-dark-canvas';
  const pillActive = 'bg-primary text-on-primary';
  const pillInactive =
    'border border-hairline bg-surface-card text-body hover:bg-surface-cream-strong dark:border-dark-hairline dark:bg-dark-surface-card dark:text-on-dark/80 dark:hover:bg-dark-surface-strong';

  return (
    <div className="space-y-6 text-ink dark:text-on-dark">
      {/* Filters */}
      <div className="space-y-3 rounded-card border border-hairline bg-surface-card p-5 dark:border-dark-hairline dark:bg-dark-surface-card">
        <div className="flex flex-wrap gap-2">
          {STATUSES.map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setParam('status', v === 'all' ? null : v)}
              className={clsx(pillBase, initialFilters.status === v ? pillActive : pillInactive)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {RANGES.map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setParam('range', v === '30d' ? null : v)}
              className={clsx(pillBase, initialFilters.range === v ? pillActive : pillInactive)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          <input
            value={borrowerQ}
            onChange={(e) => setBorrowerQ(e.target.value)}
            onBlur={() => setParam('borrower', borrowerQ)}
            placeholder="Borrower (name / student ID)"
            className={inputClass}
          />
          <input
            value={bookQ}
            onChange={(e) => setBookQ(e.target.value)}
            onBlur={() => setParam('book', bookQ)}
            placeholder="Book (title / author / barcode)"
            className={inputClass}
          />
          <input
            value={handlerQ}
            onChange={(e) => setHandlerQ(e.target.value)}
            onBlur={() => setParam('handler', handlerQ)}
            placeholder="Handler (staff name)"
            className={inputClass}
          />
        </div>
      </div>

      {/* Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-code text-muted dark:text-on-dark-soft">
          Showing {result.rows.length} of {result.total} loans · {result.active} active ·{' '}
          {result.returned} returned · {result.overdue} overdue
        </p>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">
            Rows
            <select
              value={initialFilters.pageSize}
              onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
              className="h-10 rounded-btn border border-hairline bg-surface-card px-3 font-sans text-body-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-dark-hairline dark:bg-dark-surface-card dark:text-on-dark"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          <a
            href={exportHref}
            download
            className="inline-flex h-10 items-center rounded-btn border border-hairline bg-surface-card px-4 font-sans text-body-sm font-medium text-ink transition hover:bg-surface-cream-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:border-dark-hairline dark:bg-dark-surface-card dark:text-on-dark dark:hover:bg-dark-surface-strong dark:focus-visible:ring-offset-dark-canvas"
          >
            Export CSV
          </a>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-card border border-hairline bg-surface-card dark:border-dark-hairline dark:bg-dark-surface-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] table-fixed">
            <colgroup>
              <col style={{ width: '24%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '17%' }} />
            </colgroup>
            <thead>
              <tr className="bg-surface-cream-strong dark:bg-dark-surface-strong">
                {['Book', 'Borrower', 'Borrowed', 'Due', 'Returned', 'Duration', 'Status', 'Handler'].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left font-sans text-caption-uppercase text-ink dark:text-on-dark"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {result.rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center font-sans text-body-sm text-muted dark:text-on-dark-soft">
                    No loans match these filters.
                  </td>
                </tr>
              ) : (
                result.rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-hairline-soft transition hover:bg-surface-cream-strong/50 dark:border-dark-hairline dark:hover:bg-dark-surface-strong/50"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        {r.book?.coverImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={r.book.coverImageUrl}
                            alt=""
                            className="h-12 w-8 rounded object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <BookCover
                            gradient={getBookGradient(r.book?.title ?? r.id)}
                            w={32}
                            h={46}
                            radius={3}
                          />
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-sans text-title-md text-ink dark:text-on-dark">
                            {r.book?.title ?? '—'}
                          </p>
                          <p className="truncate font-display text-body-sm italic text-muted dark:text-on-dark-soft">
                            {r.book?.author ?? '—'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-sans text-body-sm text-ink dark:text-on-dark">
                      {r.borrower?.displayName ?? '—'}
                      <br />
                      <span className="font-mono text-code text-muted dark:text-on-dark-soft">
                        {r.borrower?.studentId ?? ''}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 font-mono text-code text-muted dark:text-on-dark-soft">
                      {new Date(r.borrowedAt).toLocaleDateString('en-MY')}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 font-mono text-code text-muted dark:text-on-dark-soft">
                      {new Date(r.dueAt).toLocaleDateString('en-MY')}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 font-mono text-code text-muted dark:text-on-dark-soft">
                      {r.returnedAt ? new Date(r.returnedAt).toLocaleDateString('en-MY') : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 font-mono text-code text-muted dark:text-on-dark-soft">{r.durationDays}d</td>
                    <td className="px-4 py-3.5">
                      <Chip mono tone={STATUS_TONE[r.status]}>
                        {STATUS_LABEL[r.status]}
                      </Chip>
                    </td>
                    <td className="px-4 py-3.5 font-sans text-body-sm text-ink dark:text-on-dark">
                      {r.handler?.isSelfCheckout
                        ? 'Self-checkout'
                        : r.handler?.displayName ?? '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {result.total > result.pageSize && (
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => goToPage(Math.max(1, initialFilters.page - 1))}
            disabled={initialFilters.page === 1}
            className="inline-flex h-9 items-center rounded-btn border border-hairline bg-surface-card px-3 font-sans text-caption-uppercase text-ink transition hover:bg-surface-cream-strong disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:border-dark-hairline dark:bg-dark-surface-card dark:text-on-dark dark:hover:bg-dark-surface-strong dark:focus-visible:ring-offset-dark-canvas"
          >
            Previous
          </button>
          <span className="font-sans text-body-sm text-muted dark:text-on-dark-soft">
            Page {initialFilters.page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => goToPage(Math.min(totalPages, initialFilters.page + 1))}
            disabled={initialFilters.page >= totalPages}
            className="inline-flex h-9 items-center rounded-btn border border-hairline bg-surface-card px-3 font-sans text-caption-uppercase text-ink transition hover:bg-surface-cream-strong disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:border-dark-hairline dark:bg-dark-surface-card dark:text-on-dark dark:hover:bg-dark-surface-strong dark:focus-visible:ring-offset-dark-canvas"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
