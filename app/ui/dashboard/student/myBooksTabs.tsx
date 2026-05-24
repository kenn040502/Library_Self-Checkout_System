'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { MagnifyingGlassIcon, XMarkIcon, ChevronRightIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import type { Loan } from '@/app/lib/supabase/types';
import type { BorrowingHistoryLoan, PatronHold } from '@/app/lib/supabase/queries';
import LoanCard from '@/app/ui/dashboard/primitives/LoanCard';
import HoldCard from '@/app/ui/dashboard/primitives/HoldCard';
import BookCover, { getBookGradient } from '@/app/ui/dashboard/primitives/BookCover';
import CancelHoldButton from '@/app/ui/dashboard/cancelHoldButton';

type HistorySort = 'newest' | 'oldest' | 'title-az' | 'title-za';

const fmtDayMonth = new Intl.DateTimeFormat('en-MY', { day: 'numeric', month: 'short' });
const fmtFull     = new Intl.DateTimeFormat('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });

const formatDate = (v: string | null): { dayMonth: string; year: string } => {
  if (!v) return { dayMonth: '—', year: '' };
  const d = new Date(v);
  if (isNaN(d.valueOf())) return { dayMonth: '—', year: '' };
  return { dayMonth: fmtDayMonth.format(d), year: d.getFullYear().toString() };
};

const formatFull = (v: string | null): string => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.valueOf()) ? '—' : fmtFull.format(d);
};

type Tab = 'current' | 'history' | 'reservations';

type MyBooksTabsProps = {
  activeLoans: Loan[];
  loanHistory: BorrowingHistoryLoan[];
  holds: PatronHold[];
  defaultTab?: Tab;
  holdCounts?: Record<string, number>;
  cancelHoldAction?: (formData: FormData) => Promise<void>;
};

