'use client';

import React, { useState } from 'react';
import clsx from 'clsx';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
  BarsArrowDownIcon,
  ArrowPathIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

export type NotificationFilterType = 'all' | 'read' | 'unread' | 'flag';
export type NotificationSortField = 'date' | 'title' | 'author';
export type NotificationSortOrder = 'asc' | 'desc';

type Props = {
  action?: string;
  defaults?: {
    q?: string;
    filter?: NotificationFilterType;
    sort?: NotificationSortField;
    order?: NotificationSortOrder;
  };
  className?: string;
};

export default function NotificationsFilter({ action, defaults, className }: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const q = defaults?.q ?? '';
  const filter = defaults?.filter ?? 'all';
  const sort = defaults?.sort ?? 'date';
  const order = defaults?.order ?? 'desc';

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.currentTarget.form?.submit();
  };

  const titleClassName =
    'hidden md:block font-sans text-caption-uppercase text-ink dark:text-on-dark';

  const inputBaseClassName =
    'mt-1 w-full rounded-btn border border-hairline bg-canvas px-3 py-2 font-sans text-body-sm text-ink placeholder:text-muted-soft focus:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-dark-hairline dark:bg-dark-canvas dark:text-on-dark dark:placeholder:text-on-dark-soft';

  // Mobile-only icon button — cream secondary
  const mobileActionBtn =
    'flex md:hidden relative items-center justify-center w-10 h-10 rounded-full bg-surface-cream-strong text-ink active:scale-95 transition dark:bg-dark-surface-strong dark:text-on-dark';

  return (
    <form
      action={action}
      method="get"
      className={clsx(
        'flex flex-row items-end gap-2 rounded-card border border-hairline bg-surface-cream-strong/60 p-3 md:gap-3 md:p-5 dark:border-dark-hairline dark:bg-dark-surface-strong/60',
        className,
      )}
    >
      {/* 1. Search */}
      <div className="flex-1 min-w-0">
        <label htmlFor="q" className={titleClassName}>Search</label>
        <div className="relative mt-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 md:hidden">
            <MagnifyingGlassIcon className="h-4 w-4 text-muted-soft" />
          </div>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Search..."
            className={clsx(inputBaseClassName, 'mt-0 pl-9 md:pl-3')}
          />
        </div>
      </div>

      {/* 2. Filter */}
      <div className="relative">
        <label htmlFor="filter" className={titleClassName}>Filter</label>
        <div className={mobileActionBtn}>
          <FunnelIcon className="h-5 w-5" />
          <select
            name="filter"
            defaultValue={filter}
            onChange={handleSelectChange}
            suppressHydrationWarning
            className="absolute inset-0 cursor-pointer opacity-0"
          >
            <option value="all">All Notifications</option>
            <option value="seen">Read</option>
            <option value="unseen">Unread</option>
            <option value="flag">Flagged</option>
          </select>
        </div>
        <select
          id="filter"
          name="filter"
          defaultValue={filter}
          suppressHydrationWarning
          className={clsx(inputBaseClassName, 'hidden w-32 md:block')}
        >
          <option value="all">All</option>
          <option value="seen">Seen</option>
          <option value="unseen">Unseen</option>
          <option value="flag">Flag</option>
        </select>
      </div>

      {/* 3. Sort field */}
      <div className="relative">
        <label htmlFor="sort" className={titleClassName}>Sort</label>
        <div className={mobileActionBtn}>
          <ArrowsUpDownIcon className="h-5 w-5" />
          <select
            name="sort"
            defaultValue={sort}
            onChange={handleSelectChange}
            suppressHydrationWarning
            className="absolute inset-0 cursor-pointer opacity-0"
          >
            <option value="date">Date</option>
            <option value="title">Action</option>
            <option value="author">Author</option>
          </select>
        </div>
        <select
          id="sort"
          name="sort"
          defaultValue={sort}
          suppressHydrationWarning
          className={clsx(inputBaseClassName, 'hidden w-32 md:block')}
        >
          <option value="date">Date</option>
          <option value="title">Title</option>
          <option value="author">Author</option>
        </select>
      </div>

      {/* 4. Order */}
      <div className="relative">
        <label htmlFor="order" className={titleClassName}>Order</label>
        <div className={mobileActionBtn}>
          <BarsArrowDownIcon className="h-5 w-5" />
          <select
            name="order"
            defaultValue={order}
            onChange={handleSelectChange}
            suppressHydrationWarning
            className="absolute inset-0 cursor-pointer opacity-0"
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>
        <select
          id="order"
          name="order"
          defaultValue={order}
          suppressHydrationWarning
          className={clsx(inputBaseClassName, 'hidden w-32 md:block')}
        >
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
      </div>

      {/* 5. Actions */}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          className="flex h-10 w-10 items-center justify-center rounded-btn bg-primary text-on-primary transition hover:bg-primary/90 md:w-auto md:px-4"
          title="Apply"
        >
          <CheckIcon className="h-5 w-5 md:hidden" />
          <span className="hidden font-sans text-button md:inline">Apply</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setRefreshing(true);
            window.setTimeout(() => window.location.reload(), 80);
          }}
          className="flex h-10 w-10 items-center justify-center rounded-btn border border-hairline bg-surface-card text-muted transition hover:bg-surface-cream-strong md:w-auto md:px-4 dark:border-dark-hairline dark:bg-dark-surface-card dark:text-on-dark-soft dark:hover:bg-dark-surface-strong"
          title="Reset"
        >
          <ArrowPathIcon className={clsx('h-5 w-5 md:hidden', refreshing && 'animate-spin')} />
          <span className="hidden font-sans text-button md:inline">Reset</span>
        </button>
      </div>
    </form>
  );
}
