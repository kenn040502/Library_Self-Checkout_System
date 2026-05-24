'use server';

import { checkOut as sipCheckOut, checkIn as sipCheckIn } from '@/lib/sip2';
import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { auth } from '@/auth';
import { getSupabaseServerClient } from '@/app/lib/supabase/server';
import type { CopyStatus } from '@/app/lib/supabase/types';
import type { ActionState } from '@/app/dashboard/actionState';
import { createNotification, createUserNotification } from '@/app/lib/supabase/notifications';
import {
  countActiveLoansForPatron,
  countOverdueLoansForPatron,
  fetchHoldsForBook,
  insertDamageReport,
  promoteNextHoldForBook,
  type DamageSeverity,
} from '@/app/lib/supabase/queries';
import {
  STUDENT_LOAN_LIMIT,
  MAX_LOAN_DAYS,
  DAMAGE_NOTES_MAX,
  DAMAGE_PHOTOS_MAX,
} from '@/app/dashboard/loanPolicy';

const SIP2_INSTITUTION_ID = process.env.SIP2_INSTITUTION_ID ?? 'LIB001';
const SIP2_TERMINAL_PASSWORD = process.env.SIP2_TERMINAL_PASSWORD ?? '';
const SIP2_PATRON_PASSWORD = process.env.SIP2_PATRON_PASSWORD ?? '';

const pad = (n: number) => n.toString().padStart(2, '0');

/**
 * SIP2 expects: YYYYMMDDZZZZHHMMSS
 * - YYYY: year
 * - MM: month
 * - DD: day
 * - ZZZZ: time zone offset in HHMM (we just send "0000" for simplicity)
 * - HHMMSS: time
 *
 * Example: 202501180000080000 = 2025-01-18 08:00:00 with "0000" TZ.
 */
const formatSipDate = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());

  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  const ss = pad(date.getSeconds());

  // SIP2 timezone offset must be HHMM only (no + sign)
  const offsetMinutes = -date.getTimezoneOffset();
  const abs = Math.abs(offsetMinutes);

  const offHH = pad(Math.floor(abs / 60));
  const offMM = pad(abs % 60);

  const zzzz = `${offHH}${offMM}`;

  return `${yyyy}${mm}${dd}${zzzz}${hh}${min}${ss}`;
};


const success = (message: string): ActionState => ({ status: 'success', message });
const failure = (message: string): ActionState => ({ status: 'error', message });

type AuditAction = 'create' | 'update' | 'delete';

const getCurrentUserId = async (): Promise<string | null> => {
  try {
    const session = await auth();
    const user = session?.user as { id?: string } | null;
    return user?.id ?? null;
  } catch (error) {
    console.error('Failed to read authenticated user for audit metadata', error);
    return null;
  }
};

const logAuditEvent = async (
  supabase: SupabaseClient,
  {
    table,
    recordId,
    action,
    payload,
    performedBy,
  }: {
    table: string;
    recordId: string;
    action: AuditAction;
    payload?: Record<string, unknown>;
    performedBy?: string | null;
  },
) => {
  try {
    await supabase.from('audit_log').insert({
      event_type: action,
      entity: table,
      entity_id: recordId,
      actor_id: performedBy ?? null,
      actor_role: null,
      source: 'ui',
      success: true,
      diff: payload ?? null,
      context: null,
    });
  } catch (error) {
    console.error('Audit log insert failed', error);
  }
};

type AvailableCopy = {
  id: string;
  bookId: string;
  barcode: string | null;
};

