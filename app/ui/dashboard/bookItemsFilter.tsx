'use client';

import React, { useMemo, useRef, useState, useTransition } from 'react';
import clsx from 'clsx';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  MagnifyingGlassIcon,
  Squares2X2Icon,
  ListBulletIcon,
  CameraIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { CATEGORY_OPTIONS, type CategoryKey } from '@/app/ui/dashboard/bookCategories';
import CameraScanModal from '@/app/ui/dashboard/admin/cameraScanModal';

type SortField = 'title' | 'author' | 'year' | 'created_at';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'grid' | 'list';

export type ItemStatus =
  | 'available'
  | 'checked_out'
  | 'on_hold'
  | 'reserved'
  | 'maintenance';

type Props = {
  action?: string;
  defaults?: {
    q?: string;
    status?: ItemStatus;
    sort?: SortField;
    order?: SortOrder;
    view?: ViewMode;
    category?: CategoryKey;
  };
  className?: string;
};

export default function BookItemsFilter({ action, defaults, className }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const q = defaults?.q ?? '';
  const view = (defaults?.view ?? 'grid') as ViewMode;
  const activeCategory = (defaults?.category ?? 'all') as CategoryKey;

  const baseParams = useMemo(() => {
    return new URLSearchParams(searchParams?.toString() ?? '');
  }, [searchParams]);

  const updateParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(baseParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === '') {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`);
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const searchValue = (form.elements.namedItem('q') as HTMLInputElement | null)?.value ?? '';
    updateParams({ q: searchValue.trim() || null });
  };

  return (
    <form
      ref={formRef}
      action={action}
      method="get"
      onSubmit={handleSubmit}
      className={clsx('flex flex-col gap-3', className)}
    >
      {/* Row 1: search input + camera button */}
      <div className="flex items-center gap-2">
        {/* Search — text-input spec: canvas bg, rounded-btn (8px), h-10, hairline border */}
        <div className="relative min-w-0 flex-1">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-soft dark:text-on-dark-soft" />
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Search title, author, ISBN…"
            suppressHydrationWarning
            className="h-10 w-full rounded-btn border border-hairline bg-canvas py-2.5 pl-9 pr-12 font-sans text-body-sm text-ink placeholder:text-muted-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:border-dark-hairline dark:bg-dark-surface-soft dark:text-on-dark dark:placeholder:text-on-dark-soft dark:focus-visible:ring-offset-dark-canvas"
          />
          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            aria-label="Scan with camera"
            suppressHydrationWarning
            className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center text-primary transition hover:text-primary-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-dark-primary dark:hover:text-dark-primary"
          >
            <CameraIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Row 2: view toggle + refresh */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => updateParams({ view: view === 'grid' ? 'list' : 'grid' })}
          aria-label={view === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
          suppressHydrationWarning
          className="flex h-10 w-full items-center justify-between rounded-btn border border-hairline bg-canvas px-3 text-left text-ink transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-dark-hairline dark:bg-dark-surface-card dark:text-on-dark"
        >
          <span className="font-sans text-body-sm">
            {view === 'grid' ? 'Grid view' : 'List view'}
          </span>
          {view === 'grid' ? (
            <Squares2X2Icon className="h-4 w-4" />
          ) : (
            <ListBulletIcon className="h-4 w-4" />
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            setRefreshing(true);
            window.setTimeout(() => window.location.reload(), 80);
          }}
          aria-label="Refresh results"
          suppressHydrationWarning
          className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-canvas text-muted transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-dark-hairline dark:bg-dark-surface-card dark:text-on-dark-soft dark:hover:text-on-dark"
        >
          <ArrowPathIcon className={clsx('h-4 w-4', refreshing && 'animate-spin')} />
        </button>
      </div>

      {/* Row 2: category tabs — category-tab / category-tab-active per DESIGN.md */}
      <div className="flex items-center gap-0.5 overflow-x-auto rounded-lg bg-surface-soft p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden dark:bg-dark-surface-soft">
        {CATEGORY_OPTIONS.map((cat) => {
          const active = cat.key === activeCategory;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => updateParams({ category: cat.key === 'all' ? null : cat.key })}
              disabled={isPending}
              aria-pressed={active}
              suppressHydrationWarning
              className={clsx(
                'flex-shrink-0 whitespace-nowrap rounded px-3.5 py-1.5 font-sans text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                active
                  ? 'bg-canvas text-ink shadow-sm dark:bg-dark-surface-card dark:text-on-dark'
                  : 'text-muted hover:text-body dark:text-on-dark-soft dark:hover:text-on-dark',
              )}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Hidden fields for JS-off fallback */}
      <input type="hidden" name="view" value={view} />
      <input type="hidden" name="category" value={activeCategory} />

      {scannerOpen && (
        <CameraScanModal
          onResult={(value) => {
            updateParams({ q: value.trim() || null });
            setScannerOpen(false);
          }}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </form>
  );
}
