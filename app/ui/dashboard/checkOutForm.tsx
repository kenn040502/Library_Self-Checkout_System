'use client';

import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { useFormStatus } from 'react-dom';
import { ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { checkoutBookAction } from '@/app/dashboard/actions';
import { initialActionState } from '@/app/dashboard/actionState';
import type { Book } from '@/app/lib/supabase/types';
import CameraScannerButton from '@/app/ui/dashboard/cameraScannerButton';
import DueDatePicker from '@/app/ui/dashboard/primitives/DueDatePicker';
import PatronCombobox, { type PatronOption } from '@/app/ui/dashboard/patronCombobox';
import TransactionReceipt from '@/app/ui/dashboard/primitives/TransactionReceipt';

interface CheckOutFormProps {
  books: Book[];
  defaultDueDate: string;
  preSelectedBookId?: string;
  /** When true, hides borrower fields and uses selfUserId/selfUserName as hidden inputs */
  selfCheckout?: boolean;
  selfUserId?: string;
  selfUserName?: string;
  /** bookId → active hold count (from fetchHoldsForBook). Used for pre-flight warnings. */
  holdCounts?: Record<string, number>;
  /** For self-checkout: the student's current active-loan count */
  selfActiveLoans?: number;
  /** For self-checkout: whether the student has any overdue loans */
  selfHasOverdue?: boolean;
  /** Hard cap for student-side self-checkout. Mirrors STUDENT_LOAN_LIMIT in actions.ts. */
  loanLimit?: number;
}

export default function CheckOutForm({
  books,
  defaultDueDate,
  preSelectedBookId,
  selfCheckout,
  selfUserId,
  selfUserName,
  holdCounts,
  selfActiveLoans = 0,
  selfHasOverdue = false,
  loanLimit = 5,
}: CheckOutFormProps) {
  const [state, formAction] = useActionState(checkoutBookAction, initialActionState);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [selectedBookId, setSelectedBookId] = useState<string>(preSelectedBookId ?? '');
  const [selectedCopyId, setSelectedCopyId] = useState<string>('');
  const [selectedCopyBarcode, setSelectedCopyBarcode] = useState<string | null>(null);
  const [lookupMessage, setLookupMessage] = useState<{
    tone: 'neutral' | 'success' | 'error';
    text: string;
  } | null>(null);
  const [bookOptions, setBookOptions] = useState(() => buildBookOptions(books));
  const [bookMap, setBookMap] = useState(() => createBookMap(books));
  const [pickedPatron, setPickedPatron] = useState<PatronOption | null>(null);
  const [override, setOverride] = useState(false);
  const [showReceipt, setShowReceipt] = useState<null | { title: string; dueAt: string }>(null);
  const handledStateRef = useRef<typeof state | null>(null);

  useEffect(() => {
    if (state.status === 'success' && handledStateRef.current !== state) {
      handledStateRef.current = state;
      const selected = selectedBookId ? bookMap.get(selectedBookId) : null;
      setShowReceipt({
        title: selected?.title ?? 'Book',
        dueAt: defaultDueDate,
      });
      formRef.current?.reset();
      setSelectedBookId('');
      setSelectedCopyId('');
      setSelectedCopyBarcode(null);
      setLookupMessage(null);
      setPickedPatron(null);
      setOverride(false);
    }
  }, [state, selectedBookId, bookMap, defaultDueDate]);

  useEffect(() => {
    setBookOptions((prev) => {
      const base = buildBookOptions(books);
      const extras = prev.filter((option) => !base.some((item) => item.id === option.id));
      return [...base, ...extras];
    });
    setBookMap((prev) => {
      const next = new Map(prev);
      books.forEach((book) => next.set(book.id, book));
      return next;
    });
  }, [books]);

  useEffect(() => {
    if (!selectedBookId) {
      setSelectedCopyId('');
      setSelectedCopyBarcode(null);
      return;
    }
    const book = bookMap.get(selectedBookId);
    if (!book) {
      setSelectedCopyId('');
      setSelectedCopyBarcode(null);
      return;
    }
    const copy = pickPreferredCopy(book);
    setSelectedCopyId(copy?.id ?? '');
    setSelectedCopyBarcode(copy?.barcode ?? null);
  }, [selectedBookId, bookMap]);

  const handleScanDetected = useCallback(
    async (code: string) => {
      if (!code) return;
      setLookupMessage({ tone: 'neutral', text: `Looking up ${code}\u2026` });
      try {
        const response = await fetch(`/api/books/lookup?code=${encodeURIComponent(code)}`, {
          cache: 'no-store',
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          const message = payload?.error ?? 'No available book matched that code.';
          setLookupMessage({ tone: 'error', text: message });
          return;
        }
        const payload = (await response.json()) as LookupResponse;
        const book = mapApiBookToBook(payload.book);
        const explicitCopy = payload.copy
          ? { id: payload.copy.id, barcode: payload.copy.barcode ?? null }
          : null;

        setBookOptions((prev) => {
          if (prev.some((option) => option.id === book.id)) return prev;
          return [...prev, buildBookOption(book)];
        });
        setBookMap((prev) => {
          const next = new Map(prev);
          next.set(book.id, book);
          return next;
        });

        const preferredCopy = explicitCopy ?? pickPreferredCopy(book);
        setSelectedBookId(book.id);
        setSelectedCopyId(preferredCopy?.id ?? '');
        setSelectedCopyBarcode(preferredCopy?.barcode ?? null);
        setLookupMessage({
          tone: 'success',
          text: preferredCopy?.barcode
            ? `Copy ${preferredCopy.barcode} of "${book.title}" is ready to loan.`
            : `Ready to borrow "${book.title}".`,
        });
      } catch (error) {
        console.error('Failed to lookup scanned book', error);
        setLookupMessage({
          tone: 'error',
          text: 'Unable to look up that code. Try again or search manually.',
        });
      }
    },
    [],
  );

  const selectedBook = selectedBookId ? bookMap.get(selectedBookId) : null;
  const holdOnBook = selectedBook ? (holdCounts?.[selectedBook.id] ?? 0) : 0;

  // Pre-flight evaluation
  const warnings = useMemo(() => {
    const list: { key: string; text: string; severity: 'block' | 'warn' }[] = [];

    if (selfCheckout) {
      if (selfActiveLoans >= loanLimit) {
        list.push({
          key: 'limit',
          text: `Loan limit reached (${selfActiveLoans}/${loanLimit}). Return a book before borrowing another.`,
          severity: 'block',
        });
      }
      if (selfHasOverdue) {
        list.push({
          key: 'overdue',
          text: 'You have an overdue book. Please return it before borrowing another.',
          severity: 'block',
        });
      }
      if (holdOnBook > 0) {
        list.push({
          key: 'hold-self',
          text: 'This title is reserved for another patron.',
          severity: 'block',
        });
      }
    } else {
      if (pickedPatron) {
        if (pickedPatron.activeLoans >= loanLimit) {
          list.push({
            key: 'limit',
            text: `${pickedPatron.displayName ?? 'Patron'} has reached the loan limit (${pickedPatron.activeLoans}/${loanLimit}).`,
            severity: 'block',
          });
        }
        if (pickedPatron.hasOverdue) {
          list.push({
            key: 'overdue',
            text: `${pickedPatron.displayName ?? 'Patron'} has an overdue book.`,
            severity: 'warn',
          });
        }
      }
      if (holdOnBook > 0) {
        list.push({
          key: 'hold-staff',
          text: `${holdOnBook} patron${holdOnBook === 1 ? '' : 's'} waiting on a hold for this title.`,
          severity: 'warn',
        });
      }
    }
    return list;
  }, [selfCheckout, selfActiveLoans, selfHasOverdue, holdOnBook, pickedPatron, loanLimit]);

  const hasHardBlock = warnings.some((w) => w.severity === 'block');
  const hasSoftWarn = warnings.some((w) => w.severity === 'warn');

  const confirmEnabled =
    !!selectedCopyId &&
    !hasHardBlock &&
    (selfCheckout || pickedPatron != null) &&
    (!hasSoftWarn || selfCheckout || override);

  // ---------- Receipt view (post-success) ----------
  if (showReceipt) {
    const dueLabel = showReceipt.dueAt
      ? new Date(showReceipt.dueAt).toLocaleDateString('en-MY', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : '';
    const secondary = selfCheckout
      ? [
          { label: 'View my loans', href: '/dashboard/my-books' },
        ]
      : [{ label: 'Back to desk', href: '/dashboard' }];
    return (
      <TransactionReceipt
        tone="borrow"
        title={showReceipt.title}
        subtitle={dueLabel ? `Due back by ${dueLabel}` : undefined}
        primaryLabel={selfCheckout ? 'Borrow another' : 'Process another'}
        onPrimaryClick={() => setShowReceipt(null)}
        secondary={secondary}
      />
    );
  }

  return (
    <section className="rounded-card border border-hairline dark:border-dark-hairline bg-surface-card dark:bg-dark-surface-card p-6">
      <div className="mb-4 space-y-1">
        <h2 className="font-display text-display-sm text-ink dark:text-on-dark">
          {selfCheckout ? 'Borrow a book' : 'Record a loan'}
        </h2>
        <p className="font-sans text-body-sm text-muted dark:text-on-dark-soft">
          Scan the copy barcode (or ISBN), then confirm the details.
        </p>
      </div>

      {/* Scan row */}
      <CameraScannerButton
        onDetected={(code) => {
          void handleScanDetected(code);
        }}
        modalDescription="Align the book barcode or ISBN within the frame."
        lastScanPrefix="Latest scan:"
        className="w-full"
      />

      {lookupMessage && (
        <p
          className={clsx(
            'mt-2 font-sans text-body-sm font-medium',
            lookupMessage.tone === 'success' && 'text-success',
            lookupMessage.tone === 'error' && 'text-primary dark:text-dark-primary',
            lookupMessage.tone === 'neutral' && 'text-muted dark:text-on-dark-soft',
          )}
        >
          {lookupMessage.text}
        </p>
      )}

      <form ref={formRef} action={formAction} className="mt-5 space-y-5">
        {/* Hidden contract with server action */}
        <input type="hidden" name="copyId" value={selectedCopyId} />
        <input type="hidden" name="itemIdentifier" value={selectedCopyBarcode ?? ''} />
        <input type="hidden" name="bookId" value={selectedBookId} />

        {/* Preview card for selected book */}
        {selectedBook && (
          <div className="rounded-card border border-hairline dark:border-dark-hairline bg-surface-cream-strong dark:bg-dark-surface-strong p-4">
            <p className="font-display text-title-lg font-semibold tracking-tight text-ink dark:text-on-dark">
              {selectedBook.title}
            </p>
            {selectedBook.author && (
              <p className="mt-0.5 font-display text-body-sm italic text-muted dark:text-on-dark-soft">
                by {selectedBook.author}
              </p>
            )}
            <dl className="mt-3 grid gap-x-6 gap-y-1 font-mono text-code sm:grid-cols-2">
              <div>
                <dt className="font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">Availability</dt>
                <dd className="text-ink dark:text-on-dark">
                  {selectedBook.availableCopies} of {selectedBook.totalCopies} copies available
                </dd>
              </div>
              {selectedCopyBarcode && (
                <div>
                  <dt className="font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">Selected copy</dt>
                  <dd className="text-ink dark:text-on-dark">{selectedCopyBarcode}</dd>
                </div>
              )}
              {selectedBook.isbn && (
                <div>
                  <dt className="font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">ISBN</dt>
                  <dd className="text-ink dark:text-on-dark">{selectedBook.isbn}</dd>
                </div>
              )}
              {selectedBook.classification && (
                <div>
                  <dt className="font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">Call number</dt>
                  <dd className="text-ink dark:text-on-dark">{selectedBook.classification}</dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {/* Borrower zone */}
        {selfCheckout ? (
          <>
            <input type="hidden" name="borrowerIdentifier" value={selfUserId ?? ''} />
            <input type="hidden" name="borrowerName" value={selfUserName ?? ''} />
            <input type="hidden" name="dueDate" value={defaultDueDate} />
            <div className="flex items-center gap-3 rounded-card border border-hairline dark:border-dark-hairline bg-surface-cream-strong dark:bg-dark-surface-strong px-4 py-3">
              <div className="min-w-0">
                <p className="font-sans text-caption-uppercase font-semibold text-muted dark:text-on-dark-soft">
                  Borrowing as
                </p>
                <p className="font-sans text-body-md font-semibold text-ink dark:text-on-dark">
                  {selfUserName ?? 'You'}
                </p>
              </div>
              <span className="ml-auto rounded-pill bg-surface-card dark:bg-dark-surface-card px-2.5 py-1 font-mono text-code text-muted dark:text-on-dark-soft">
                14-day loan
              </span>
            </div>
          </>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <PatronCombobox onSelect={setPickedPatron} />
            <div>
              <label className="mb-1.5 block font-sans text-caption-uppercase font-semibold text-muted dark:text-on-dark-soft">
                Due date
              </label>
              <DueDatePicker defaultDate={defaultDueDate} />
            </div>
          </div>
        )}

        {/* Warning strip */}
        {warnings.length > 0 && (
          <ul className="space-y-1.5">
            {warnings.map((w) => {
              const isBlock = w.severity === 'block';
              const Icon = isBlock ? ExclamationTriangleIcon : InformationCircleIcon;
              return (
                <li
                  key={w.key}
                  className={clsx(
                    'flex items-start gap-2 rounded-btn border px-3 py-2 font-sans text-body-sm',
                    isBlock
                      ? 'border-primary/40 bg-primary/10 text-primary dark:border-dark-primary/40 dark:bg-dark-primary/15 dark:text-dark-primary'
                      : 'border-warning/40 bg-warning/10 text-warning',
                  )}
                >
                  <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span className="flex-1">{w.text}</span>
                </li>
              );
            })}
          </ul>
        )}

        {/* Staff override — only when a soft warn is present and no hard block */}
        {!selfCheckout && hasSoftWarn && !hasHardBlock && (
          <label className="flex items-start gap-2 rounded-btn border border-dashed border-hairline dark:border-dark-hairline px-3 py-2 font-sans text-body-sm text-muted dark:text-on-dark-soft">
            <input
              type="checkbox"
              name="override"
              checked={override}
              onChange={(e) => setOverride(e.target.checked)}
              className="mt-0.5"
            />
            <span>Override warnings and proceed — I&apos;ve confirmed with the patron.</span>
          </label>
        )}

        {state.status === 'error' && state.message && (
          <p className="font-sans text-body-sm font-semibold text-primary dark:text-dark-primary">{state.message}</p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <SubmitButton
            disabled={!confirmEnabled}
            label={selfCheckout ? 'Confirm loan' : 'Confirm loan'}
          />
        </div>
      </form>
    </section>
  );
}

function SubmitButton({ disabled, label }: { disabled: boolean; label: string }) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;
  return (
    <button
      type="submit"
      disabled={isDisabled}
      aria-disabled={isDisabled}
      className="inline-flex items-center justify-center rounded-btn bg-primary hover:bg-primary-active px-5 h-10 font-sans text-button text-on-primary transition disabled:bg-primary-disabled disabled:text-muted disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-dark-canvas"
    >
      {pending ? 'Processing\u2026' : label}
    </button>
  );
}

// ---------- helpers (unchanged contract) ----------

type LookupResponse = {
  book: ApiBook;
  copy?: { id: string; barcode: string | null };
};

type ApiBookCopy = {
  id: string;
  book_id: string;
  barcode: string | null;
  status: string | null;
  loans?: Array<{ id: string; returned_at: string | null }> | null;
};

type ApiBook = {
  id: string;
  title: string;
  author: string | null;
  isbn: string | null;
  classification: string | null;
  publisher: string | null;
  publication_year: string | null;
  cover_image_url: string | null;
  available_copies?: number | null;
  total_copies?: number | null;
  category?: string | null;
  copies: ApiBookCopy[] | null;
};

const normalizeCopyStatus = (
  value: string | null | undefined,
): Book['copies'][number]['status'] => {
  if (typeof value !== 'string') return 'available';
  switch (value.trim().toLowerCase()) {
    case 'on_loan':
      return 'on_loan';
    case 'lost':
      return 'lost';
    case 'damaged':
      return 'damaged';
    case 'processing':
      return 'processing';
    case 'hold_shelf':
      return 'hold_shelf';
    default:
      return 'available';
  }
};

const isCopyAvailable = (copy: Book['copies'][number]): boolean => {
  if (copy.status !== 'available') return false;
  return !(copy.loans ?? []).some((loan) => loan.returnedAt == null);
};

const pickPreferredCopy = (book: Book) => {
  const copy = book.copies.find((candidate) => isCopyAvailable(candidate));
  if (!copy) return null;
  return { id: copy.id, barcode: copy.barcode || null };
};

const mapApiBookToBook = (apiBook: ApiBook): Book => {
  const copies =
    apiBook.copies?.map((copy) => ({
      id: copy.id,
      bookId: copy.book_id,
      barcode: copy.barcode ?? '',
      status: normalizeCopyStatus(copy.status),
      loans: (copy.loans ?? []).map((loan) => ({
        id: loan.id,
        returnedAt: loan.returned_at ?? null,
      })),
    })) ?? [];

  const availableCopies =
    typeof apiBook.available_copies === 'number'
      ? apiBook.available_copies
      : copies.filter((copy) => isCopyAvailable(copy)).length;
  const totalCopies =
    typeof apiBook.total_copies === 'number' ? apiBook.total_copies : copies.length;

  return {
    id: apiBook.id,
    title: apiBook.title,
    author: apiBook.author ?? null,
    isbn: apiBook.isbn ?? null,
    classification: apiBook.classification ?? null,
    coverImageUrl: apiBook.cover_image_url ?? null,
    publisher: apiBook.publisher ?? null,
    publicationYear: apiBook.publication_year ?? null,
    tags: [],
    category: apiBook.category ?? null,
    copies,
    totalCopies,
    availableCopies,
    createdAt: null,
    updatedAt: null,
  };
};

type BookOption = { id: string; label: string };

const buildBookOption = (book: Book): BookOption => ({
  id: book.id,
  label: `${book.title}${book.author ? ` \u2014 ${book.author}` : ''}`,
});

const buildBookOptions = (bookList: Book[]): BookOption[] => bookList.map(buildBookOption);

const createBookMap = (bookList: Book[]) => {
  const map = new Map<string, Book>();
  bookList.forEach((book) => map.set(book.id, book));
  return map;
};
