'use client';

import { useMemo, useState } from 'react';
import BookCover, { getBookGradient } from '@/app/ui/dashboard/primitives/BookCover';
import KpiCard from '@/app/ui/dashboard/primitives/KpiCard';
import FilterPills from '@/app/ui/dashboard/primitives/FilterPills';
import StatusBadge from '@/app/ui/dashboard/primitives/StatusBadge';
import MarkReadyButton from '@/app/ui/dashboard/markReadyButton';
import StaffCancelHoldButton from '@/app/ui/dashboard/staff/staffCancelHoldButton';

type StaffHoldRow = {
  id: string;
  book_id: string;
  patron_id: string;
  status: 'queued' | 'ready' | 'canceled' | 'fulfilled' | 'expired' | string;
  placed_at: string | null;
  ready_at: string | null;
  expires_at: string | null;
  book_title?: string | null;
  book_cover?: string | null;
  patron_name?: string | null;
};

type Filter = 'all' | 'ready' | 'queued';

type HoldsManagementViewProps = {
  holds: StaffHoldRow[];
  firstInQueueIds: string[];
  availableBookIds: string[];
  markReadyAction: (formData: FormData) => Promise<void>;
  cancelHoldAction: (formData: FormData) => Promise<void>;
};

const fmtDate = (v: string | null) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.valueOf())
    ? '—'
    : d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });
};

export default function HoldsManagementView({
  holds,
  firstInQueueIds,
  availableBookIds,
  markReadyAction,
  cancelHoldAction,
}: HoldsManagementViewProps) {
  const [filter, setFilter] = useState<Filter>('all');

  const counts = useMemo(() => {
    const ready = holds.filter((h) => h.status === 'ready').length;
    const queued = holds.filter((h) => h.status === 'queued').length;
    return { total: holds.length, ready, queued };
  }, [holds]);

  const firstInQueue = useMemo(() => new Set(firstInQueueIds), [firstInQueueIds]);
  const available = useMemo(() => new Set(availableBookIds), [availableBookIds]);

  const filtered = useMemo(() => {
    if (filter === 'all') return holds;
    return holds.filter((h) => h.status === filter);
  }, [holds, filter]);

  const pillOptions = [
    { value: 'all' as Filter, label: 'All', count: counts.total },
    { value: 'ready' as Filter, label: 'Ready', count: counts.ready },
    { value: 'queued' as Filter, label: 'Queued', count: counts.queued },
  ];

  return (
    <div className="space-y-6">
      {/* Summary strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard label="Total holds" value={counts.total} />
        <KpiCard
          label="Ready for pickup"
          value={counts.ready}
          danger={counts.ready > 0}
          delta={counts.ready > 0 ? `${counts.ready} ready` : undefined}
          footer="awaiting collection"
          className={counts.ready > 0 ? 'border-primary/40 dark:border-dark-primary/40' : undefined}
        />
        <KpiCard label="In queue" value={counts.queued} />
      </div>

      {/* Filter pills */}
      <div className="flex items-center justify-between gap-3">
        <FilterPills<Filter> options={pillOptions} value={filter} onChange={setFilter} />
        <p className="font-mono text-code text-muted dark:text-on-dark-soft">
          {filtered.length} of {counts.total}
        </p>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-card border border-hairline bg-surface-card dark:border-dark-hairline dark:bg-dark-surface-card">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-surface-cream-strong dark:bg-dark-surface-strong">
                {['Book', 'Patron', 'Status', 'Placed', 'Pickup / Queue', 'Actions'].map((h) => (
                  <th
                    key={h}
                    className={`px-4 py-3 text-left font-sans text-caption-uppercase text-ink dark:text-on-dark ${
                      h === 'Actions' ? 'text-right' : ''
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center font-sans text-body-sm text-muted dark:text-on-dark-soft">
                    No holds match this filter.
                  </td>
                </tr>
              )}
              {filtered.map((h) => {
                const isReady = h.status === 'ready';
                const canMarkReady = firstInQueue.has(h.id) && available.has(h.book_id);
                return (
                  <tr
                    key={h.id}
                    className="border-t border-hairline-soft transition hover:bg-surface-cream-strong/50 dark:border-dark-hairline dark:hover:bg-dark-surface-strong/50"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        {h.book_cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={h.book_cover}
                            alt=""
                            className="h-10 w-7 flex-shrink-0 rounded object-cover ring-1 ring-hairline dark:ring-dark-hairline"
                          />
                        ) : (
                          <BookCover gradient={getBookGradient(h.book_title ?? h.id)} w={28} h={40} radius={3} />
                        )}
                        <span className="font-sans text-title-md text-ink dark:text-on-dark">
                          {h.book_title ?? 'Unknown title'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-sans text-body-sm text-ink dark:text-on-dark">
                      {h.patron_name ?? 'Unknown patron'}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={isReady ? 'READY' : 'QUEUED'} />
                    </td>
                    <td className="px-4 py-3.5 font-mono text-code text-muted dark:text-on-dark-soft">
                      {fmtDate(h.placed_at)}
                    </td>
                    <td className="px-4 py-3.5">
                      {isReady ? (
                        <span className="font-mono text-caption-uppercase font-semibold text-primary">
                          Pickup by {fmtDate(h.expires_at)}
                        </span>
                      ) : (
                        <span className="font-mono text-code text-muted dark:text-on-dark-soft">
                          Awaiting copy
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex justify-end gap-2">
                        {h.status === 'queued' && firstInQueue.has(h.id) && (
                          <MarkReadyButton
                            holdId={h.id}
                            patronId={h.patron_id}
                            bookId={h.book_id}
                            bookTitle={h.book_title ?? ''}
                            action={markReadyAction}
                            available={canMarkReady}
                          />
                        )}
                        {(h.status === 'queued' || h.status === 'ready') && (
                          <StaffCancelHoldButton
                            holdId={h.id}
                            bookTitle={h.book_title ?? 'this book'}
                            patronName={h.patron_name ?? undefined}
                            cancelAction={cancelHoldAction}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
