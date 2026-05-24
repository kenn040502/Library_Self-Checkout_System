'use client';

import React, { useRef, useState } from 'react';
import clsx from 'clsx';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

export type TimePeriod = 'all' | '30d' | '6m' | 'semester';

type Props = {
  action?: string;
  defaults?: {
    q?: string;
    period?: TimePeriod;
  };
  className?: string;
};

export default function BorrowingHistoryFilter({ action = '/dashboard/book/history', defaults, className }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [refreshing, setRefreshing] = useState(false);

  const q = defaults?.q ?? '';
  const period = defaults?.period ?? 'all';

  const handleAutoSubmit = () => {
    formRef.current?.requestSubmit();
  };

  const desktopLabel = 'hidden sm:block font-sans text-caption-uppercase text-muted dark:text-on-dark-soft';

  const unifiedSelectClass = `
    cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-dark-canvas
    absolute inset-0 opacity-0 sm:relative sm:opacity-100
    sm:mt-1 sm:block sm:rounded-btn sm:border sm:border-hairline sm:bg-canvas sm:px-3 sm:py-2 sm:font-sans sm:text-body-sm sm:text-ink
    dark:sm:border-dark-hairline dark:sm:bg-dark-surface-soft dark:sm:text-on-dark
  `;

  const mobileIconStyle = `
    flex items-center justify-center w-10 h-10 rounded-pill
    bg-surface-cream-strong dark:bg-dark-surface-strong text-muted dark:text-on-dark-soft
    sm:hidden pointer-events-none
  `;

  return (
    <form
      ref={formRef}
      action={action}
      method="get"
      className={clsx(
        'rounded-card border border-hairline bg-surface-card p-3 transition-all',
        'dark:border-dark-hairline dark:bg-dark-surface-card/80',
        'flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end',
        className,
      )}
    >
      {/* Search */}
      <div className="flex-1 min-w-0 sm:min-w-[220px]">
        <label htmlFor="q" className={desktopLabel}>Search</label>
        <div className="relative mt-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none sm:hidden">
            <MagnifyingGlassIcon className="h-4 w-4 text-muted-soft dark:text-on-dark-soft" />
          </div>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Search by title or author..."
            onKeyDown={(e) => e.key === 'Enter' && handleAutoSubmit()}
            className="w-full rounded-btn border border-hairline bg-canvas py-2 pl-9 pr-3 font-sans text-body-md text-ink placeholder:text-muted-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas sm:pl-3 dark:border-dark-hairline dark:bg-dark-surface-soft dark:text-on-dark dark:placeholder:text-on-dark-soft dark:focus-visible:ring-offset-dark-canvas"
          />
        </div>
      </div>

      {/* Action Row */}
      <div className="flex flex-row items-center justify-between gap-2 sm:contents">
        {/* Period Filter */}
        <div className="relative flex flex-col items-center sm:items-start">
          <label htmlFor="period" className={desktopLabel}>Period</label>
          <div className="relative">
            <div className={mobileIconStyle}><FunnelIcon className="h-5 w-5" /></div>
            <select
              id="period"
              name="period"
              defaultValue={period}
              onChange={handleAutoSubmit}
              className={clsx(unifiedSelectClass, 'sm:w-[160px]')}
            >
              <option value="all">All time</option>
              <option value="30d">Last 30 days</option>
              <option value="6m">Last 6 months</option>
              <option value="semester">This semester</option>
            </select>
          </div>
        </div>

        {/* Reset */}
        <div className="flex items-center sm:ml-auto">
          <button
            type="button"
            onClick={() => {
              setRefreshing(true);
              window.setTimeout(() => window.location.reload(), 80);
            }}
            className="flex h-10 w-10 items-center justify-center rounded-pill border border-hairline bg-surface-card text-ink hover:bg-surface-cream-strong sm:h-auto sm:w-auto sm:rounded-btn sm:px-4 sm:py-2 dark:border-dark-hairline dark:bg-dark-surface-card dark:text-on-dark dark:hover:bg-dark-surface-strong transition-colors"
            title="Reset Filters"
          >
            <ArrowPathIcon className={clsx('h-5 w-5 sm:hidden', refreshing && 'animate-spin')} />
            <span className="hidden sm:inline font-sans text-button">Reset</span>
          </button>
        </div>
      </div>
    </form>
  );
}
