'use client';

import { useEffect, useState, useTransition } from 'react';
import {
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import type { DamageReportRow, DamageSeverity } from '@/app/lib/supabase/queries';
import { createPortal } from 'react-dom';
import ConfirmModal from '@/app/ui/dashboard/confirmModal';
import {
  deleteDamageReportAction,
  updateDamageReportAction,
  resolveDamageReportAction,
} from '@/app/dashboard/damageActions';

const SEVERITY_LABEL: Record<DamageSeverity, { label: string; color: string }> = {
  damaged: { label: 'Damaged', color: 'bg-warning/15 text-warning' },
  lost: { label: 'Lost', color: 'bg-primary/15 text-primary' },
  needs_inspection: { label: 'Needs inspection', color: 'bg-accent-teal/15 text-accent-teal' },
};

type Props = {
  report: DamageReportRow | null;
  signedUrls: Record<string, string | null>;
  userRole?: 'admin' | 'staff' | 'user';
  onClose: () => void;
};

export default function DamageReportDetailModal({ report, signedUrls, userRole, onClose }: Props) {
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmResolveOpen, setConfirmResolveOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editSeverity, setEditSeverity] = useState<DamageSeverity>('damaged');
  const [editNotes, setEditNotes] = useState('');
  const [resolveNotes, setResolveNotes] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletePending, startDeleteTransition] = useTransition();
  const [updatePending, startUpdateTransition] = useTransition();
  const [resolvePending, startResolveTransition] = useTransition();

  useEffect(() => {
    if (report) {
      setEditSeverity(report.severity);
      setEditNotes(report.notes ?? '');
      setResolveNotes('');
      setIsEditing(false);
      setActionError(null);
    }
  }, [report?.id, report]);

  if (!report) return null;

  const sev = SEVERITY_LABEL[report.severity];
  const isResolved = Boolean(report.resolvedAt);
  const canResolve = !isResolved && (userRole === 'staff' || userRole === 'admin');
  const canDelete = userRole === 'staff' || userRole === 'admin';
  const canEdit = userRole === 'admin' && !isResolved;

  const handleDelete = () => {
    setConfirmDeleteOpen(false);
    setActionError(null);
    startDeleteTransition(async () => {
      const result = await deleteDamageReportAction(report.id);
      if (!result.ok) { setActionError(result.error); return; }
      onClose();
    });
  };

  const handleResolve = () => {
    setConfirmResolveOpen(false);
    setActionError(null);
    startResolveTransition(async () => {
      const result = await resolveDamageReportAction({
        reportId: report.id,
        resolutionNotes: resolveNotes,
      });
      if (!result.ok) { setActionError(result.error); return; }
      onClose();
    });
  };

  const handleSaveEdit = () => {
    setActionError(null);
    startUpdateTransition(async () => {
      const result = await updateDamageReportAction({
        reportId: report.id,
        severity: editSeverity,
        notes: editNotes,
      });
      if (!result.ok) { setActionError(result.error); return; }
      setIsEditing(false);
      onClose();
    });
  };

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
              className="font-display text-display-sm text-ink dark:text-on-dark tracking-tight break-words whitespace-normal"
            >
              {report.copy?.book?.title ?? 'Unknown book'}
            </h2>
            {report.copy?.book?.author && (
              <p className="mt-0.5 font-display text-body-sm italic text-muted dark:text-on-dark-soft break-words whitespace-normal">
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

        {/* Resolved banner */}
        {isResolved && (
          <div className="mb-4 flex items-start gap-3 rounded-card border border-accent-teal/30 bg-accent-teal/8 px-4 py-3">
            <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-accent-teal" />
            <div className="min-w-0">
              <p className="font-sans text-body-sm font-semibold text-accent-teal">
                Repaired — back in circulation
              </p>
              <p className="mt-0.5 font-sans text-caption text-ink/70 dark:text-on-dark/70">
                Resolved {formatDate(report.resolvedAt)}
                {report.resolvedBy
                  ? ` by ${report.resolvedBy.displayName ?? report.resolvedBy.email}`
                  : ''}
              </p>
              {report.resolutionNotes && (
                <p className="mt-1 font-sans text-caption text-ink/80 dark:text-on-dark/80">
                  {report.resolutionNotes}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Severity + action buttons */}
        <div className="mb-5 flex items-center justify-between gap-3 flex-wrap">
          {isEditing ? (
            <label className="flex items-center gap-2">
              <span className="font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">
                Severity
              </span>
              <select
                value={editSeverity}
                onChange={(e) => setEditSeverity(e.target.value as DamageSeverity)}
                className="h-9 rounded-btn border border-hairline bg-canvas px-3 font-sans text-body-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-dark-hairline dark:bg-dark-canvas dark:text-on-dark"
              >
                <option value="damaged">Damaged</option>
                <option value="lost">Lost</option>
                <option value="needs_inspection">Needs inspection</option>
              </select>
            </label>
          ) : (
            <span
              className={clsx(
                'inline-flex items-center rounded-pill px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider',
                sev.color,
              )}
            >
              {sev.label}
            </span>
          )}

          {!isEditing && (canEdit || canResolve || canDelete) && (
            <div className="flex items-center gap-2">
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-1.5 rounded-btn border border-hairline bg-surface-card px-3 py-1.5 font-sans text-button text-ink transition hover:bg-surface-cream-strong dark:border-dark-hairline dark:bg-dark-surface-card dark:text-on-dark dark:hover:bg-dark-surface-strong"
                >
                  <PencilSquareIcon className="h-4 w-4" />
                  Edit
                </button>
              )}
              {canResolve && (
                <button
                  type="button"
                  onClick={() => setConfirmResolveOpen(true)}
                  disabled={resolvePending}
                  className="inline-flex items-center gap-1.5 rounded-btn border border-accent-teal/40 bg-canvas px-3 py-1.5 font-sans text-button text-accent-teal transition hover:bg-accent-teal/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-accent-teal/40 dark:bg-dark-surface-soft"
                >
                  <CheckCircleIcon className="h-4 w-4" />
                  {resolvePending ? 'Resolving…' : 'Mark as repaired'}
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteOpen(true)}
                  disabled={deletePending}
                  className="inline-flex items-center gap-1.5 rounded-btn border border-primary/40 bg-canvas px-3 py-1.5 font-sans text-button text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-primary/40 dark:bg-dark-surface-soft dark:text-dark-primary"
                >
                  <TrashIcon className="h-4 w-4" />
                  {deletePending ? 'Deleting…' : 'Delete'}
                </button>
              )}
            </div>
          )}
        </div>

        {actionError && (
          <p className="mb-3 rounded-btn border border-primary/30 bg-primary/5 px-3 py-2 font-sans text-body-sm text-primary">
            {actionError}
          </p>
        )}

        {/* Meta grid */}
        <dl className="mb-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 rounded-card border border-hairline bg-surface-cream-strong/40 p-4 font-mono text-code dark:border-dark-hairline dark:bg-dark-surface-strong/40">
          <div className="min-w-0">
            <dt className="font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">
              Copy barcode
            </dt>
            <dd className="mt-0.5 text-ink dark:text-on-dark">
              {report.copy?.barcode ?? '—'}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">
              Borrower
            </dt>
            <dd className="mt-0.5 text-ink dark:text-on-dark min-w-0 truncate sm:whitespace-normal sm:break-words">
              {report.borrower?.displayName ?? report.borrower?.email ?? '—'}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">
              Reported by
            </dt>
            <dd className="mt-0.5 text-ink dark:text-on-dark min-w-0 truncate sm:whitespace-normal sm:break-words">
              {report.reportedBy?.displayName ?? report.reportedBy?.email ?? '—'}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">
              Loan due / returned
            </dt>
            <dd className="mt-0.5 text-ink dark:text-on-dark break-words whitespace-normal min-w-0">
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
          {isEditing ? (
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              rows={4}
              placeholder="Describe the damage or condition…"
              className="w-full rounded-card border border-hairline bg-canvas p-3 font-sans text-body-sm text-ink placeholder:text-muted-soft focus:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-dark-hairline dark:bg-dark-canvas dark:text-on-dark"
            />
          ) : report.notes ? (
            <p className="whitespace-pre-wrap rounded-card border border-hairline bg-canvas p-3 font-sans text-body-sm text-ink dark:border-dark-hairline dark:bg-dark-canvas dark:text-on-dark">
              {report.notes}
            </p>
          ) : (
            <p className="rounded-card border border-dashed border-hairline p-3 text-center font-sans text-caption text-muted dark:border-dark-hairline dark:text-on-dark-soft">
              No notes recorded.
            </p>
          )}
        </div>

        {/* Edit mode save/cancel */}
        {isEditing && (
          <div className="mb-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setEditSeverity(report.severity);
                setEditNotes(report.notes ?? '');
                setActionError(null);
              }}
              disabled={updatePending}
              className="inline-flex items-center rounded-btn border border-hairline bg-surface-card px-4 py-2 font-sans text-button text-ink transition hover:bg-surface-cream-strong disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-hairline dark:bg-dark-surface-card dark:text-on-dark"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={updatePending}
              className="inline-flex items-center rounded-btn bg-primary px-4 py-2 font-sans text-button text-on-primary transition hover:bg-primary-active disabled:cursor-not-allowed disabled:opacity-50"
            >
              {updatePending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        )}

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

      {/* Resolve confirmation — includes resolution notes */}
      {confirmResolveOpen && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setConfirmResolveOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-card border border-hairline bg-surface-card p-6 shadow-lg dark:border-dark-hairline dark:bg-dark-surface-card">
            <h3 className="mb-1 font-display text-display-sm text-ink dark:text-on-dark">
              Mark as repaired?
            </h3>
            <p className="mb-4 font-sans text-body-sm text-muted dark:text-on-dark-soft">
              This will restore{' '}
              <span className="font-semibold text-ink dark:text-on-dark">
                {report.copy?.book?.title ?? report.copy?.barcode ?? 'this copy'}
              </span>{' '}
              to circulation and notify any patron waiting on hold.
            </p>
            <label className="mb-4 block">
              <span className="mb-1 block font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">
                Resolution notes (optional)
              </span>
              <textarea
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                rows={3}
                placeholder="e.g. Cover replaced, pages rebound…"
                className="w-full rounded-card border border-hairline bg-canvas p-3 font-sans text-body-sm text-ink placeholder:text-muted-soft focus:border-accent-teal/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal/40 dark:border-dark-hairline dark:bg-dark-canvas dark:text-on-dark"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmResolveOpen(false)}
                className="inline-flex items-center rounded-btn border border-hairline bg-surface-card px-4 py-2 font-sans text-button text-ink transition hover:bg-surface-cream-strong dark:border-dark-hairline dark:bg-dark-surface-card dark:text-on-dark"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResolve}
                disabled={resolvePending}
                className="inline-flex items-center gap-1.5 rounded-btn bg-accent-teal px-4 py-2 font-sans text-button text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCircleIcon className="h-4 w-4" />
                {resolvePending ? 'Resolving…' : 'Confirm — mark as repaired'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Delete confirmation */}
      <ConfirmModal
        isOpen={confirmDeleteOpen}
        type="danger"
        title="Delete this damage report?"
        message={`Delete the ${sev.label.toLowerCase()} report for "${report.copy?.book?.title ?? report.copy?.barcode ?? 'this book'}"? Attached photos will also be removed. Staff and admin will be notified. This cannot be undone.`}
        confirmText={deletePending ? 'Deleting…' : 'Yes, delete'}
        cancelText="Cancel"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>,
    document.body,
  );
}
