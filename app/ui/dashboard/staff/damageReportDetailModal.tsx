'use client';

import { XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import type { DamageReportRow, DamageSeverity } from '@/app/lib/supabase/queries';
import { createPortal } from 'react-dom';

// Severity palette remap from raw amber/rose/sky to semantic tokens
// (extends Chat 12 STAGE_STYLES + Chat 14 STATUS_STYLE precedent).
const SEVERITY_LABEL: Record<DamageSeverity, { label: string; color: string }> = {
  damaged: {
    label: 'Damaged',
    color: 'bg-warning/15 text-warning',
  },
  lost: {
    label: 'Lost',
    color: 'bg-primary/15 text-primary',
  },
  needs_inspection: {
    label: 'Needs inspection',
    color: 'bg-accent-teal/15 text-accent-teal',
  },
};

type Props = {
  report: DamageReportRow | null;
  signedUrls: Record<string, string | null>;
  onClose: () => void;
};

export default function DamageReportDetailModal({ report, signedUrls, onClose }: Props) {
  if (!report) return null;

  const sev = SEVERITY_LABEL[report.severity];
  const formatDate = (iso: string | null | undefined) =>
    iso
      ? new Date(iso).toLocaleString('en-MY', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—';

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="damage-detail-title"
      className="fixed inset-0 z-[999] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-card border border-hairline bg-surface-card p-6 shadow-[0_4px_16px_rgba(20,20,19,0.08)] dark:border-dark-hairline dark:bg-dark-surface-card">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="mb-1 font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">
              Damage report · {formatDate(report.createdAt)}
            </p>
            <h2
              id="damage-detail-title"
              className="font-display text-display-sm text-ink dark:text-on-dark tracking-tight"
            >
              {report.copy?.book?.title ?? 'Unknown book'}
            </h2>
            {report.copy?.book?.author && (
              <p className="mt-0.5 font-display text-body-sm italic text-muted dark:text-on-dark-soft">
                by {report.copy.book.author}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-pill p-1.5 text-muted transition hover:bg-surface-cream-strong hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-on-dark-soft dark:hover:bg-dark-surface-strong dark:hover:text-on-dark"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Severity */}
        <div className="mb-5">
          <span
            className={clsx(
              'inline-flex items-center rounded-pill px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider',
              sev.color,
            )}
          >
            {sev.label}
          </span>
        </div>

        {/* Meta grid */}
        <dl className="mb-5 grid gap-x-6 gap-y-3 rounded-card border border-hairline bg-surface-cream-strong/40 p-4 font-mono text-code dark:border-dark-hairline dark:bg-dark-surface-strong/40 sm:grid-cols-2">
          <div>
            <dt className="font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">
              Copy barcode
            </dt>
            <dd className="mt-0.5 text-ink dark:text-on-dark">
              {report.copy?.barcode ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">
              Borrower
            </dt>
            <dd className="mt-0.5 text-ink dark:text-on-dark">
              {report.borrower?.displayName ?? report.borrower?.email ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">
              Reported by
            </dt>
            <dd className="mt-0.5 text-ink dark:text-on-dark">
              {report.reportedBy?.displayName ?? report.reportedBy?.email ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">
              Loan due / returned
            </dt>
            <dd className="mt-0.5 text-ink dark:text-on-dark">
              Due {formatDate(report.loan?.dueAt)}
              {report.loan?.returnedAt ? ` · Returned ${formatDate(report.loan.returnedAt)}` : ''}
            </dd>
          </div>
        </dl>

        {/* Notes */}
        <div className="mb-5">
          <p className="mb-1.5 font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">
            Notes
          </p>
          {report.notes ? (
            <p className="whitespace-pre-wrap rounded-card border border-hairline bg-canvas p-3 font-sans text-body-sm text-ink dark:border-dark-hairline dark:bg-dark-canvas dark:text-on-dark">
              {report.notes}
            </p>
          ) : (
            <p className="rounded-card border border-dashed border-hairline p-3 text-center font-sans text-caption text-muted dark:border-dark-hairline dark:text-on-dark-soft">
              No notes recorded.
            </p>
          )}
        </div>

        {/* Photos */}
        <div>
          <p className="mb-2 font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">
            Photos ({report.photoPaths.length})
          </p>
          {report.photoPaths.length === 0 ? (
            <p className="rounded-card border border-dashed border-hairline p-3 text-center font-sans text-caption text-muted dark:border-dark-hairline dark:text-on-dark-soft">
              No photos attached.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {report.photoPaths.map((path) => {
                const url = signedUrls[path];
                return (
                  <a
                    key={path}
                    href={url ?? '#'}
                    target="_blank"
                    rel="noreferrer"
                    className={clsx(
                      'group relative block aspect-square overflow-hidden rounded-card border border-hairline bg-surface-cream-strong dark:border-dark-hairline dark:bg-dark-surface-strong',
                      !url && 'pointer-events-none opacity-60',
                    )}
                  >
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={url}
                        alt={`Damage photo ${path}`}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center font-mono text-code text-muted dark:text-on-dark-soft">
                        Unable to load
                      </div>
                    )}
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