const normalizeCopyStatus = (value: string | null | undefined) => {
  if (typeof value !== 'string') return 'available';
  switch (value.trim().toUpperCase()) {
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
    case 'available':
    default:
      return 'available';
  }
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isUuid = (value: string) => UUID_REGEX.test(value);

const isEmail = (value: string) => value.includes('@');

type BorrowerRecord = {
  id: string;
  email: string | null;
  role: string | null;
  profile: {
    display_name: string | null;
    student_id: string | null;
  } | null;
};

const fetchUserWithProfile = async (supabase: SupabaseClient, filters: Record<string, string>) => {
  const query = supabase
    .from('Users')
    .select(
      `
        id,
        email,
        role,
        profile:UserProfile(
          display_name,
          student_id
        )
      `,
    )
    .limit(1);

  Object.entries(filters).forEach(([column, value]) => {
    query.eq(column, value);
  });

  const { data, error } = await query.maybeSingle<BorrowerRecord>();
  if (error || !data) {
    return null;
  }
  return data;
};

const loadBorrowerByIdentifier = async (
  supabase: SupabaseClient,
  rawIdentifier: string,
): Promise<BorrowerRecord | null> => {
  const identifier = rawIdentifier.trim();
  if (!identifier) return null;

  if (isUuid(identifier)) {
    const user = await fetchUserWithProfile(supabase, { id: identifier });
    if (user) return user;
  }

  if (isEmail(identifier)) {
    const user = await fetchUserWithProfile(supabase, { email: identifier.toLowerCase() });
    if (user) return user;
  }

  const { data: studentMatch } = await supabase
    .from('UserProfile')
    .select('user_id')
    .eq('student_id', identifier)
    .maybeSingle<{ user_id: string }>();

  if (studentMatch?.user_id) {
    const user = await fetchUserWithProfile(supabase, { id: studentMatch.user_id });
    if (user) return user;
  }

  const { data: usernameMatch } = await supabase
    .from('UserProfile')
    .select('user_id')
    .eq('username', identifier)
    .maybeSingle<{ user_id: string }>();

  if (usernameMatch?.user_id) {
    const user = await fetchUserWithProfile(supabase, { id: usernameMatch.user_id });
    if (user) return user;
  }

  return null;
};

const upsertProfileFields = async (
  supabase: SupabaseClient,
  userId: string,
  updates: { display_name?: string | null; student_id?: string | null },
) => {
  const payload: Record<string, string | null> = { user_id: userId };
  if (typeof updates.display_name === 'string') {
    payload.display_name = updates.display_name;
  }
  if (typeof updates.student_id === 'string') {
    payload.student_id = updates.student_id;
  }

  if (Object.keys(payload).length > 1) {
    await supabase.from('UserProfile').upsert(payload, { onConflict: 'user_id' });
  }
};

const activeLoanSelect = `
  id,
  copy_id,
  user_id,
  borrowed_at,
  due_at,
  returned_at,
  handled_by,
  copy:Copies(
    id,
    book_id,
    barcode
  ),
  borrower:Users!Loans_user_id_fkey(
    id,
    email,
    profile:UserProfile(
      display_name,
      student_id
    )
  )
`;

type ActiveLoanRow = {
  id: string;
  copy_id: string;
  user_id: string | null;
  borrowed_at: string;
  due_at: string;
  returned_at: string | null;
  handled_by: string | null;
  copy: { id: string; book_id: string | null; barcode: string | null } | null;
  borrower?: {
    id: string;
    email: string | null;
    profile?: {
      display_name: string | null;
      student_id: string | null;
    } | null;
  } | null;
};

const findAvailableCopyForBook = async (
  supabase: SupabaseClient,
  bookId: string,
): Promise<AvailableCopy | null> => {
  const { data, error } = await supabase
    .from('Copies')
    .select(
      `
        id,
        book_id,
        barcode,
        status,
        loans:Loans(
          id,
          returned_at
        )
      `,
    )
    .eq('book_id', bookId);

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    return null;
  }

  const candidate = data.find((copy) => {
    const status = normalizeCopyStatus(copy.status);
    if (status !== 'available') return false;
    const hasActiveLoan = Array.isArray(copy.loans)
      ? copy.loans.some((loan) => loan.returned_at == null)
      : false;
    return !hasActiveLoan;
  });

  if (!candidate) return null;

  return {
    id: candidate.id,
    bookId: candidate.book_id,
    barcode: candidate.barcode ?? null,
  };
};

