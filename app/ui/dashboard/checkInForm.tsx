'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { useFormStatus } from 'react-dom';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { checkinBookAction } from '@/app/dashboard/actions';
import { initialActionState } from '@/app/dashboard/actionState';
import type { ActionState } from '@/app/dashboard/actionState';
import PatronCombobox, { type PatronOption } from '@/app/ui/dashboard/patronCombobox';
import DamageReportModal, { type DamageSubmitPayload } from '@/app/ui/dashboard/damageReportModal';

type CheckInFormProps = {
  activeLoanCount: number;
  defaultIdentifier?: string;
};

type Mode = 'scan' | 'patron';

type BulkEntry = { when: number; label: string; tone: 'success' | 'damaged' };

const SEVERITY_LABEL: Record<string, string> = {
  damaged: 'Damaged',
  lost: 'Lost',
  needs_inspection: 'Needs inspection',
};

export default function CheckInForm({ activeLoanCount, defaultIdentifier }: CheckInFormProps) {
  const [state, formAction] = useActionState(checkinBookAction, initialActionState);
  const formRef = useRef<HTMLFormElement | null>(null);
  const identifierRef = useRef<HTMLInputElement | null>(null);
  const patronLoanRef = useRef<HTMLSelectElement | null>(null);

  const [mode, setMode] = useState<Mode>('scan');
  const [identifier, setIdentifier] = useState<string>(defaultIdentifier ?? '');
  const [patronLoanId, setPatronLoanId] = useState<string>('');
  const [patronLoans, setPatronLoans] = useState<PatronLoanEntry[]>([]);
  const [patronLoadingFor, setPatronLoadingFor] = useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);

  const [damageOpen, setDamageOpen] = useState(false);
  const [damage, setDamage] = useState<DamageSubmitPayload | null>(null);

  const [bulkMode, setBulkMode] = useState(false);
  const [bulkFeed, setBulkFeed] = useState<BulkEntry[]>([]);

  // On success: optionally preserve scan input refocus for bulk, or show receipt
  useEffect(() => {
    if (state.status === 'success') {
      const label = state.message ?? 'Return processed';
      const tone: BulkEntry['tone'] = damage ? 'damaged' : 'success';
      setBulkFeed((prev) => [{ when: Date.now(), label, tone }, ...prev].slice(0, 3));
      formRef.current?.reset();
      setIdentifier('');
      setPatronLoanId('');
      setPatronLoans([]);
      setDamage(null);
      if (bulkMode) {
        // refocus for the next scan
        setTimeout(() => identifierRef.current?.focus(), 50);
      }
    }
  }, [state.status, state.message, damage, bulkMode]);

  // If parent passes a pre-filled identifier (e.g. from staff dashboard scan), use it
  useEffect(() => {
    if (defaultIdentifier) {
      setIdentifier(defaultIdentifier);
      setMode('scan');
    }
  }, [defaultIdentifier]);

  const handlePatronSelect = async (patron: PatronOption | null) => {
    setPatronLoans([]);
    setPatronLoanId('');
    if (!patron) return;
    setPatronLoadingFor(patron.id);
    try {
      const res = await fetch(`/api/loans/active?userId=${encodeURIComponent(patron.id)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.loans)) {
          setPatronLoans(data.loans);
          if (data.loans.length === 1) {
            setPatronLoanId(data.loans[0].id);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load patron loans', err);
    } finally {
      setPatronLoadingFor(null);
    }
  };

  const openConfirm = () => {
    setConfirmOpen(true);
    setTimeout(() => confirmButtonRef.current?.focus(), 50);
  };

  const doSubmit = () => {
    setConfirmOpen(false);
    formRef.current?.requestSubmit();
  };

  const handleDamageSubmit = (payload: DamageSubmitPayload) => {
    setDamage(payload);
    setDamageOpen(false);
    // Submit the outer form with the new hidden fields now populated.
    setTimeout(() => formRef.current?.requestSubmit(), 20);
  };

  const canSubmit =
    (mode === 'scan' ? identifier.trim().length > 0 : patronLoanId.length > 0);

  const singleReceipt = !bulkMode && bulkFeed[0] && state.status === 'success';

  return (
    <>
      {/* Bulk mode receipt strip */}
      {bulkMode && bulkFeed.length > 0 && (
        <ul className="mb-3 space-y-1.5">
          {bulkFeed.map((entry) => (
            <li
              key={entry.when}
              className={clsx(
                'flex items-center gap-2 rounded-btn border px-3 py-2 font-sans text-body-sm',
                entry.tone === 'damaged'
                  ? 'border-warning/40 bg-warning/10 text-warning'
                  : 'border-success/40 bg-success/10 text-success',
              )}
            >
              <CheckCircleIcon className="h-4 w-4" />
              {entry.label}
            </li>
          ))}
        </ul>
      )}

      <section className="rounded-card border border-hairline dark:border-dark-hairline bg-surface-card dark:bg-dark-surface-card p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="font-display text-display-sm text-ink dark:text-on-dark">
              Record a return
            </h2>
            <p className="font-sans text-body-sm text-muted dark:text-on-dark-soft">
              {activeLoanCount} book{activeLoanCount === 1 ? '' : 's'} currently on loan.
            </p>
          </div>
          <label className="flex items-center gap-2 font-sans text-body-sm font-medium text-muted dark:text-on-dark-soft">
            <input
              type="checkbox"
              checked={bulkMode}
              suppressHydrationWarning
              onChange={(e) => {
                setBulkMode(e.target.checked);
                if (!e.target.checked) setBulkFeed([]);
              }}
            />
            Continue scanning (bulk mode)
          </label>
        </div>

        {/* Mode tabs */}
        <div role="tablist" aria-label="Lookup mode" className="mb-4 flex gap-1 rounded-btn border border-hairline dark:border-dark-hairline bg-surface-cream-strong dark:bg-dark-surface-strong p-1">
          {(['scan', 'patron'] as Mode[]).map((m) => {
            const active = mode === m;
            return (
              <button
                key={m}
                role="tab"
                type="button"
                aria-selected={active}
                suppressHydrationWarning
                onClick={() => setMode(m)}
                className={clsx(
                  'flex-1 rounded-btn px-3 py-2 font-sans text-button transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                  active
                    ? 'bg-surface-card dark:bg-dark-surface-card text-ink dark:text-on-dark'
                    : 'text-muted dark:text-on-dark-soft hover:text-ink dark:hover:text-on-dark',
                )}
              >
                {m === 'scan' ? 'Scan copy' : 'Find by borrower'}
              </button>
            );
          })}
        </div>

        <form ref={formRef} action={formAction} className="space-y-4">
          {/* Hidden damage-report payload (populated by the modal) */}
          <input type="hidden" name="copyStatus" value={damage ? damage.severity : 'available'} />
          <input type="hidden" name="conditionNotes" value={damage?.notes ?? ''} />
          <input
            type="hidden"
            name="damagePhotoUrls"
            value={damage ? JSON.stringify(damage.photoUrls) : '[]'}
          />

          {mode === 'scan' ? (
            <div>
              <label
                htmlFor="identifier"
                className="mb-1.5 block font-sans text-caption-uppercase font-semibold text-muted dark:text-on-dark-soft"
              >
                Copy barcode or loan ID
              </label>
              <input
                id="identifier"
                name="identifier"
                type="text"
                ref={identifierRef}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                suppressHydrationWarning
                required
                placeholder="Scan SWI-xxxxx or paste loan ID"
                autoComplete="off"
                className="w-full rounded-btn border border-hairline dark:border-dark-hairline bg-canvas dark:bg-dark-surface-soft px-3.5 h-10 font-sans text-body-md text-ink dark:text-on-dark placeholder:text-muted-soft dark:placeholder:text-on-dark-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-dark-canvas"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <PatronCombobox name="_patronSearch" nameOfName="_patronName" required={false} onSelect={handlePatronSelect} />
              <div>
                <label
                  htmlFor="patron-loan"
                  className="mb-1.5 block font-sans text-caption-uppercase font-semibold text-muted dark:text-on-dark-soft"
                >
                  Loan to return
                </label>
                <select
                  id="patron-loan"
                  ref={patronLoanRef}
                  value={patronLoanId}
                  onChange={(e) => setPatronLoanId(e.target.value)}
                  disabled={patronLoans.length === 0}
                  className="w-full rounded-btn border border-hairline dark:border-dark-hairline bg-canvas dark:bg-dark-surface-soft px-3.5 h-10 font-sans text-body-md text-ink dark:text-on-dark disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-dark-canvas"
                >
                  <option value="">
                    {patronLoadingFor
                      ? 'Loading\u2026'
                      : patronLoans.length === 0
                        ? 'Pick a patron above to see their loans'
                        : 'Select a loan'}
                  </option>
                  {patronLoans.map((loan) => (
                    <option key={loan.id} value={loan.id}>
                      {loan.title}
                      {loan.barcode ? ` (${loan.barcode})` : ''}
                      {loan.overdue ? ' \u2014 overdue' : ''}
                    </option>
                  ))}
                </select>
              </div>
              {/* Hidden input the server action actually reads */}
              <input type="hidden" name="loanId" value={patronLoanId} />
            </div>
          )}

          {/* Damage chip */}
          {damage ? (
            <div className="flex items-center justify-between gap-3 rounded-btn border border-warning/40 bg-warning/10 px-3 py-2 font-sans text-body-sm text-warning">
              <span>
                Flagged as {SEVERITY_LABEL[damage.severity]}
                {damage.photoUrls.length > 0 && ` \u00b7 ${damage.photoUrls.length} photo${damage.photoUrls.length === 1 ? '' : 's'}`}
                {damage.notes && ` \u00b7 "${damage.notes.length > 40 ? damage.notes.slice(0, 40) + '\u2026' : damage.notes}"`}
              </span>
              <button
                type="button"
                onClick={() => setDamage(null)}
                suppressHydrationWarning
                className="rounded-pill border border-warning/50 px-2 py-0.5 font-sans text-caption-uppercase font-semibold hover:bg-warning/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                Clear
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setDamageOpen(true)}
              disabled={!canSubmit}
              suppressHydrationWarning
              className="font-sans text-body-sm font-semibold text-muted dark:text-on-dark-soft underline underline-offset-2 transition hover:text-primary dark:hover:text-dark-primary disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              Report damage or missing
            </button>
          )}

          {state.status === 'error' && state.message && (
            <p className="font-sans text-body-sm font-semibold text-primary dark:text-dark-primary">{state.message}</p>
          )}
          {singleReceipt && (
            <p className="rounded-btn border border-success/40 bg-success/10 px-3 py-2 font-sans text-body-sm text-success">
              {bulkFeed[0]!.label}
            </p>
          )}

          <div className="flex justify-end">
            <SubmitButton disabled={!canSubmit} onClick={openConfirm} />
          </div>
        </form>
      </section>

      {/* Confirmation dialog */}
      {confirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-return-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-ink/50 dark:bg-dark-canvas/70 backdrop-blur-sm" onClick={() => setConfirmOpen(false)} />
          <div className="relative w-full max-w-md rounded-card border border-hairline dark:border-dark-hairline bg-surface-card dark:bg-dark-surface-card p-6 shadow-[0_4px_16px_rgba(20,20,19,0.08)]">
            <h2 id="confirm-return-title" className="font-display text-display-sm text-ink dark:text-on-dark">
              Confirm book return
            </h2>
            <p className="mt-1 font-sans text-body-sm text-muted dark:text-on-dark-soft">
              This will mark the loan as returned and update the copy status
              {damage ? ` to ${SEVERITY_LABEL[damage.severity]}` : ''}.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                suppressHydrationWarning
                className="flex-1 rounded-btn border border-hairline dark:border-dark-hairline bg-surface-card dark:bg-dark-surface-card px-4 h-10 font-sans text-button text-ink dark:text-on-dark transition hover:bg-surface-cream-strong dark:hover:bg-dark-surface-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-dark-canvas"
              >
                Cancel
              </button>
              <button
                ref={confirmButtonRef}
                type="button"
                onClick={doSubmit}
                suppressHydrationWarning
                className="flex-1 rounded-btn bg-primary hover:bg-primary-active px-4 h-10 font-sans text-button text-on-primary transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-dark-canvas"
              >
                Yes, mark returned
              </button>
            </div>
          </div>
        </div>
      )}

      <DamageReportModal
        open={damageOpen}
        loanId={mode === 'patron' ? patronLoanId || null : null}
        onClose={() => setDamageOpen(false)}
        onSubmit={handleDamageSubmit}
      />
    </>
  );
}

function SubmitButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      suppressHydrationWarning
      className="inline-flex items-center justify-center rounded-btn bg-primary hover:bg-primary-active px-5 h-10 font-sans text-button text-on-primary transition disabled:bg-primary-disabled disabled:text-muted disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-dark-canvas"
    >
      {pending ? 'Processing\u2026' : 'Mark returned'}
    </button>
  );
}

type PatronLoanEntry = {
  id: string;
  title: string;
  barcode: string | null;
  dueAt: string | null;
  overdue: boolean;
};
