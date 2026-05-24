'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  ExclamationTriangleIcon,
  PhotoIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import type { DamageReportRow, DamageSeverity } from '@/app/lib/supabase/queries';
import DamageReportDetailModal from '@/app/ui/dashboard/staff/damageReportDetailModal';

// Severity palette remap from raw amber/rose/sky to semantic tokens
// (extends Chat 12 STAGE_STYLES + Chat 14 STATUS_STYLE precedent).
const SEVERITY_OPTIONS: Array<{ value: DamageSeverity; label: string; color: string }> = [
  { value: 'damaged', label: 'Damaged', color: 'bg-warning/15 text-warning' },
  { value: 'lost', label: 'Lost', color: 'bg-primary/15 text-primary' },
  { value: 'needs_inspection', label: 'Needs inspection', color: 'bg-accent-teal/15 text-accent-teal' },
];

const RANGE_OPTIONS = [
  { value: 'all', label: 'All time' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];

type Props = {
  reports: DamageReportRow[];
  signedUrls: Record<string, string | null>;
  initialFilters: {
    severity: DamageSeverity[];
    range: string;
    q: string;
  };
};

export default function DamageReportsViewer({ reports, signedUrls, initialFilters }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchValue, setSearchValue] = useState(initialFilters.q);
  const [openReportId, setOpenReportId] = useState<string | null>(null);

  const openReport = useMemo(
    () => reports.find((r) => r.id === openReportId) ?? null,
    [reports, openReportId],
  );

  const updateParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams?.toString() ?? '');
    if (value === null || value === '') next.delete(key);
    else next.set(key, value);
    router.push(`${pathname}?${next.toString()}`);
  };

  const toggleSeverity = (severity: DamageSeverity) => {
    const current = initialFilters.severity;
    const next = current.includes(severity)
      ? current.filter((s) => s !== severity)
      : [...current, severity];
    updateParam('severity', next.length ? next.join(',') : null);
  };

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    updateParam('q', searchValue.trim() || null);
  };

  const severityChip = (severity: DamageSeverity) => {
    const opt = SEVERITY_OPTIONS.find((s) => s.value === severity);
    if (!opt) return null;
    return (
      <span
        className={clsx(
          'inline-flex items-center rounded-pill px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider',
          opt.color,
        )}
      >
        {opt.label}
      </span>
    );
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('en-MY', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative min-w-[240px] flex-1">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-soft dark:text-on-dark-soft" />
          <input
            type="search"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search by title, author, barcode, borrower, notes…"
            className="w-full rounded-btn border border-hairline bg-canvas py-2 pl-9 pr-3 font-sans text-body-sm text-ink placeholder:text-muted-soft focus:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-dark-hairline dark:bg-dark-canvas dark:text-on-dark dark:placeholder:text-on-dark-soft"
          />
        </form>

        {/* Date range */}
        <select
          value={initialFilters.range}
          onChange={(e) => updateParam('range', e.target.value === 'all' ? null : e.target.value)}
          className="cursor-pointer rounded-btn border border-hairline bg-canvas px-3 py-2 pr-8 font-sans text-body-sm text-ink focus:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-dark-hairline dark:bg-dark-canvas dark:text-on-dark"
        >
          {RANGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Severity pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">
          Severity:
        </span>
        {SEVERITY_OPTIONS.map((opt) => {
          const active = initialFilters.severity.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleSeverity(opt.value)}
              className={clsx(
                'rounded-pill border px-3 py-1 font-sans text-caption transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                active
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-hairline bg-surface-card text-body hover:bg-surface-cream-strong dark:border-dark-hairline dark:bg-dark-surface-card dark:text-on-dark/80 dark:hover:bg-dark-surface-strong',
              )}
              aria-pressed={active}
            >
              {opt.label}
            </button>
          );
        })}
        {initialFilters.severity.length > 0 && (
          <button
            type="button"
            onClick={() => updateParam('severity', null)}
            className="ml-1 font-sans text-caption font-medium text-primary underline-offset-2 hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      {/* Result count */}
      <p className="font-mono text-code text-muted dark:text-on-dark-soft">
        {reports.length} {reports.length === 1 ? 'report' : 'reports'}
      </p>

      {/* List */}
      {reports.length === 0 ? (
        <div className="rounded-card border border-dashed border-hairline bg-surface-card p-10 text-center dark:border-dark-hairline dark:bg-dark-surface-card">
          <ExclamationTriangleIcon className="mx-auto h-8 w-8 text-muted-soft dark:text-on-dark-soft" />
          <p className="mt-3 font-display text-display-sm text-ink dark:text-on-dark">
            No damage reports
          </p>
          <p className="mt-1 font-sans text-body-sm text-muted dark:text-on-dark-soft">
            Reports submitted during returns will appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-card border border-hairline bg-surface-card dark:border-dark-hairline dark:bg-dark-surface-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-surface-cream-strong dark:bg-dark-surface-strong">
                <tr>
                  {['Date', 'Severity', 'Book', 'Copy', 'Borrower', 'Reported by', 'Photos', ''].map(
                    (h) => (
                      <th
                        key={h || 'actions'}
                        className="px-3 py-2 font-sans text-[10px] font-semibold uppercase tracking-[1.4px] text-ink dark:text-on-dark"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-hairline-soft transition hover:bg-surface-cream-strong/50 dark:border-dark-hairline dark:hover:bg-dark-surface-strong/50"
                  >
                    <td className="px-3 py-2 align-top font-sans text-[13px] text-ink dark:text-on-dark">
                      {formatDate(r.createdAt)}
                    </td>
                    <td className="px-3 py-2 align-top">{severityChip(r.severity)}</td>
                    <td className="px-3 py-2 align-top">
                      <p className="font-sans text-[14px] font-semibold text-ink dark:text-on-dark">
                        {r.copy?.book?.title ?? '—'}
                      </p>
                      {r.copy?.book?.author && (
                        <p className="font-display text-[12px] italic text-muted dark:text-on-dark-soft">
                          by {r.copy.book.author}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top font-mono text-[12px] text-muted dark:text-on-dark-soft">
                      {r.copy?.barcode ?? '—'}
                    </td>

                    <td className="px-3 py-2 align-top font-sans text-[13px] text-ink dark:text-on-dark">
                      <p
                        className="max-w-[180px] truncate"
                        title={r.borrower?.displayName ?? r.borrower?.email ?? '—'}
                      >
                        {r.borrower?.displayName ?? r.borrower?.email ?? '—'}
                      </p>
                    </td>

                    <td className="px-3 py-2 align-top font-sans text-[13px] text-muted dark:text-on-dark-soft">
                      <p
                        className="max-w-[180px] truncate"
                        title={r.reportedBy?.displayName ?? r.reportedBy?.email ?? '—'}
                      >
                        {r.reportedBy?.displayName ?? r.reportedBy?.email ?? '—'}
                      </p>
                    </td>
                    
                    <td className="px-3 py-2 align-top">
                      {r.photoPaths.length > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-pill bg-surface-cream-strong px-2 py-0.5 font-mono text-[11px] text-muted dark:bg-dark-surface-strong dark:text-on-dark-soft">
                          <PhotoIcon className="h-3 w-3" />
                          {r.photoPaths.length}
                        </span>
                      ) : (
                        <span className="font-mono text-[12px] text-muted-soft dark:text-on-dark-soft">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <button
                        type="button"
                        onClick={() => setOpenReportId(r.id)}
                        className="inline-flex h-8 items-center rounded-btn border border-hairline bg-surface-card px-2.5 font-sans text-[10px] font-semibold uppercase tracking-[1.4px] text-ink transition hover:bg-surface-cream-strong hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:border-dark-hairline dark:bg-dark-surface-card dark:text-on-dark dark:hover:bg-dark-surface-strong dark:focus-visible:ring-offset-dark-canvas"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail modal */}
      <DamageReportDetailModal
        report={openReport}
        signedUrls={signedUrls}
        onClose={() => setOpenReportId(null)}
      />
    </div>
  );
}