export async function checkoutBookAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const bookId = formData.get('bookId')?.toString();
  const copyId = formData.get('copyId')?.toString();
  const borrowerIdentifier = formData.get('borrowerIdentifier')?.toString().trim();
  const borrowerName = formData.get('borrowerName')?.toString().trim() || null;
  const dueDateInput = formData.get('dueDate')?.toString();

  // from CheckOutForm hidden field (barcode if available)
  const itemIdentifierFromForm =
    formData.get('itemIdentifier')?.toString().trim() || null;

  if (!bookId) return failure('Select a book to borrow.');
  if (!borrowerIdentifier) return failure('Borrower ID is required.');
  if (!dueDateInput) return failure('Provide a due date.');

  const dueDate = new Date(dueDateInput);
  if (Number.isNaN(dueDate.valueOf())) {
    return failure('Due date is invalid.');
  }

  // Server-side due-date bounds: strictly in the future, within MAX_LOAN_DAYS.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const earliest = new Date(today.getTime() + 86_400_000); // today + 1 day
  const latest = new Date(today.getTime() + MAX_LOAN_DAYS * 86_400_000);
  if (dueDate < earliest) {
    return failure('Due date must be in the future.');
  }
  if (dueDate > latest) {
    return failure(`Due date cannot be more than ${MAX_LOAN_DAYS} days away.`);
  }

  const supabase = getSupabaseServerClient();
  const handlerId = await getCurrentUserId();
  const borrowedAt = new Date();
  const borrowedAtIso = borrowedAt.toISOString();
  const dueAt = dueDate.toISOString();

  const borrower = await loadBorrowerByIdentifier(supabase, borrowerIdentifier);
  if (!borrower) {
    return failure('No patron matches that ID or email.');
  }

  // ---------- Pre-flight: loan-limit + overdue + hold-respect ----------
  // Staff-assisted borrows can pass `override=on` to soft-bypass warn-level
  // checks (overdue, hold queue). Hard blocks (loan-limit) always apply.
  const isStaffAssist = handlerId != null && handlerId !== borrower.id;
  const override = formData.get('override')?.toString() === 'on';

  const [activeLoanCount, overdueCount, holdCount] = await Promise.all([
    countActiveLoansForPatron(borrower.id),
    countOverdueLoansForPatron(borrower.id),
    fetchHoldsForBook(bookId),
  ]);

  const isStudentPatron = !borrower.role || borrower.role === 'user';
  if (isStudentPatron && activeLoanCount >= STUDENT_LOAN_LIMIT) {
    return failure(
      `Loan limit reached (${activeLoanCount}/${STUDENT_LOAN_LIMIT}). Return a book before borrowing another.`,
    );
  }

  if (overdueCount > 0 && !(isStaffAssist && override)) {
    return failure(
      `Patron has ${overdueCount} overdue book${overdueCount === 1 ? '' : 's'}. Return before borrowing.`,
    );
  }

  if (holdCount > 0 && !(isStaffAssist && override)) {
    return failure(
      'This title has holds queued. Fulfil the hold queue before a fresh checkout.',
    );
  }

  let copy: AvailableCopy | null = null;

  if (copyId) {
    const { data: copyRow, error: copyError } = await supabase
      .from('Copies')
      .select(
        `
          id,
          book_id,
          barcode,
          status,
          loans:Loans(
            id,
            returned_at
          )
        `,
      )
      .eq('id', copyId)
      .maybeSingle<{
        id: string;
        book_id: string;
        barcode: string | null;
        status: string | null;
        loans: Array<{ returned_at: string | null }> | null;
      }>();

    if (copyError) {
      console.error('Failed to lookup selected copy', copyError);
      return failure('Unable to verify the selected copy.');
    }

    if (!copyRow) {
      return failure('The selected copy could not be found.');
    }

    if (copyRow.book_id !== bookId) {
      return failure('Selected copy does not belong to the chosen book.');
    }

    const status = normalizeCopyStatus(copyRow.status);
    const hasActiveLoan = Array.isArray(copyRow.loans)
      ? copyRow.loans.some((loan) => loan.returned_at == null)
      : false;

    if (status !== 'available' || hasActiveLoan) {
      return failure('That copy is not currently available.');
    }

    copy = {
      id: copyRow.id,
      bookId: copyRow.book_id,
      barcode: copyRow.barcode ?? null,
    };
  } else {
    try {
      copy = await findAvailableCopyForBook(supabase, bookId);
    } catch (error) {
      console.error('Failed to lookup copies for book', error);
      return failure('Unable to check availability for the selected book.');
    }

    if (!copy) {
      return failure('No available copies for this title.');
    }
  }

  // ---------- Supabase: record loan ----------
  const { data: loanRow, error: insertLoanError } = await supabase
    .from('Loans')
    .insert({
      copy_id: copy.id,
      user_id: borrower.id,
      borrowed_at: borrowedAtIso,
      due_at: dueAt,
      handled_by: handlerId,
    })
    .select('id')
    .single();

  if (insertLoanError) {
    console.error('Failed to record borrow transaction', insertLoanError);
    return failure('Unable to complete borrow request. Try again.');
  }

  const loanId = loanRow?.id;

  const { error: copyUpdateError } = await supabase
    .from('Copies')
    .update({
      status: 'on_loan',
    })
    .eq('id', copy.id);

  if (copyUpdateError) {
    console.error('Failed to update copy status after borrowing', copyUpdateError);
    if (loanId) {
      await supabase.from('Loans').delete().eq('id', loanId);
    }
    return failure('Loan cancelled because the copy status could not be updated.');
  }

  // ---------- Optional: keep patron profile nice ----------
  if (borrowerName || (!isEmail(borrowerIdentifier) && !isUuid(borrowerIdentifier))) {
    const profileUpdates: { display_name?: string | null; student_id?: string | null } = {};
    if (!borrower.profile?.display_name && borrowerName) {
      profileUpdates.display_name = borrowerName;
    }
    if (
      !borrower.profile?.student_id &&
      !isEmail(borrowerIdentifier) &&
      !isUuid(borrowerIdentifier)
    ) {
      profileUpdates.student_id = borrowerIdentifier;
    }
    if (Object.keys(profileUpdates).length > 0) {
      await upsertProfileFields(supabase, borrower.id, profileUpdates);
    }
  }

  if (loanId) {
    await logAuditEvent(supabase, {
      table: 'Loans',
      recordId: loanId,
      action: 'create',
      performedBy: handlerId,
      payload: {
        copy_id: copy.id,
        user_id: borrower.id,
        due_at: dueAt,
        borrowed_at: borrowedAtIso,
      },
    });
  }

  // ---------- Notification ----------
  ;(async () => {
    const { data: bookRow } = await supabase
      .from('Books')
      .select('title')
      .eq('id', bookId)
      .maybeSingle<{ title: string }>();
    const bookTitle = bookRow?.title ?? bookId;
    const patron = borrowerName ?? borrower.profile?.display_name ?? borrower.email ?? borrowerIdentifier;

    // Staff/admin broadcast
    await createNotification(
      'checkout',
      'Book Borrowed',
      `"${bookTitle}" was checked out by ${patron}.`,
      { bookTitle, barcode: copy.barcode ?? '', patronIdentifier: borrowerIdentifier, patronName: patron },
    );

    // User confirmation — notify the borrower directly (skip staff/admin/librarian)
    const isPrivilegedRole = borrower.role === 'admin' || borrower.role === 'staff' || borrower.role === 'librarian';
    if (!isPrivilegedRole) {
      await createUserNotification(
        borrower.id,
        'loan_confirmed',
        'Loan confirmed',
        `You have successfully borrowed "${bookTitle}". Due back by ${new Date(dueAt).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}.`,
        { bookTitle, barcode: copy.barcode ?? '', dueAt, loanId: loanId ?? '' },
      );
    }
  })().catch((err) => console.warn('[notifications] checkout notification failed:', err));

  // ---------- SIP2: send checkOut to kiosk emulator ----------
  const itemIdentifier =
    itemIdentifierFromForm || copy.barcode || copy.id; // fallback chain

  try {
    const sipResult = await sipCheckOut({
      scRenewalPolicy: 'Y',
      noBlock: 'N',
      transactionDate: formatSipDate(borrowedAt),
      nbDueDate: formatSipDate(dueDate),
      institutionId: SIP2_INSTITUTION_ID,
      patronIdentifier: borrowerIdentifier,
      itemIdentifier,
      terminalPassword: SIP2_TERMINAL_PASSWORD,
      itemProperties: '',
      patronPassword: SIP2_PATRON_PASSWORD,
      feeAcknowledged: 'Y',
      cancel: 'N',
    }) as { status?: number };

    if (sipResult?.status !== 1) {
      console.warn('[SIP2] Checkout returned non-OK status', sipResult);
    }
  } catch (error) {
    console.error('SIP2 checkout failed', error);
    // Supabase is source of truth; SIP failure is logged only.
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/book/checkout');
  revalidatePath('/dashboard/book/items');

  const borrowerLabel =
    borrowerName ?? borrower.profile?.display_name ?? borrower.email ?? 'borrower';
  return success(`Loan recorded for ${borrowerLabel}.`);
}