export default function MyBooksTabs({
  activeLoans, loanHistory, holds, defaultTab = 'current', holdCounts, cancelHoldAction,
}: MyBooksTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // History controls
  const [historySort,       setHistorySort]       = useState<HistorySort>('newest');
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredHistory = useMemo(() => {
    let items = [...loanHistory];
    if (normalizedSearch) {
      const q = normalizedSearch;
      items = items.filter(l =>
        l.book?.title?.toLowerCase().includes(q) ||
        l.book?.author?.toLowerCase().includes(q),
      );
    }
    items.sort((a, b) => {
      if (historySort === 'newest') return new Date(b.borrowedAt ?? 0).getTime() - new Date(a.borrowedAt ?? 0).getTime();
      if (historySort === 'oldest') return new Date(a.borrowedAt ?? 0).getTime() - new Date(b.borrowedAt ?? 0).getTime();
      if (historySort === 'title-az') return (a.book?.title ?? '').localeCompare(b.book?.title ?? '');
      return (b.book?.title ?? '').localeCompare(a.book?.title ?? '');
    });
    return items;
  }, [loanHistory, normalizedSearch, historySort]);

  const filteredLoans = useMemo(() => {
    let items = [...activeLoans];
    if (normalizedSearch) {
      items = items.filter((loan) =>
        loan.book?.title?.toLowerCase().includes(normalizedSearch) ||
        loan.book?.author?.toLowerCase().includes(normalizedSearch) ||
        loan.copy?.barcode?.toLowerCase().includes(normalizedSearch),
      );
    }
    items.sort((a, b) => {
      if (historySort === 'newest') return new Date(b.borrowedAt ?? 0).getTime() - new Date(a.borrowedAt ?? 0).getTime();
      if (historySort === 'oldest') return new Date(a.borrowedAt ?? 0).getTime() - new Date(b.borrowedAt ?? 0).getTime();
      if (historySort === 'title-az') return (a.book?.title ?? '').localeCompare(b.book?.title ?? '');
      return (b.book?.title ?? '').localeCompare(a.book?.title ?? '');
    });
    return items;
  }, [activeLoans, normalizedSearch, historySort]);

  const filteredHolds = useMemo(() => {
    let items = [...holds];
    if (normalizedSearch) {
      items = items.filter((hold) =>
        hold.title?.toLowerCase().includes(normalizedSearch) ||
        hold.author?.toLowerCase().includes(normalizedSearch),
      );
    }
    items.sort((a, b) => {
      if (historySort === 'newest') {
        const aTime = new Date(a.placedAt ?? 0).getTime();
        const bTime = new Date(b.placedAt ?? 0).getTime();
        return bTime - aTime;
      }
      if (historySort === 'oldest') {
        const aTime = new Date(a.placedAt ?? 0).getTime();
        const bTime = new Date(b.placedAt ?? 0).getTime();
        return aTime - bTime;
      }
      if (historySort === 'title-az') {
        return (a.title ?? '').localeCompare(b.title ?? '');
      }
      return (b.title ?? '').localeCompare(a.title ?? '');
    });
    return items;
  }, [holds, normalizedSearch, historySort]);

  const tabDef: { id: Tab; label: string; count: number }[] = [
    { id: 'current',      label: 'Current',      count: activeLoans.length },
    { id: 'history',      label: 'History',       count: loanHistory.length },
    { id: 'reservations', label: 'Reservations',  count: holds.length },
  ];

  return (
    <div>
      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-soft dark:text-on-dark-soft" />
          <input
            type="search"
            placeholder="Search current, history, or reservations"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-btn border border-hairline bg-canvas py-2 pl-9 pr-3 font-sans text-body-sm text-ink placeholder:text-muted-soft focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-dark-hairline dark:bg-dark-surface-soft dark:text-on-dark dark:placeholder:text-on-dark-soft"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-soft hover:text-ink dark:text-on-dark-soft dark:hover:text-on-dark"
              aria-label="Clear search"
            >
              <XMarkIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="My books"
        className="mb-7 flex border-b border-hairline dark:border-dark-hairline"
      >
        {tabDef.map(t => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              type="button"
              id={`my-books-tab-${t.id}`}
              aria-selected={isActive}
              aria-controls={`my-books-panel-${t.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveTab(t.id)}
              onKeyDown={(e) => {
                if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
                e.preventDefault();
                const idx = tabDef.findIndex((x) => x.id === activeTab);
                const next = e.key === 'ArrowRight'
                  ? tabDef[(idx + 1) % tabDef.length]
                  : tabDef[(idx - 1 + tabDef.length) % tabDef.length];
                setActiveTab(next.id);
                document.getElementById(`my-books-tab-${next.id}`)?.focus();
              }}
              className={`relative pb-3 pr-5 font-sans text-button transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                isActive
                  ? 'text-ink dark:text-on-dark'
                  : 'text-muted-soft hover:text-muted dark:text-on-dark-soft dark:hover:text-on-dark/70'
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span className={`ml-1.5 rounded-pill px-1.5 py-0.5 font-mono text-code font-bold ${
                  isActive
                    ? 'bg-primary/10 text-primary dark:bg-dark-primary/15 dark:text-dark-primary'
                    : 'bg-surface-cream-strong text-muted dark:bg-dark-surface-strong dark:text-on-dark-soft'
                }`}>
                  {t.count}
                </span>
              )}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-5 h-0.5 rounded-t-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab controls */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <select
          value={historySort}
          onChange={e => setHistorySort(e.target.value as HistorySort)}
          className="rounded-btn border border-hairline bg-canvas py-1.5 pl-2.5 pr-7 font-sans text-[11px] text-ink focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-dark-hairline dark:bg-dark-surface-soft dark:text-on-dark"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="title-az">Title A–Z</option>
          <option value="title-za">Title Z–A</option>
        </select>

        <button
          type="button"
          onClick={() => {
            setRefreshing(true);
            window.setTimeout(() => window.location.reload(), 80);
          }}
          aria-label="Refresh"
          className="ml-auto flex h-9 w-9 items-center justify-center rounded-full border border-hairline bg-canvas text-ink transition hover:bg-surface-cream-strong dark:border-dark-hairline dark:bg-dark-surface-soft dark:text-on-dark dark:hover:bg-dark-surface-strong"
        >
          <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {activeTab === 'current' && (
        <div
          role="tabpanel"
          id="my-books-panel-current"
          aria-labelledby="my-books-tab-current"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2"
        >
          {filteredLoans.length === 0 ? (
            <div className="col-span-2 rounded-card border border-dashed border-hairline bg-surface-card p-10 text-center dark:border-dark-hairline dark:bg-dark-surface-card">
              <p className="font-display text-display-sm text-ink dark:text-on-dark">No books borrowed</p>
              <p className="mt-1 font-sans text-body-sm text-muted dark:text-on-dark-soft">You don't have any books checked out right now.</p>
              <Link href="/dashboard/book/items" className="mt-4 inline-flex items-center justify-center rounded-btn bg-primary px-5 h-10 font-sans text-button text-on-primary transition hover:bg-primary-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-dark-canvas">
                Browse catalogue
              </Link>
            </div>
          ) : (
            filteredLoans.map(loan => (
              <LoanCard key={loan.id} loan={loan} holdCount={loan.bookId ? holdCounts?.[loan.bookId] : 0} />
            ))
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div
          role="tabpanel"
          id="my-books-panel-history"
          aria-labelledby="my-books-tab-history"
        >
          {loanHistory.length === 0 ? (
            <div className="overflow-hidden rounded-card border border-hairline bg-surface-card dark:border-dark-hairline dark:bg-dark-surface-card">
              <p className="p-10 text-center font-sans text-body-md text-muted dark:text-on-dark-soft">No loan history yet.</p>
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div className="mb-3" />

              {/* Table */}
              <div className="overflow-hidden rounded-card border border-hairline bg-surface-card dark:border-dark-hairline dark:bg-dark-surface-card">
                {filteredHistory.length === 0 ? (
                  <p className="px-4 py-8 text-center font-sans text-body-sm text-muted dark:text-on-dark-soft">No results match your search.</p>
                ) : (
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-surface-cream-strong dark:bg-dark-surface-strong">
                        {['Book', 'Borrowed', 'Returned'].map(h => (
                          <th key={h} className="border-b border-hairline-soft px-3 py-2.5 text-left font-sans text-caption-uppercase text-ink dark:border-dark-hairline dark:text-on-dark">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHistory.map((loan, i) => {
                        const isExpanded = expandedHistoryId === loan.id;
                        const isLast = i === filteredHistory.length - 1;
                        return (
                          <React.Fragment key={loan.id}>
                            <tr
                              onClick={() => setExpandedHistoryId(prev => prev === loan.id ? null : loan.id)}
                              className={`cursor-pointer select-none transition hover:bg-surface-cream-strong/50 dark:hover:bg-dark-surface-strong/50 ${!isLast || isExpanded ? 'border-b border-hairline-soft dark:border-dark-hairline' : ''}`}
                            >
                              <td className="w-full max-w-0 px-3 py-3">
                                <div className="flex items-center gap-2">
                                  <BookCover gradient={getBookGradient(loan.id)} w={28} h={40} />
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate font-sans text-title-sm leading-tight text-ink dark:text-on-dark">
                                      {loan.book?.title ?? 'Untitled'}
                                    </p>
                                    <p className="truncate font-sans text-body-sm italic text-muted dark:text-on-dark-soft">
                                      {loan.book?.author ?? 'Unknown'}
                                    </p>
                                  </div>
                                  <ChevronRightIcon
                                    className={`h-3.5 w-3.5 flex-shrink-0 text-muted-soft transition-transform duration-200 dark:text-on-dark-soft ${isExpanded ? 'rotate-90' : ''}`}
                                  />
                                </div>
                              </td>
                              <td className="whitespace-nowrap px-3 py-3">
                                <p className="font-mono text-code text-muted dark:text-on-dark-soft">{formatDate(loan.borrowedAt).dayMonth}</p>
                                <p className="font-mono text-[10px] text-muted-soft dark:text-on-dark-soft">{formatDate(loan.borrowedAt).year}</p>
                              </td>
                              <td className="whitespace-nowrap px-3 py-3">
                                <p className="font-mono text-code font-semibold text-success">{formatDate(loan.returnedAt).dayMonth}</p>
                                <p className="font-mono text-[10px] text-muted-soft dark:text-on-dark-soft">{formatDate(loan.returnedAt).year}</p>
                              </td>
                            </tr>

                            {isExpanded && (
                              <tr key={`${loan.id}-detail`} className={!isLast ? 'border-b border-hairline-soft dark:border-dark-hairline' : ''}>
                                <td colSpan={3} className="bg-surface-soft px-3 pb-3 pt-0 dark:bg-dark-surface-soft">
                                  <div className="rounded-lg border border-hairline bg-canvas p-3 dark:border-dark-hairline dark:bg-dark-surface-card">
                                    {/* Book info row */}
                                    <div className="flex gap-3">
                                      <BookCover gradient={getBookGradient(loan.id)} w={44} h={62} />
                                      <div className="min-w-0 flex-1">
                                        <p className="font-sans text-[14px] font-semibold leading-snug text-ink dark:text-on-dark">
                                          {loan.book?.title ?? 'Untitled'}
                                        </p>
                                        <p className="mt-0.5 truncate font-sans text-[12px] italic text-muted dark:text-on-dark-soft">
                                          {loan.book?.author ?? 'Unknown'}
                                        </p>
                                        {loan.book?.isbn && (
                                          <p className="mt-1 font-mono text-[11px] text-muted-soft dark:text-on-dark-soft">
                                            ISBN {loan.book.isbn}
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    {/* Date timeline */}
                                    <div className="mt-3 grid grid-cols-3 gap-2 border-t border-hairline pt-3 dark:border-dark-hairline">
                                      {([
                                        { label: 'Borrowed', value: formatFull(loan.borrowedAt), cls: 'text-muted dark:text-on-dark-soft' },
                                        { label: 'Due',      value: formatFull(loan.dueAt),      cls: 'text-muted dark:text-on-dark-soft' },
                                        { label: 'Returned', value: formatFull(loan.returnedAt), cls: 'text-success' },
                                      ] as const).map(({ label, value, cls }) => (
                                        <div key={label}>
                                          <p className="font-sans text-[10px] font-bold uppercase tracking-wide text-muted-soft dark:text-on-dark-soft">
                                            {label}
                                          </p>
                                          <p className={`mt-0.5 font-mono text-[11px] font-semibold leading-snug ${cls}`}>
                                            {value}
                                          </p>
                                        </div>
                                      ))}
                                    </div>

                                    {/* Footer: stats + link */}
                                    <div className="mt-3 flex items-center justify-between border-t border-hairline pt-2.5 dark:border-dark-hairline">
                                      <div className="flex items-center gap-2 font-mono text-[11px] text-muted-soft dark:text-on-dark-soft">
                                        <span>{loan.loanDurationDays} day{loan.loanDurationDays !== 1 ? 's' : ''}</span>
                                        {loan.renewedCount > 0 && (
                                          <>
                                            <span aria-hidden>·</span>
                                            <span>Renewed {loan.renewedCount}×</span>
                                          </>
                                        )}
                                      </div>
                                      {loan.book?.id && (
                                        <Link
                                          href={`/dashboard/book/${loan.book.id}`}
                                          onClick={e => e.stopPropagation()}
                                          className="font-sans text-[11px] font-semibold text-primary hover:underline dark:text-dark-primary"
                                        >
                                          View book →
                                        </Link>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'reservations' && (
        <div
          role="tabpanel"
          id="my-books-panel-reservations"
          aria-labelledby="my-books-tab-reservations"
          className="flex flex-col gap-3"
        >
          {filteredHolds.length === 0 ? (
            <div className="rounded-card border border-dashed border-hairline bg-surface-card p-10 text-center dark:border-dark-hairline dark:bg-dark-surface-card">
              <p className="font-display text-display-sm text-ink dark:text-on-dark">No active reservations</p>
              <p className="mt-1 font-sans text-body-sm text-muted dark:text-on-dark-soft">Browse the catalogue to place a hold on an unavailable book.</p>
              <Link href="/dashboard/book/items" className="mt-4 inline-flex items-center justify-center rounded-btn bg-primary px-5 h-10 font-sans text-button text-on-primary transition hover:bg-primary-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-dark-canvas">
                Browse catalogue
              </Link>
            </div>
          ) : (
            filteredHolds.map(hold => {
              const canCancel = cancelHoldAction && (hold.status === 'queued' || hold.status === 'ready');
              return (
                <div
                  key={hold.id}
                  className="overflow-hidden rounded-card border border-hairline bg-surface-card dark:border-dark-hairline dark:bg-dark-surface-card"
                >
                  <div className="p-1">
                    <HoldCard hold={hold} />
                  </div>
                  {canCancel && (
                    <div className="flex justify-end border-t border-hairline-soft px-4 py-3 dark:border-dark-hairline">
                      <CancelHoldButton
                        holdId={hold.id}
                        bookTitle={hold.title}
                        cancelAction={cancelHoldAction!}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
