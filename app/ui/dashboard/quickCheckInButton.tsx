'use client';

import { useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import clsx from 'clsx';
import { checkinBookAction } from '@/app/dashboard/actions';
import { initialActionState } from '@/app/dashboard/actionState';

const CONFIRM_WORD = 'return';

function SubmitButton({ onClick }: { onClick: () => void }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={onClick}
      suppressHydrationWarning
      className="inline-flex h-9 items-center justify-center rounded-btn border border-hairline bg-surface-card px-3 font-sans text-caption-uppercase text-ink transition hover:border-primary/40 hover:bg-primary hover:text-on-primary disabled:cursor-not-allowed disabled:border-hairline disabled:bg-surface-cream-strong disabled:text-muted-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:border-dark-hairline dark:bg-dark-surface-card dark:text-on-dark dark:disabled:bg-dark-surface-strong dark:disabled:text-on-dark-soft dark:focus-visible:ring-offset-dark-canvas"
    >
      {pending ? 'Returning…' : 'Return'}
    </button>
  );
}

export default function QuickCheckInButton({
  loanId,
  bookTitle,
  borrowerName,
}: {
  loanId: string;
  bookTitle?: string;
  borrowerName?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const confirmInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const action = checkinBookAction.bind(null, initialActionState) as unknown as (
    formData: FormData,
  ) => Promise<void>;

  const handleOpen = () => {
    setConfirmText('');
    setOpen(true);
    setTimeout(() => confirmInputRef.current?.focus(), 60);
  };

  const handleCancel = () => {
    setOpen(false);
    setConfirmText('');
  };

  const handleConfirm = () => {
    if (confirmText.toLowerCase() !== CONFIRM_WORD) return;
    setOpen(false);
    setConfirmText('');
    formRef.current?.requestSubmit();
  };

  const confirmed = confirmText.toLowerCase() === CONFIRM_WORD;

  return (
    <>
      <form ref={formRef} action={action} className="flex justify-end">
        <input type="hidden" name="loanId" value={loanId} />
        <SubmitButton onClick={handleOpen} />
      </form>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`confirm-title-${loanId}`}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-ink/50 backdrop-blur-sm dark:bg-dark-canvas/70"
            onClick={handleCancel}
          />

          {/* Panel */}
          <div className="relative w-full max-w-md rounded-card border border-hairline bg-surface-card p-6 shadow-[0_4px_16px_rgba(20,20,19,0.08)] dark:border-dark-hairline dark:bg-dark-surface-card">
            {/* Warning icon */}
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 text-primary">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>

            <h2 id={`confirm-title-${loanId}`} className="text-left font-display text-display-sm text-ink dark:text-on-dark">
              Confirm book return
            </h2>

            {/* Context — show what's being returned */}
            {(bookTitle || borrowerName) && (
              <div className="mt-3 rounded-card border border-hairline bg-surface-cream-strong px-4 py-3 text-left dark:border-dark-hairline dark:bg-dark-surface-strong">
                {bookTitle && (
                  <p className="truncate font-sans text-body-sm font-medium text-ink dark:text-on-dark">
                    {bookTitle}
                  </p>
                )}
                {borrowerName && (
                  <p className="mt-0.5 font-sans text-caption text-muted dark:text-on-dark-soft">
                    Borrower: {borrowerName}
                  </p>
                )}
              </div>
            )}

            <p className="mt-3 text-left font-sans text-body-sm text-body dark:text-on-dark-soft">
              This will mark the loan as returned and make the copy available again. This cannot be undone without manual intervention.
            </p>

            <div className="mt-5">
              <label
                htmlFor={`confirm-input-${loanId}`}
                className="block text-left font-sans text-body-sm font-medium text-ink dark:text-on-dark"
              >
                Type{' '}
                <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono font-semibold text-primary">
                  {CONFIRM_WORD}
                </span>{' '}
                to confirm
              </label>
              <input
                id={`confirm-input-${loanId}`}
                ref={confirmInputRef}
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                placeholder={CONFIRM_WORD}
                autoComplete="off"
                className="mt-2 w-full rounded-btn border border-hairline bg-canvas px-3 py-2 font-sans text-body-sm text-ink placeholder:text-muted-soft focus:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-dark-hairline dark:bg-dark-canvas dark:text-on-dark dark:placeholder:text-on-dark-soft"
              />
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 rounded-btn border border-hairline bg-surface-card px-4 py-2.5 font-sans text-body-sm font-semibold text-ink transition hover:bg-surface-cream-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-dark-hairline dark:bg-dark-surface-card dark:text-on-dark dark:hover:bg-dark-surface-strong"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!confirmed}
                className={clsx(
                  'flex-1 rounded-btn px-4 py-2.5 font-sans text-body-sm font-semibold text-on-primary transition',
                  confirmed
                    ? 'bg-primary hover:bg-primary/90'
                    : 'cursor-not-allowed bg-primary/30',
                )}
              >
                Yes, return book
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