const parseSeverity = (value: string | null | undefined): DamageSeverity | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'damaged' || normalized === 'lost' || normalized === 'needs_inspection') {
    return normalized;
  }
  return null;
};

export async function checkinBookAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const loanId = formData.get('loanId')?.toString();
  const identifierRaw = formData.get('identifier')?.toString().trim();

  // Damage / condition payload (optional)
  const copyStatusInput = formData.get('copyStatus')?.toString() ?? 'available';
  const conditionNotesRaw = formData.get('conditionNotes')?.toString() ?? '';
  const damagePhotoUrlsRaw = formData.get('damagePhotoUrls')?.toString() ?? '[]';

  if (!loanId && !identifierRaw) {
    return failure('Provide a loan reference, borrower ID, or copy barcode.');
  }

  const isDamaged = copyStatusInput.trim().toLowerCase() !== 'available';
  const severity = isDamaged ? parseSeverity(copyStatusInput) : null;
  if (isDamaged && !severity) {
    return failure('Invalid copy condition.');
  }
  const conditionNotes = conditionNotesRaw.slice(0, DAMAGE_NOTES_MAX).trim();
  let damagePhotoUrls: string[] = [];
  if (isDamaged) {
    try {
      const parsed = JSON.parse(damagePhotoUrlsRaw);
      if (Array.isArray(parsed)) {
        damagePhotoUrls = parsed
          .filter((v): v is string => typeof v === 'string' && v.length > 0)
          .slice(0, DAMAGE_PHOTOS_MAX);
      }
    } catch {
      damagePhotoUrls = [];
    }
  }
  // 'needs_inspection' is a damage severity, not a CopyStatus enum value. Flag
  // the copy as 'processing' (off-shelf for review); the precise severity is
  // still recorded separately on the DamageReport row.
  const copyStatusFinal: CopyStatus =
    severity === 'needs_inspection'
      ? 'processing'
      : severity ?? 'available';

  const supabase = getSupabaseServerClient();
  const handlerId = await getCurrentUserId();
  const now = new Date();
  const nowIso = now.toISOString();

  let loan: ActiveLoanRow | null = null;

  if (loanId) {
    const { data, error } = await supabase
      .from('Loans')
      .select(activeLoanSelect)
      .eq('id', loanId)
      .is('returned_at', null)
      .maybeSingle();

    if (error) {
      console.error('Loan lookup by id failed', error);
      return failure('Unable to locate that loan.');
    }

    if (data) {
      loan = (data as unknown) as ActiveLoanRow;
    } else {
      return failure('No active loan matches that reference.');
    }
  }

  const identifier = identifierRaw ?? '';

  if (!loan && identifier) {
    const { data: copyMatch, error: copyError } = await supabase
      .from('Copies')
      .select('id, book_id, barcode')
      .eq('barcode', identifier)
      .maybeSingle<{ id: string; book_id: string | null; barcode: string | null }>();

    if (copyError) {
      console.error('Copy lookup failed', copyError);
      return failure('Unable to locate a copy with that barcode.');
    }

    if (copyMatch) {
      const { data, error } = await supabase
        .from('Loans')
        .select(activeLoanSelect)
        .eq('copy_id', copyMatch.id)
        .is('returned_at', null)
        .maybeSingle();

      if (error) {
        console.error('Loan lookup by copy failed', error);
        return failure('Unable to locate an active loan for that copy.');
      }

      if (data) {
        loan = (data as unknown) as ActiveLoanRow;
      }
    }
  }

  if (!loan && identifier) {
    const borrower = await loadBorrowerByIdentifier(supabase, identifier);
    if (borrower) {
      const { data, error } = await supabase
        .from('Loans')
        .select(activeLoanSelect)
        .eq('user_id', borrower.id)
        .is('returned_at', null)
        .order('borrowed_at', { ascending: true })
        .limit(2);

      if (error) {
        console.error('Loan lookup by borrower failed', error);
        return failure('Unable to locate active loans for that borrower.');
      }

      const rows = ((data ?? []) as unknown) as ActiveLoanRow[];

      if (rows.length === 0) {
        return failure('That borrower has no active loans.');
      }

      if (rows.length > 1) {
        return failure(
          'Multiple active loans found. Scan the barcode or enter the specific loan ID.',
        );
      }

      loan = rows[0] ?? null;
    }
  }

  if (!loan) {
    return failure('No active loan matched the provided reference.');
  }

  // ---------- Supabase updates ----------
  const loanUpdatePayload: Record<string, unknown> = {
    returned_at: nowIso,
  };

  if (handlerId) {
    loanUpdatePayload.handled_by = handlerId;
  }

  const { error: loanUpdateError } = await supabase
    .from('Loans')
    .update(loanUpdatePayload)
    .eq('id', loan.id);

  if (loanUpdateError) {
    console.error('Failed to mark loan as returned', loanUpdateError);
    return failure('Unable to update loan status.');
  }

  const { error: copyUpdateError } = await supabase
    .from('Copies')
    .update({ status: copyStatusFinal })
    .eq('id', loan.copy_id);

  if (copyUpdateError) {
    console.error('Failed to update copy during return processing', copyUpdateError);
    await supabase
      .from('Loans')
      .update({ returned_at: null, handled_by: loan.handled_by ?? null })
      .eq('id', loan.id);
    return failure('Copy status update failed; the loan remains active.');
  }

  // Persist the damage report row (if any)
  if (severity) {
    try {
      await insertDamageReport({
        loanId: loan.id,
        copyId: loan.copy_id,
        reportedBy: handlerId,
        severity,
        notes: conditionNotes || null,
        photoUrls: damagePhotoUrls,
      });
    } catch (error) {
      console.error('Failed to persist damage report', error);
      // Non-fatal — the return succeeded, the copy is in the right state.
      // The photos are still in storage and can be reconciled manually.
    }
  }

  await logAuditEvent(supabase, {
    table: 'Loans',
    recordId: loan.id,
    action: 'update',
    performedBy: handlerId,
    payload: {
      returned_at: nowIso,
      copy_status: copyStatusFinal,
      ...(severity
        ? { damage: { severity, photos: damagePhotoUrls.length } }
        : {}),
    },
  });

  // Hold auto-promotion: only when the copy is genuinely back on the shelf.
  let promotion: Awaited<ReturnType<typeof promoteNextHoldForBook>> = null;
  if (copyStatusFinal === 'available' && loan.copy?.book_id) {
    try {
      promotion = await promoteNextHoldForBook(loan.copy.book_id);
    } catch (error) {
      console.error('Hold promotion failed', error);
    }
  }

  // ---------- Notifications ----------
  ;(async () => {
    const bookId = loan.copy?.book_id;
    let bookTitle = loan.copy?.barcode ?? 'Unknown book';
    if (bookId) {
      const { data: bookRow } = await supabase
        .from('Books')
        .select('title')
        .eq('id', bookId)
        .maybeSingle<{ title: string }>();
      bookTitle = bookRow?.title ?? bookTitle;
    }
    const patronName = loan.borrower?.profile?.display_name ?? loan.borrower?.email ?? '';
    const patronIdentifier = loan.borrower?.profile?.student_id ?? loan.borrower?.email ?? '';

    // Staff broadcast
    await createNotification(
      'checkin',
      'Book Returned',
      `"${bookTitle}" has been returned.`,
      {
        bookTitle,
        barcode: loan.copy?.barcode ?? '',
        patronName,
        patronIdentifier,
        copyStatus: copyStatusFinal,
      },
    );

    // Borrower confirmation (only for regular patrons, not when staff returned their own)
    if (loan.user_id) {
      const isPrivilegedBorrower =
        loan.borrower && ['admin', 'staff', 'librarian'].includes(loan.borrower.email ? '' : '');
      if (!isPrivilegedBorrower) {
        await createUserNotification(
          loan.user_id,
          'checkin',
          'Return confirmed',
          `Your return of "${bookTitle}" has been recorded.`,
          { bookTitle, barcode: loan.copy?.barcode ?? '', loanId: loan.id },
        );
      }
    }

    // Promoted hold → notify that patron
    if (promotion) {
      await createUserNotification(
        promotion.patronId,
        'hold_ready',
        'Your hold is ready for pickup',
        `"${bookTitle}" is ready. Collect it by ${new Date(promotion.expiresAt).toLocaleDateString('en-MY', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}.`,
        { bookTitle, barcode: loan.copy?.barcode ?? '', holdId: promotion.promotedHoldId, expiresAt: promotion.expiresAt },
      );
    }
  })().catch((err) => console.warn('[notifications] checkin notification failed:', err));

  // ---------- SIP2 check-in ----------
  const itemIdentifier =
    identifier || loan.copy?.barcode || loan.copy_id.toString();

  try {
    const sipResult = await sipCheckIn({
      noBlock: 'N',
      transactionDate: formatSipDate(now),
      returnDate: formatSipDate(now),
      currentLocation: 'Main Library',
      institutionId: SIP2_INSTITUTION_ID,
      itemIdentifier,
      terminalPassword: SIP2_TERMINAL_PASSWORD,
      itemProperties: '',
      cancel: 'N',
    }) as { status?: number };

    if (sipResult?.status !== 1) {
      console.warn('[SIP2] Checkin returned non-OK status', sipResult);
    }
  } catch (error) {
    console.error('SIP2 check-in failed', error);
    // Supabase is source of truth; SIP failure is logged only.
  }

  const borrowerLabel =
    loan.borrower?.profile?.display_name ?? loan.borrower?.email ?? 'borrower';
  const copyLabel = loan.copy?.barcode ? `copy ${loan.copy.barcode}` : 'the item';

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/book/checkin');
  revalidatePath('/dashboard/book/checkout');
  revalidatePath('/dashboard/book/items');
  revalidatePath('/dashboard/book/holds');

  const conditionSuffix = severity ? ` (flagged ${severity.replace('_', ' ')})` : '';
  return success(`Marked ${copyLabel} as returned for ${borrowerLabel}${conditionSuffix}.`);
}


export async function updateBookAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const bookId = formData.get('bookId')?.toString();
  const title = formData.get('title')?.toString().trim();
  const author = formData.get('author')?.toString().trim();
  const isbn = formData.get('isbn')?.toString().trim() || null;
  const classificationRaw = formData.get('classification')?.toString();
  const publisherRaw = formData.get('publisher')?.toString();
  const publicationYearRaw = formData.get('publicationYear')?.toString();
  const coverImageUrl = formData.get('coverImageUrl')?.toString().trim() || null;

  if (!bookId) return failure('Book reference is missing.');
  if (!title) return failure('Book title is required.');
  if (!author) return failure('Book author is required.');

  const supabase = getSupabaseServerClient();

  const updatePayload: Record<string, unknown> = {
    title,
    author,
    isbn,
    classification: classificationRaw?.trim() || null,
    publisher: publisherRaw?.trim() || null,
    publication_year: publicationYearRaw?.trim() || null,
    cover_image_url: coverImageUrl,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('Books').update(updatePayload).eq('id', bookId);

  if (error) {
    console.error('Failed to update book record', error);
    return failure('Unable to update book details. Try again.');
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/book/items');
  revalidatePath('/dashboard/book/checkout');
  revalidatePath('/dashboard/book/list');

  return success('Book details updated.');
}

export async function deleteBookAction(bookId: string): Promise<ActionState> {
  const supabase = getSupabaseServerClient();

  try {
    const { error: copyError } = await supabase.from('Copies').delete().eq('book_id', bookId);
    if (copyError) {
      throw new Error(copyError.message);
    }

    const { error } = await supabase.from('Books').delete().eq('id', bookId);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/book/items');
    revalidatePath('/dashboard/book/list');

    return success('Book deleted successfully.');
  } catch (error: any) {
    console.error('Failed to delete book', error);
    return failure(`Failed to delete book: ${error.message ?? 'Unknown error'}`);
  }
}

const parseCopyBarcodes = (raw: string | null | undefined, fallback: string | null) => {
  const inputs: string[] = [];

  if (raw) {
    raw
      .split(/\r?\n|,/)
      .map((code) => code.trim())
      .filter(Boolean)
      .forEach((code) => inputs.push(code));
  }

  if (fallback) {
    inputs.push(fallback);
  }

  const unique = Array.from(new Set(inputs.map((code) => code.trim()))).filter(Boolean);
  return unique;
};

export async function renewLoanAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const loanId = formData.get('loanId')?.toString();
  if (!loanId) return failure('Loan ID is required.');

  const supabase = getSupabaseServerClient();

  const { data: loan, error: fetchError } = await supabase
    .from('Loans')
    .select('id, due_at, renewed_count, returned_at')
    .eq('id', loanId)
    .is('returned_at', null)
    .maybeSingle<{ id: string; due_at: string; renewed_count: number | null; returned_at: string | null }>();

  if (fetchError || !loan) return failure('Active loan not found.');

  const renewedCount = loan.renewed_count ?? 0;
  if (renewedCount >= 2) return failure('Maximum renewals reached (2/2).');

  const newDueAt = new Date(loan.due_at);
  newDueAt.setDate(newDueAt.getDate() + 14);

  const { error: updateError } = await supabase
    .from('Loans')
    .update({ due_at: newDueAt.toISOString(), renewed_count: renewedCount + 1 })
    .eq('id', loanId);

  if (updateError) {
    console.error('Failed to renew loan', updateError);
    return failure('Unable to renew loan. Try again.');
  }

  revalidatePath('/dashboard/my-books');
  revalidatePath('/dashboard');
  return success(`Loan renewed. New due date: ${newDueAt.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}.`);
}

export async function createBookAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const title = formData.get('title')?.toString().trim();
  const author = formData.get('author')?.toString().trim() || null;
  const isbn = formData.get('isbn')?.toString().trim() || null;
  const classification = formData.get('classification')?.toString().trim() || null;
  const coverImageUrl = formData.get('coverImageUrl')?.toString().trim() || null;
  const publisher = formData.get('publisher')?.toString().trim() || null;
  const publicationYear = formData.get('publicationYear')?.toString().trim() || null;
  const copyBarcodeSingle = formData.get('barcode')?.toString().trim() || null;
  const copyBarcodeList = formData.get('copyBarcodes')?.toString() ?? null;

  if (!title) return failure('Book title is required.');

  const supabase = getSupabaseServerClient();

  if (isbn) {
    const { data: existingByIsbn, error: isbnError } = await supabase
      .from('Books')
      .select('id')
      .eq('isbn', isbn)
      .maybeSingle();

    if (isbnError) {
      console.error('ISBN uniqueness check failed', isbnError);
      return failure('Unable to verify ISBN uniqueness.');
    }

    if (existingByIsbn) {
      return failure('A book with this ISBN already exists.');
    }
  }

  const barcodes = parseCopyBarcodes(copyBarcodeList, copyBarcodeSingle);

  if (barcodes.length === 0) {
    return failure('Provide at least one copy barcode.');
  }

  const { data: conflictingCopies, error: copyConflictError } = await supabase
    .from('Copies')
    .select('id, barcode')
    .in('barcode', barcodes);

  if (copyConflictError) {
    console.error('Failed to verify copy barcode uniqueness', copyConflictError);
    return failure('Unable to verify copy barcode uniqueness.');
  }

  if (conflictingCopies && conflictingCopies.length > 0) {
    return failure('One or more copy barcodes already exist in the catalogue.');
  }

  const nowIso = new Date().toISOString();

  const { data: bookRow, error: bookInsertError } = await supabase
    .from('Books')
    .insert({
      title,
      author,
      isbn,
      classification,
      publisher,
      publication_year: publicationYear,
      cover_image_url: coverImageUrl,
      updated_at: nowIso,
    })
    .select('id')
    .single();

  if (bookInsertError || !bookRow) {
    console.error('Failed to create book', bookInsertError);
    return failure('Unable to create book record.');
  }

  const copyRows = barcodes.map((barcode) => ({
    book_id: bookRow.id,
    barcode,
    status: 'available',
  }));

  const { error: copyInsertError } = await supabase.from('Copies').insert(copyRows);

  if (copyInsertError) {
    console.error('Failed to create copies', copyInsertError);
    await supabase.from('Books').delete().eq('id', bookRow.id);
    return failure('Unable to create book copies; no records were saved.');
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/book/items');
  revalidatePath('/dashboard/book/checkout');

  return success('Book has been added to the catalogue.');
}
