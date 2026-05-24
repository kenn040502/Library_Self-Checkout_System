import { getSupabaseServerClient } from '@/app/lib/supabase/server';
import type { DashboardRole } from '@/app/lib/auth/types';
import type { Book, Copy, DashboardSummary, Loan, LoanStatus } from '@/app/lib/supabase/types';
import { isbnsMatch, normalizeIsbn } from '@/app/lib/supabase/isbnMatch';

const sanitizeSearchTerm = (value?: string): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

const escapeForIlike = (value: string): string =>
  value.replace(/[%_]/g, (match) => `\\${match}`).replace(/'/g, "''");

const toDashboardRole = (value: unknown): DashboardRole | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'admin') return 'admin';
  if (normalized === 'staff' || normalized === 'librarian') return 'staff';
  return 'user';
};

const normalizeCopyStatus = (value: unknown): Copy['status'] => {
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
    case 'avaliable':
    default:
      return 'available';
  }
};

const deriveLoanStatus = (dueAt: string, returnedAt: string | null): LoanStatus => {
  if (returnedAt) return 'returned';
  const due = new Date(dueAt);
  if (!Number.isNaN(due.valueOf()) && due.getTime() < Date.now()) {
    return 'overdue';
  }
  return 'borrowed';
};

const isCopyAvailable = (copy: Copy): boolean => {
  if (!copy) return false;
  if (copy.status !== 'available') return false;
  return !(copy.loans ?? []).some((loan) => loan.returnedAt == null);
};

type RawCopyLoanRow = {
  id: string;
  returned_at: string | null;
};

type RawCopyRow = {
  id: string;
  book_id: string;
  barcode: string;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  loans?: RawCopyLoanRow[] | null;
};

type RawBookRow = {
  id: string;
  title: string;
  author: string | null;
  isbn: string | null;
  classification: string | null;
  publisher: string | null;
  publication_year: string | null;
  cover_image_url: string | null;
  category: string | null;
  created_at: string | null;
  updated_at: string | null;
  copies: RawCopyRow[] | null;
  book_tag_links:
    | Array<{
        tag: { name: string | null } | null;
      }>
    | null;
};

type RawLoanRow = {
  id: string;
  copy_id: string;
  user_id: string | null;
  borrowed_at: string;
  due_at: string;
  returned_at: string | null;
  renewed_count: number | null;
  handled_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  copy?: {
    id: string;
    barcode: string | null;
    book?: {
      id: string;
      title: string;
      author: string | null;
      isbn: string | null;
    } | null;
  } | null;
  borrower?: {
    id: string;
    email: string | null;
    role: string | null;
    profile?: {
      display_name: string | null;
      student_id: string | null;
    } | null;
  } | null;
  handler?: {
    id: string;
    email: string | null;
    role: string | null;
    profile?: {
      display_name: string | null;
    } | null;
  } | null;
};

const mapCopyRow = (row: RawCopyRow): Copy => ({
  id: row.id,
  bookId: row.book_id,
  barcode: row.barcode,
  status: normalizeCopyStatus(row.status),
  loans: (row.loans ?? []).map((loan) => ({
    id: loan.id,
    returnedAt: loan.returned_at ?? null,
  })),
  createdAt: row.created_at ?? null,
  updatedAt: row.updated_at ?? null,
});

const mapBookRow = (row: RawBookRow): Book => {
  const copies = (row.copies ?? []).map(mapCopyRow);
  const availableCopies = copies.filter(isCopyAvailable).length;
  const tags = (row.book_tag_links ?? [])
    .map((link) => link?.tag?.name)
    .filter((name): name is string => typeof name === 'string' && name.length > 0);

  return {
    id: row.id,
    title: row.title,
    author: row.author ?? null,
    isbn: row.isbn ?? null,
    classification: row.classification ?? null,
    coverImageUrl: row.cover_image_url ?? null,
    publisher: row.publisher ?? null,
    publicationYear: row.publication_year ?? null,
    tags,
    category: row.category ?? null,
    copies,
    totalCopies: copies.length,
    availableCopies,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
};

const mapLoanRow = (row: RawLoanRow): Loan => {
  const borrowerProfile = row.borrower?.profile ?? null;
  const handlerProfile = row.handler?.profile ?? null;
  const bookSource = row.copy?.book ?? null;

  return {
    id: row.id,
    copyId: row.copy_id,
    bookId: bookSource?.id ?? null,
    borrowerId: row.user_id,
    borrowerName: borrowerProfile?.display_name ?? row.borrower?.email ?? null,
    borrowerEmail: row.borrower?.email ?? null,
    borrowerIdentifier: borrowerProfile?.student_id ?? row.borrower?.email ?? null,
    borrowerRole: toDashboardRole(row.borrower?.role ?? null),
    handledBy: row.handled_by ?? null,
    status: deriveLoanStatus(row.due_at, row.returned_at),
    borrowedAt: row.borrowed_at,
    dueAt: row.due_at,
    returnedAt: row.returned_at ?? null,
    renewedCount: row.renewed_count ?? 0,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
    copy: row.copy
      ? {
          id: row.copy.id,
          barcode: row.copy.barcode ?? null,
        }
      : null,
    book: bookSource
      ? {
          id: bookSource.id,
          title: bookSource.title,
          author: bookSource.author ?? null,
          isbn: bookSource.isbn ?? null,
        }
      : null,
    handler: row.handler
      ? {
          id: row.handler.id,
          name: handlerProfile?.display_name ?? row.handler.email ?? null,
          email: row.handler.email ?? null,
        }
      : null,
  };
};

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const supabase = getSupabaseServerClient();
  const nowIso = new Date().toISOString();

  const [totalBooks, activeLoans, overdueLoans, copies] = await Promise.all([
    supabase.from('Books').select('id', { head: true, count: 'exact' }),
    supabase.from('Loans').select('id', { head: true, count: 'exact' }).is('returned_at', null),
    supabase
      .from('Loans')
      .select('id', { head: true, count: 'exact' })
      .is('returned_at', null)
      .lt('due_at', nowIso),
    supabase
      .from('Copies')
      .select(
        `
          book_id,
          status,
          loans:Loans(
            id,
            returned_at
          )
        `,
      ),
  ]);

  if (totalBooks.error) throw totalBooks.error;
  if (activeLoans.error) throw activeLoans.error;
  if (overdueLoans.error) throw overdueLoans.error;
  if (copies.error) throw copies.error;

  type CopySummaryRow = {
    book_id: string;
    status: string | null;
    loans: RawCopyLoanRow[] | null;
  };

  const availableBookIds = new Set<string>();
  for (const copy of (copies.data ?? []) as CopySummaryRow[]) {
    const status = normalizeCopyStatus(copy.status);
    if (status !== 'available') continue;

    const hasActiveLoan = (copy.loans ?? []).some((loan) => loan.returned_at == null);
    if (!hasActiveLoan && copy.book_id) {
      availableBookIds.add(copy.book_id);
    }
  }

  return {
    totalBooks: totalBooks.count ?? 0,
    availableBooks: availableBookIds.size,
    activeLoans: activeLoans.count ?? 0,
    overdueLoans: overdueLoans.count ?? 0,
  };
}

export async function fetchRecentLoans(limit = 6): Promise<Loan[]> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from('Loans')
    .select(
      `
        id,
        copy_id,
        user_id,
        borrowed_at,
        due_at,
        returned_at,
        renewed_count,
        handled_by,
        created_at,
        updated_at,
        copy:Copies(
          id,
          barcode,
          book:Books(
            id,
            title,
            author,
            isbn
          )
        ),
        borrower:Users!Loans_user_id_fkey(
          id,
          email,
          role,
          profile:UserProfile(
            display_name,
            student_id
          )
        ),
        handler:Users!Loans_handled_by_fkey(
          id,
          email,
          role,
          profile:UserProfile(
            display_name
          )
        )
      `,
    )
    .order('borrowed_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  const rawRows = ((data ?? []) as unknown) as RawLoanRow[];
  return rawRows.map(mapLoanRow);
}

export async function fetchActiveLoans(searchTerm?: string, userId?: string): Promise<Loan[]> {
  const supabase = getSupabaseServerClient();

  let query = supabase
    .from('Loans')
    .select(
      `
        id,
        copy_id,
        user_id,
        borrowed_at,
        due_at,
        returned_at,
        renewed_count,
        handled_by,
        created_at,
        updated_at,
        copy:Copies(
          id,
          barcode,
          book:Books(
            id,
            title,
            author,
            isbn
          )
        ),
        borrower:Users!Loans_user_id_fkey(
          id,
          email,
          role,
          profile:UserProfile(
            display_name,
            student_id
          )
        ),
        handler:Users!Loans_handled_by_fkey(
          id,
          email,
          role,
          profile:UserProfile(
            display_name
          )
        )
      `,
    )
    .is('returned_at', null)
    .order('borrowed_at', { ascending: false });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) throw error;

  const loans = (((data ?? []) as unknown) as RawLoanRow[]).map(mapLoanRow);
  const sanitized = sanitizeSearchTerm(searchTerm);

  if (!sanitized) return loans;

  const lowered = sanitized.toLowerCase();

  return loans.filter((loan) => {
    const fields = [
      loan.borrowerName,
      loan.borrowerIdentifier,
      loan.copy?.barcode ?? null,
      loan.book?.title ?? null,
      loan.book?.isbn ?? null,
    ];

    // Generic case-insensitive substring match (existing behaviour for names/title)
    const substringHit = fields.some((field) => field?.toLowerCase().includes(lowered));
    if (substringHit) return true;

    // ISBN-aware match: if the search term looks ISBN-ish, also accept ISBN-10 ↔ ISBN-13
    // equivalence against book.isbn — needed when the scanned cover ISBN differs in
    // length or edition from the seeded ISBN.
    const normTerm = normalizeIsbn(sanitized);
    if (normTerm.length === 10 || normTerm.length === 13) {
      if (isbnsMatch(loan.book?.isbn, sanitized)) return true;
    }

    return false;
  });
}

export async function fetchRecentlyReturnedLoans(
  userId: string,
  withinDays: number,
  limit = 5,
): Promise<Loan[]> {
  if (!userId) return [];

  const supabase = getSupabaseServerClient();
  const cutoff = new Date(Date.now() - withinDays * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('Loans')
    .select(
      `
        id,
        copy_id,
        user_id,
        borrowed_at,
        due_at,
        returned_at,
        renewed_count,
        handled_by,
        created_at,
        updated_at,
        copy:Copies(
          id,
          barcode,
          book:Books(
            id,
            title,
            author,
            isbn
          )
        ),
        borrower:Users!Loans_user_id_fkey(
          id,
          email,
          role,
          profile:UserProfile(
            display_name,
            student_id
          )
        ),
        handler:Users!Loans_handled_by_fkey(
          id,
          email,
          role,
          profile:UserProfile(
            display_name
          )
        )
      `,
    )
    .not('returned_at', 'is', null)
    .eq('user_id', userId)
    .gte('returned_at', cutoff)
    .order('returned_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (((data ?? []) as unknown) as RawLoanRow[]).map(mapLoanRow);
}

export async function fetchBooks(searchTerm?: string): Promise<Book[]> {
  const supabase = getSupabaseServerClient();
  const sanitized = sanitizeSearchTerm(searchTerm);

  // For typo-tolerant search we call the search_books RPC (pg_trgm trigram +
  // ILIKE fallback). The RPC returns book ids ranked by similarity; we then
  // refetch the full Book rows with joins so the rest of the page can keep
  // using the existing shape.
  let allowedIds: string[] | null = null;
  if (sanitized) {
    const { data: idRows, error: rpcError } = await supabase.rpc('search_books', {
      q: sanitized,
    });

    if (rpcError) {
      // If the RPC isn't deployed yet, fall back to ILIKE so search still works.
      console.warn('[search_books] RPC unavailable, falling back to ILIKE', rpcError);
      const pattern = `%${escapeForIlike(sanitized)}%`;
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('Books')
        .select('id')
        .or(
          [
            `title.ilike.${pattern}`,
            `author.ilike.${pattern}`,
            `isbn.ilike.${pattern}`,
            `classification.ilike.${pattern}`,
            `publisher.ilike.${pattern}`,
          ].join(','),
        )
        .limit(200);
      if (fallbackError) throw fallbackError;
      allowedIds = ((fallbackData ?? []) as Array<{ id: string }>).map((r) => r.id);
    } else {
      const rows = ((idRows ?? []) as unknown) as Array<{ id: string }>;
      allowedIds = rows.map((r) => r.id);
    }

    if (allowedIds === null || allowedIds.length === 0) {
      return [];
    }
  }

  let query = supabase
    .from('Books')
    .select(
      `
        id,
        title,
        author,
        isbn,
        classification,
        publisher,
        publication_year,
        cover_image_url,
        category,
        created_at,
        updated_at,
         copies:Copies(
          id,
          book_id,
          barcode,
          status,
          created_at,
          updated_at,
          loans:Loans(
            id,
            returned_at
          )
        ),
        book_tag_links:BookTagsLinks(
          tag:BookTags(
            name
          )
        )
      `,
    )
    .order('title')
    .limit(200);

  if (allowedIds) {
    query = query.in('id', allowedIds);
  }

  const { data, error } = await query;
  if (error) throw error;

  const mapped = (((data ?? []) as unknown) as RawBookRow[]).map(mapBookRow);

  // Preserve RPC similarity ranking when we have it.
  if (allowedIds) {
    const orderIndex = new Map(allowedIds.map((id, i) => [id, i]));
    mapped.sort(
      (a, b) =>
        (orderIndex.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
        (orderIndex.get(b.id) ?? Number.MAX_SAFE_INTEGER),
    );
  }

  return mapped;
}

export async function fetchAvailableBooks(searchTerm?: string): Promise<Book[]> {
  const books = await fetchBooks(searchTerm);
  return books.filter((book) => book.availableCopies > 0);
}

export async function fetchBookById(id: string): Promise<Book | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('Books')
    .select(
      `
        id,
        title,
        author,
        isbn,
        classification,
        publisher,
        publication_year,
        cover_image_url,
        category,
        created_at,
        updated_at,
         copies:Copies(
          id,
          book_id,
          barcode,
          status,
          created_at,
          updated_at,
          loans:Loans(
            id,
            returned_at
          )
        ),
        book_tag_links:BookTagsLinks(
          tag:BookTags(
            name
          )
        )
      `,
    )
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapBookRow((data as unknown) as RawBookRow);
}


// ------------------- HOLDS (STAFF VIEW) -------------------

export type HoldStatus =
  | 'queued'
  | 'ready'
  | 'fulfilled'
  | 'expired'
  | 'canceled';

type RawHoldRow = {
  id: string;
  patron_id: string;
  book_id: string;
  status: HoldStatus;
  placed_at: string | null;
  ready_at: string | null;
  expires_at: string | null;
};

export type PatronHold = {
  id: string;
  bookId: string;
  patronId: string;
  status: HoldStatus;
  placedAt: string | null;
  readyAt: string | null;
  expiresAt: string | null;
  title: string;
  author: string | null;
  isbn: string | null;
  coverImage: string | null;
};

/**
 * Basic fetch for holds table for staff/admin pages.
 * (You can later extend this to join books/users if you want.)
 */
export async function fetchHoldsForStaff() {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from('Holds')
    .select(
      `
      id,
      patron_id,
      book_id,
      status,
      placed_at,
      ready_at,
      expires_at,
      book:Books (
        title,
        cover_image_url
      ),
      patron:Users (
        email,
        profile:UserProfile (
          display_name
        )
      )
      `
    )
    .order('placed_at', { ascending: true });

  if (error) throw error;

  return data.map((h: any) => ({
    id: h.id,
    patron_id: h.patron_id,
    book_id: h.book_id,
    status: h.status,
    placed_at: h.placed_at,
    ready_at: h.ready_at,
    expires_at: h.expires_at,
    book_title: h.book?.title ?? 'Unknown title',
    book_cover: h.book?.cover_image_url ?? null,
    patron_name:
      h.patron?.profile?.display_name ??
      h.patron?.email ??
      'Unknown patron',
  }));
}


/**
 * Small helper for updating a single hold's status / timestamps.
 */
export async function updateHoldStatus(
  holdId: string,
  fields: {
    status?: HoldStatus;
    ready_at?: string | null;
    expires_at?: string | null;
    fulfilled_by_copy_id?: string | null;
  },
) {
  const supabase = getSupabaseServerClient();

  const { error } = await supabase
    .from('Holds')
    .update(fields)
    .eq('id', holdId);

  if (error) throw error;
}

/**
 * Returns active holds (queued or ready) for the signed-in patron.
 */
export async function fetchActiveHoldsForPatron(patronId: string): Promise<PatronHold[]> {
  if (!patronId) return [];

  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from('Holds')
    .select(
      `
      id,
      patron_id,
      book_id,
      status,
      placed_at,
      ready_at,
      expires_at,
      book:Books (
        title,
        author,
        isbn,
        cover_image_url
      )
      `,
    )
    .eq('patron_id', patronId)
    .in('status', ['queued', 'ready'])
    .order('placed_at', { ascending: true });

  if (error) throw error;

  return (data ?? [])
    .map((row: any) => ({
      id: row.id,
      bookId: row.book_id,
      patronId: row.patron_id,
      status: row.status as HoldStatus,
      placedAt: row.placed_at,
      readyAt: row.ready_at,
      expiresAt: row.expires_at,
      title: row.book?.title ?? 'Untitled',
      author: row.book?.author ?? null,
      isbn: row.book?.isbn ?? null,
      coverImage: row.book?.cover_image_url ?? null,
    }))
    .sort((a, b) => {
      if (a.status === 'ready' && b.status !== 'ready') return -1;
      if (b.status === 'ready' && a.status !== 'ready') return 1;
      const aTime = a.placedAt ? new Date(a.placedAt).getTime() : 0;
      const bTime = b.placedAt ? new Date(b.placedAt).getTime() : 0;
      return aTime - bTime;
    });
}

// ------------------- BORROWING HISTORY (STUDENT VIEW) -------------------

export type TimePeriod = 'all' | '30d' | '6m' | 'semester';

export interface BorrowingHistoryLoan {
  id: string;
  borrowedAt: string;
  returnedAt: string;
  dueAt: string;
  renewedCount: number;
  loanDurationDays: number;
  book: {
    id: string;
    title: string;
    author: string | null;
    isbn: string | null;
    coverImageUrl: string | null;
  };
}

export interface BorrowingStats {
  totalBorrowed: number;
  thisYearCount: number;
  avgLoanDays: number;
}

const getSemesterStart = (): Date => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return month < 6 ? new Date(year, 0, 1) : new Date(year, 6, 1);
};

const getPeriodCutoff = (period: TimePeriod): Date | null => {
  if (period === 'all') return null;
  if (period === 'semester') return getSemesterStart();
  const now = new Date();
  if (period === '30d') {
    now.setDate(now.getDate() - 30);
    return now;
  }
  // 6m
  now.setMonth(now.getMonth() - 6);
  return now;
};

type RawHistoryRow = {
  id: string;
  borrowed_at: string;
  returned_at: string;
  due_at: string;
  renewed_count: number | null;
  copy?: {
    id: string;
    book?: {
      id: string;
      title: string;
      author: string | null;
      isbn: string | null;
      cover_image_url: string | null;
    } | null;
  } | null;
};

export async function fetchBorrowingHistory(
  userId: string,
  searchTerm?: string,
  period?: TimePeriod,
): Promise<BorrowingHistoryLoan[]> {
  const supabase = getSupabaseServerClient();

  let query = supabase
    .from('Loans')
    .select(
      `
        id,
        borrowed_at,
        due_at,
        returned_at,
        renewed_count,
        copy:Copies(
          id,
          book:Books(
            id,
            title,
            author,
            isbn,
            cover_image_url
          )
        )
      `,
    )
    .not('returned_at', 'is', null)
    .eq('user_id', userId)
    .order('returned_at', { ascending: false });

  const cutoff = getPeriodCutoff(period ?? 'all');
  if (cutoff) {
    query = query.gte('borrowed_at', cutoff.toISOString());
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = ((data ?? []) as unknown) as RawHistoryRow[];

  const mapped = rows
    .filter((row) => row.copy?.book != null)
    .map((row) => {
      const book = row.copy!.book!;
      const borrowed = new Date(row.borrowed_at);
      const returned = new Date(row.returned_at);
      const diffMs = returned.getTime() - borrowed.getTime();
      const loanDurationDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));

      return {
        id: row.id,
        borrowedAt: row.borrowed_at,
        returnedAt: row.returned_at,
        dueAt: row.due_at,
        renewedCount: row.renewed_count ?? 0,
        loanDurationDays,
        book: {
          id: book.id,
          title: book.title,
          author: book.author ?? null,
          isbn: book.isbn ?? null,
          coverImageUrl: book.cover_image_url ?? null,
        },
      };
    });

  const sanitized = sanitizeSearchTerm(searchTerm);
  if (!sanitized) return mapped;

  const lowered = sanitized.toLowerCase();
  return mapped.filter((loan) => {
    return (
      loan.book.title.toLowerCase().includes(lowered) ||
      (loan.book.author?.toLowerCase().includes(lowered) ?? false)
    );
  });
}

export async function fetchBorrowingStats(userId: string): Promise<BorrowingStats> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from('Loans')
    .select('borrowed_at, returned_at')
    .not('returned_at', 'is', null)
    .eq('user_id', userId);

  if (error) throw error;

  const rows = (data ?? []) as Array<{ borrowed_at: string; returned_at: string }>;
  const currentYear = new Date().getFullYear();

  let totalDays = 0;
  let thisYearCount = 0;

  for (const row of rows) {
    const borrowed = new Date(row.borrowed_at);
    const returned = new Date(row.returned_at);
    totalDays += Math.max(1, Math.round((returned.getTime() - borrowed.getTime()) / (1000 * 60 * 60 * 24)));
    if (borrowed.getFullYear() === currentYear) {
      thisYearCount++;
    }
  }

  return {
    totalBorrowed: rows.length,
    thisYearCount,
    avgLoanDays: rows.length > 0 ? Math.round(totalDays / rows.length) : 0,
  };
}

export async function fetchLoanHistory(userId: string, limit?: number): Promise<BorrowingHistoryLoan[]> {
  const history = await fetchBorrowingHistory(userId);
  return limit ? history.slice(0, limit) : history;
}

// ─── System-wide circulation history (staff / admin) ───────────────────────

type RawCirculationRow = RawHistoryRow & {
  borrower?: {
    id: string;
    email: string | null;
    profile?: { display_name: string | null; student_id: string | null } | null;
  } | null;
};

export type CirculationHistoryLoan = BorrowingHistoryLoan & {
  patron: { id: string; name: string | null; email: string | null; studentId: string | null };
};

export async function fetchAllCirculationHistory(
  searchTerm?: string,
  period?: TimePeriod,
): Promise<CirculationHistoryLoan[]> {
  const supabase = getSupabaseServerClient();

  let query = supabase
    .from('Loans')
    .select(
      `
        id,
        borrowed_at,
        due_at,
        returned_at,
        renewed_count,
        copy:Copies(
          id,
          book:Books(id, title, author, isbn, cover_image_url)
        ),
        borrower:Users!Loans_user_id_fkey(
          id,
          email,
          profile:UserProfile(display_name, student_id)
        )
      `,
    )
    .not('returned_at', 'is', null)
    .order('returned_at', { ascending: false });

  const cutoff = getPeriodCutoff(period ?? 'all');
  if (cutoff) query = query.gte('borrowed_at', cutoff.toISOString());

  const { data, error } = await query;
  if (error) throw error;

  const rows = ((data ?? []) as unknown) as RawCirculationRow[];

  const mapped: CirculationHistoryLoan[] = rows
    .filter((row) => row.copy?.book != null)
    .map((row) => {
      const book = row.copy!.book!;
      const borrowed = new Date(row.borrowed_at);
      const returned = new Date(row.returned_at);
      const loanDurationDays = Math.max(1, Math.round((returned.getTime() - borrowed.getTime()) / (1000 * 60 * 60 * 24)));
      const profile = row.borrower?.profile;
      return {
        id: row.id,
        borrowedAt: row.borrowed_at,
        returnedAt: row.returned_at,
        dueAt: row.due_at,
        renewedCount: row.renewed_count ?? 0,
        loanDurationDays,
        book: {
          id: book.id,
          title: book.title,
          author: book.author ?? null,
          isbn: book.isbn ?? null,
          coverImageUrl: book.cover_image_url ?? null,
        },
        patron: {
          id: row.borrower?.id ?? '',
          name: profile?.display_name ?? null,
          email: row.borrower?.email ?? null,
          studentId: profile?.student_id ?? null,
        },
      };
    });

  const sanitized = sanitizeSearchTerm(searchTerm);
  if (!sanitized) return mapped;

  const lowered = sanitized.toLowerCase();
  return mapped.filter(
    (loan) =>
      loan.book.title.toLowerCase().includes(lowered) ||
      (loan.book.author?.toLowerCase().includes(lowered) ?? false) ||
      (loan.patron.name?.toLowerCase().includes(lowered) ?? false) ||
      (loan.patron.email?.toLowerCase().includes(lowered) ?? false) ||
      (loan.patron.studentId?.toLowerCase().includes(lowered) ?? false),
  );
}

export async function fetchCirculationStats(): Promise<BorrowingStats> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from('Loans')
    .select('borrowed_at, returned_at')
    .not('returned_at', 'is', null);

  if (error) throw error;

  const rows = (data ?? []) as Array<{ borrowed_at: string; returned_at: string }>;
  const currentYear = new Date().getFullYear();
  let totalDays = 0;
  let thisYearCount = 0;

  for (const row of rows) {
    const borrowed = new Date(row.borrowed_at);
    const returned = new Date(row.returned_at);
    totalDays += Math.max(1, Math.round((returned.getTime() - borrowed.getTime()) / (1000 * 60 * 60 * 24)));
    if (borrowed.getFullYear() === currentYear) thisYearCount++;
  }

  return {
    totalBorrowed: rows.length,
    thisYearCount,
    avgLoanDays: rows.length > 0 ? Math.round(totalDays / rows.length) : 0,
  };
}

export async function fetchHoldsForBook(bookId: string): Promise<number> {
  const supabase = getSupabaseServerClient();

  const { count, error } = await supabase
    .from('Holds')
    .select('id', { count: 'exact', head: true })
    .eq('book_id', bookId)
    .in('status', ['queued', 'ready']);

  if (error) throw error;
  return count ?? 0;
}

export async function cancelHoldForPatron(holdId: string, patronId: string): Promise<boolean> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from('Holds')
    .update({
      status: 'canceled',
      ready_at: null,
      expires_at: null,
      fulfilled_by_copy_id: null,
    })
    .eq('id', holdId)
    .eq('patron_id', patronId)
    .in('status', ['queued', 'ready'])
    .select('id');

  if (error) throw error;

  return Array.isArray(data) && data.length > 0;
}

/**
 * Returns borrowed-per-day counts for the last `days` days (ending today, inclusive).
 * The returned array is ordered oldest -> newest and always has exactly `days` entries.
 */
export async function fetchDailyLoanCounts(days = 14): Promise<number[]> {
  if (days <= 0) return [];

  const supabase = getSupabaseServerClient();

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const windowStart = new Date(startOfToday.getTime() - (days - 1) * 86_400_000);

  const { data, error } = await supabase
    .from('Loans')
    .select('borrowed_at')
    .gte('borrowed_at', windowStart.toISOString());

  if (error) throw error;

  const buckets = new Array<number>(days).fill(0);
  for (const row of (data ?? []) as Array<{ borrowed_at: string | null }>) {
    if (!row.borrowed_at) continue;
    const borrowed = new Date(row.borrowed_at);
    if (Number.isNaN(borrowed.valueOf())) continue;
    const borrowedDay = new Date(borrowed.getFullYear(), borrowed.getMonth(), borrowed.getDate());
    const dayIndex = Math.floor((borrowedDay.getTime() - windowStart.getTime()) / 86_400_000);
    if (dayIndex >= 0 && dayIndex < days) buckets[dayIndex] += 1;
  }

  return buckets;
}

export type TopBorrowedBook = {
  bookId: string;
  title: string;
  author: string | null;
  count: number;
};

/**
 * Returns the most-borrowed books within the last `days` days, ordered by loan count desc.
 */
export async function fetchTopBorrowedBooks(days = 30, limit = 5): Promise<TopBorrowedBook[]> {
  const supabase = getSupabaseServerClient();

  const windowStart = new Date(Date.now() - days * 86_400_000);

  const { data, error } = await supabase
    .from('Loans')
    .select(
      `
        id,
        borrowed_at,
        copy:Copies(
          book:Books(
            id,
            title,
            author
          )
        )
      `,
    )
    .gte('borrowed_at', windowStart.toISOString());

  if (error) throw error;

  type Row = {
    copy: { book: { id: string; title: string; author: string | null } | null } | null;
  };

  const counts = new Map<string, TopBorrowedBook>();
  for (const row of (data ?? []) as unknown as Row[]) {
    const book = row.copy?.book;
    if (!book?.id) continue;
    const existing = counts.get(book.id);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(book.id, {
        bookId: book.id,
        title: book.title ?? 'Untitled',
        author: book.author ?? null,
        count: 1,
      });
    }
  }

  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// ==================================================
// Borrow / Return pre-flight helpers (v3.0.1)
// ==================================================

export type PatronSearchResult = {
  id: string;
  displayName: string | null;
  email: string | null;
  studentId: string | null;
  username: string | null;
  activeLoans: number;
  hasOverdue: boolean;
};

/**
 * Debounced-by-caller patron search. Matches against email, display_name, username,
 * or student_id (case-insensitive, prefix). Returns up to `limit` rows annotated
 * with their active-loan count and whether any are overdue.
 */
export async function searchPatrons(query: string, limit = 8): Promise<PatronSearchResult[]> {
  const q = sanitizeSearchTerm(query);
  if (!q || q.length < 2) return [];

  const supabase = getSupabaseServerClient();
  const pattern = `%${escapeForIlike(q)}%`;

  const { data: profileMatches, error: profileError } = await supabase
    .from('UserProfile')
    .select('user_id, display_name, username, student_id')
    .or(
      [
        `display_name.ilike.${pattern}`,
        `username.ilike.${pattern}`,
        `student_id.ilike.${pattern}`,
      ].join(','),
    )
    .limit(limit * 2);

  if (profileError) throw profileError;

  const userIdsFromProfiles = new Set<string>(
    (profileMatches ?? []).map((row: { user_id: string }) => row.user_id).filter(Boolean),
  );

  const { data: emailMatches, error: emailError } = await supabase
    .from('Users')
    .select('id')
    .ilike('email', pattern)
    .limit(limit * 2);

  if (emailError) throw emailError;

  for (const row of (emailMatches ?? []) as Array<{ id: string }>) {
    if (row.id) userIdsFromProfiles.add(row.id);
  }

  const userIds = Array.from(userIdsFromProfiles).slice(0, limit);
  if (userIds.length === 0) return [];

  const { data: users, error: usersError } = await supabase
    .from('Users')
    .select(
      `
        id,
        email,
        profile:UserProfile(
          display_name,
          username,
          student_id
        )
      `,
    )
    .in('id', userIds);

  if (usersError) throw usersError;

  const nowIso = new Date().toISOString();
  const results: PatronSearchResult[] = [];
  type RawUserRow = {
    id: string;
    email: string | null;
    profile:
      | { display_name: string | null; username: string | null; student_id: string | null }
      | { display_name: string | null; username: string | null; student_id: string | null }[]
      | null;
  };
  const userRows = (users ?? []) as unknown as RawUserRow[];
  for (const rawUser of userRows) {
    const profile = Array.isArray(rawUser.profile)
      ? rawUser.profile[0] ?? null
      : rawUser.profile;
    const user = { id: rawUser.id, email: rawUser.email, profile };
    const [{ count: activeCount }, { count: overdueCount }] = await Promise.all([
      supabase
        .from('Loans')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('returned_at', null),
      supabase
        .from('Loans')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('returned_at', null)
        .lt('due_at', nowIso),
    ]);

    results.push({
      id: user.id,
      displayName: user.profile?.display_name ?? null,
      email: user.email,
      studentId: user.profile?.student_id ?? null,
      username: user.profile?.username ?? null,
      activeLoans: activeCount ?? 0,
      hasOverdue: (overdueCount ?? 0) > 0,
    });
  }

  return results.sort((a, b) => {
    const aName = (a.displayName ?? a.email ?? '').toLowerCase();
    const bName = (b.displayName ?? b.email ?? '').toLowerCase();
    return aName.localeCompare(bName);
  });
}

export async function countActiveLoansForPatron(patronId: string): Promise<number> {
  if (!patronId) return 0;
  const supabase = getSupabaseServerClient();
  const { count, error } = await supabase
    .from('Loans')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', patronId)
    .is('returned_at', null);
  if (error) throw error;
  return count ?? 0;
}

export async function countOverdueLoansForPatron(patronId: string): Promise<number> {
  if (!patronId) return 0;
  const supabase = getSupabaseServerClient();
  const { count, error } = await supabase
    .from('Loans')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', patronId)
    .is('returned_at', null)
    .lt('due_at', new Date().toISOString());
  if (error) throw error;
  return count ?? 0;
}

export type HoldPromotionResult = {
  promotedHoldId: string;
  patronId: string;
  expiresAt: string;
} | null;

/**
 * When a copy of `bookId` has just been returned as available, flip the oldest
 * queued hold on that book to 'ready' with a 3-day pickup window. Returns the
 * promoted hold so callers can fire a notification.
 *
 * Returns null if no queued hold exists.
 */
export async function promoteNextHoldForBook(bookId: string): Promise<HoldPromotionResult> {
  if (!bookId) return null;
  const supabase = getSupabaseServerClient();

  const { data: nextHold, error: selectError } = await supabase
    .from('Holds')
    .select('id, patron_id')
    .eq('book_id', bookId)
    .eq('status', 'queued')
    .order('placed_at', { ascending: true })
    .limit(1)
    .maybeSingle<{ id: string; patron_id: string }>();

  if (selectError) throw selectError;
  if (!nextHold) return null;

  const readyAt = new Date();
  const expiresAt = new Date(readyAt.getTime() + 3 * 86_400_000);

  const { error: updateError } = await supabase
    .from('Holds')
    .update({
      status: 'ready',
      ready_at: readyAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .eq('id', nextHold.id)
    .eq('status', 'queued');

  if (updateError) throw updateError;

  return {
    promotedHoldId: nextHold.id,
    patronId: nextHold.patron_id,
    expiresAt: expiresAt.toISOString(),
  };
}

export type DamageSeverity = 'damaged' | 'lost' | 'needs_inspection';

export async function insertDamageReport(params: {
  loanId: string;
  copyId: string;
  reportedBy: string | null;
  severity: DamageSeverity;
  notes: string | null;
  photoUrls: string[];
}): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from('DamageReports').insert({
    loan_id: params.loanId,
    copy_id: params.copyId,
    reported_by: params.reportedBy,
    severity: params.severity,
    notes: params.notes,
    photo_urls: params.photoUrls,
  });
  if (error) throw error;
}

export type DamageReportRow = {
  id: string;
  severity: DamageSeverity;
  notes: string | null;
  photoPaths: string[];
  createdAt: string;
  loan: {
    id: string;
    dueAt: string | null;
    returnedAt: string | null;
  } | null;
  copy: {
    id: string;
    barcode: string | null;
    book: {
      id: string;
      title: string;
      author: string | null;
    } | null;
  } | null;
  borrower: {
    id: string;
    email: string;
    displayName: string | null;
  } | null;
  reportedBy: {
    id: string;
    email: string;
    displayName: string | null;
  } | null;
};

type RawDamageReportRow = {
  id: string;
  severity: string;
  notes: string | null;
  photo_urls: string[] | null;
  created_at: string;
  loan: {
    id: string;
    due_at: string | null;
    returned_at: string | null;
    user_id: string | null;
    borrower: {
      id: string;
      email: string;
      profile: { display_name: string | null } | null;
    } | null;
  } | null;
  copy: {
    id: string;
    barcode: string | null;
    book: {
      id: string;
      title: string;
      author: string | null;
    } | null;
  } | null;
  reporter: {
    id: string;
    email: string;
    profile: { display_name: string | null } | null;
  } | null;
};

const normalizeDamageSeverity = (value: unknown): DamageSeverity => {
  if (typeof value !== 'string') return 'damaged';
  const v = value.trim().toLowerCase();
  if (v === 'lost' || v === 'needs_inspection') return v;
  return 'damaged';
};

const mapDamageReportRow = (row: RawDamageReportRow): DamageReportRow => ({
  id: row.id,
  severity: normalizeDamageSeverity(row.severity),
  notes: row.notes,
  photoPaths: Array.isArray(row.photo_urls) ? row.photo_urls : [],
  createdAt: row.created_at,
  loan: row.loan
    ? {
        id: row.loan.id,
        dueAt: row.loan.due_at,
        returnedAt: row.loan.returned_at,
      }
    : null,
  copy: row.copy
    ? {
        id: row.copy.id,
        barcode: row.copy.barcode,
        book: row.copy.book
          ? { id: row.copy.book.id, title: row.copy.book.title, author: row.copy.book.author }
          : null,
      }
    : null,
  borrower: row.loan?.borrower
    ? {
        id: row.loan.borrower.id,
        email: row.loan.borrower.email,
        displayName: row.loan.borrower.profile?.display_name ?? null,
      }
    : null,
  reportedBy: row.reporter
    ? {
        id: row.reporter.id,
        email: row.reporter.email,
        displayName: row.reporter.profile?.display_name ?? null,
      }
    : null,
});

export async function fetchDamageReports(opts?: {
  severity?: DamageSeverity[];
  search?: string;
  daysBack?: number;
  limit?: number;
}): Promise<DamageReportRow[]> {
  const supabase = getSupabaseServerClient();

  let query = supabase
    .from('DamageReports')
    .select(
      `
        id,
        severity,
        notes,
        photo_urls,
        created_at,
        loan:Loans(
          id,
          due_at,
          returned_at,
          user_id,
          borrower:Users!Loans_user_id_fkey(
            id,
            email,
            profile:UserProfile(display_name)
          )
        ),
        copy:Copies(
          id,
          barcode,
          book:Books(id, title, author)
        ),
        reporter:Users!DamageReports_reported_by_fkey(
          id,
          email,
          profile:UserProfile(display_name)
        )
      `,
    )
    .order('created_at', { ascending: false })
    .limit(opts?.limit ?? 100);

  if (opts?.severity && opts.severity.length > 0) {
    query = query.in('severity', opts.severity);
  }

  if (typeof opts?.daysBack === 'number' && opts.daysBack > 0) {
    const cutoff = new Date(Date.now() - opts.daysBack * 24 * 60 * 60 * 1000);
    query = query.gte('created_at', cutoff.toISOString());
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = ((data ?? []) as unknown) as RawDamageReportRow[];
  let mapped = rows.map(mapDamageReportRow);

  // Search filter happens client-side because PostgREST 'or' across joins
  // is awkward; volume of damage reports is low.
  if (opts?.search) {
    const needle = opts.search.trim().toLowerCase();
    if (needle) {
      mapped = mapped.filter((row) => {
        const fields = [
          row.copy?.book?.title ?? '',
          row.copy?.book?.author ?? '',
          row.copy?.barcode ?? '',
          row.borrower?.displayName ?? '',
          row.borrower?.email ?? '',
          row.notes ?? '',
        ];
        return fields.some((f) => f.toLowerCase().includes(needle));
      });
    }
  }

  return mapped;
}

export async function getDamageReportSignedUrls(
  paths: string[],
  expiresInSeconds = 60 * 5,
): Promise<Array<{ path: string; signedUrl: string | null }>> {
  if (paths.length === 0) return [];
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.storage
    .from('damage-reports')
    .createSignedUrls(paths, expiresInSeconds);
  if (error) {
    console.error('Failed to generate signed URLs for damage photos', error);
    return paths.map((p) => ({ path: p, signedUrl: null }));
  }
  return (data ?? []).map((d) => ({ path: d.path ?? '', signedUrl: d.signedUrl ?? null }));
}


// ============================================================
// v3.0.3 — Overdue page
// ============================================================
import type { OverdueLoan, OverdueFilters, OverdueBucket } from '@/app/lib/supabase/types';

const bucketDayRange = (bucket: OverdueBucket | undefined): { min: number; max: number } => {
  switch (bucket) {
    case '1-7':  return { min: 1, max: 7 };
    case '8-30': return { min: 8, max: 30 };
    case '30+':  return { min: 31, max: 99999 };
    case 'all':
    default:     return { min: 1, max: 99999 };
  }
};

export async function fetchOverdueLoans(filters: OverdueFilters = {}): Promise<OverdueLoan[]> {
  const supabase = getSupabaseServerClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from('Loans')
    .select(`
      id, borrowed_at, due_at, last_reminded_at,
      copy:Copies(id, barcode, book:Books(id, title, author, isbn, cover_image_url)),
      borrower:Users!Loans_user_id_fkey(id, email, profile:UserProfile(display_name, student_id)),
      reminder_user:Users!Loans_last_reminded_by_fkey(id, email, profile:UserProfile(display_name))
    `)
    .is('returned_at', null)
    .lt('due_at', nowIso)
    .order('due_at', { ascending: true });

  if (error) throw error;

  const range = bucketDayRange(filters.bucket);
  const search = filters.search?.trim().toLowerCase();
  const now = Date.now();

  const all = ((data ?? []) as unknown[]).map((row): OverdueLoan => {
    const r = row as {
      id: string;
      borrowed_at: string;
      due_at: string;
      last_reminded_at: string | null;
      copy: unknown;
      borrower: unknown;
      reminder_user: unknown;
    };

    const dueMs = new Date(r.due_at).getTime();
    const daysOverdue = Math.max(0, Math.floor((now - dueMs) / 86400000));

    const reminderUser = Array.isArray(r.reminder_user) ? r.reminder_user[0] : r.reminder_user;
    const reminderProfileRaw = (reminderUser as { profile?: unknown })?.profile;
    const reminderProfile = Array.isArray(reminderProfileRaw) ? reminderProfileRaw[0] : reminderProfileRaw;

    const borrowerRow = r.borrower as { id?: string; email?: string | null; profile?: unknown } | null;
    const borrowerProfileRaw = borrowerRow?.profile;
    const borrowerProfile = Array.isArray(borrowerProfileRaw) ? borrowerProfileRaw[0] : borrowerProfileRaw;

    const copyRow = (Array.isArray(r.copy) ? r.copy[0] : r.copy) as
      | { id: string; barcode: string | null; book?: unknown }
      | null;
    const bookRowRaw = copyRow?.book;
    const bookRow = (Array.isArray(bookRowRaw) ? bookRowRaw[0] : bookRowRaw) as
      | { id: string; title: string; author: string | null; isbn: string | null; cover_image_url: string | null }
      | null;

    return {
      id: r.id,
      borrowedAt: r.borrowed_at,
      dueAt: r.due_at,
      daysOverdue,
      lastRemindedAt: r.last_reminded_at ?? null,
      lastRemindedByName:
        (reminderProfile as { display_name?: string | null } | null)?.display_name ??
        (reminderUser as { email?: string | null } | null)?.email ??
        null,
      copy: copyRow ? { id: copyRow.id, barcode: copyRow.barcode } : null,
      book: bookRow
        ? {
            id: bookRow.id,
            title: bookRow.title,
            author: bookRow.author ?? null,
            isbn: bookRow.isbn ?? null,
            coverImageUrl: bookRow.cover_image_url ?? null,
          }
        : null,
      borrower: borrowerRow
        ? {
            id: borrowerRow.id ?? '',
            displayName: (borrowerProfile as { display_name?: string | null } | null)?.display_name ?? null,
            studentId: (borrowerProfile as { student_id?: string | null } | null)?.student_id ?? null,
            email: borrowerRow.email ?? null,
          }
        : null,
    };
  });

  return all.filter((loan) => {
    if (loan.daysOverdue < range.min || loan.daysOverdue > range.max) return false;
    if (!search) return true;
    const haystack = [
      loan.book?.title, loan.book?.author,
      loan.borrower?.displayName, loan.borrower?.studentId, loan.borrower?.email,
      loan.copy?.barcode,
    ].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(search);
  });
}

// ============================================================
// v3.0.3 — Loan history page
// ============================================================
import type {
  HistoryFilters,
  HistoryLoan,
  HistoryPage,
} from '@/app/lib/supabase/types';

const HISTORY_PAGE_SIZE = 50;

const historyRangeStart = (
  range: HistoryFilters['range'],
  custom?: string,
): Date | null => {
  switch (range) {
    case '30d': {
      const d = new Date();
      return new Date(d.getTime() - 30 * 86400000);
    }
    case '6m': {
      const d = new Date();
      d.setMonth(d.getMonth() - 6);
      return d;
    }
    case 'semester': {
      const d = new Date();
      d.setMonth(d.getMonth() - 4);
      return d;
    }
    case 'custom':
      return custom ? new Date(custom) : null;
    case 'all':
    default:
      return null;
  }
};

// Returns LoanStatus value: 'borrowed' (active) | 'returned' | 'overdue'
const computeHistoryStatus = (
  returnedAt: string | null,
  dueAt: string,
  nowMs: number,
): 'borrowed' | 'returned' | 'overdue' => {
  if (returnedAt) return 'returned';
  if (new Date(dueAt).getTime() < nowMs) return 'overdue';
  return 'borrowed';
};

export async function fetchAllLoansHistory(
  filters: HistoryFilters = {},
  page = 0,
  pageSize: number = HISTORY_PAGE_SIZE,
): Promise<HistoryPage> {
  const effectivePageSize = Math.max(1, Math.min(200, pageSize));
  const supabase = getSupabaseServerClient();

  let query = supabase
    .from('Loans')
    .select(
      `
        id,
        borrowed_at,
        due_at,
        returned_at,
        handled_by,
        copy:Copies(
          id,
          barcode,
          book:Books(
            id,
            title,
            author,
            isbn,
            cover_image_url
          )
        ),
        borrower:Users!Loans_user_id_fkey(
          id,
          email,
          profile:UserProfile(
            display_name,
            student_id
          )
        ),
        handler:Users!Loans_handled_by_fkey(
          id,
          email,
          profile:UserProfile(
            display_name
          )
        )
      `,
      { count: 'exact' },
    )
    .order('borrowed_at', { ascending: false });

  // Status filter — narrow at DB level when possible.
  const status = filters.status ?? 'all';
  const nowIso = new Date().toISOString();
  if (status === 'returned') {
    query = query.not('returned_at', 'is', null);
  } else if (status === 'borrowed') {
    query = query.is('returned_at', null).gte('due_at', nowIso);
  } else if (status === 'overdue') {
    query = query.is('returned_at', null).lt('due_at', nowIso);
  }

  // Date range filter.
  const rangeStart = historyRangeStart(filters.range, filters.rangeStart);
  if (rangeStart) {
    query = query.gte('borrowed_at', rangeStart.toISOString());
  }
  if (filters.range === 'custom' && filters.rangeEnd) {
    const end = new Date(filters.rangeEnd);
    if (!Number.isNaN(end.valueOf())) {
      query = query.lte('borrowed_at', end.toISOString());
    }
  }

  const from = page * effectivePageSize;
  const to = from + effectivePageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) {
    console.error('[fetchAllLoansHistory]', error);
    throw error;
  }

  const nowMs = Date.now();

  type RawHistoryLoanRow = {
    id: string;
    borrowed_at: string;
    due_at: string;
    returned_at: string | null;
    handled_by: string | null;
    copy: unknown;
    borrower: unknown;
    handler: unknown;
  };

  const rawRows = ((data ?? []) as unknown) as RawHistoryLoanRow[];

  const mapped: HistoryLoan[] = rawRows.map((r) => {
    const copyRow = (Array.isArray(r.copy) ? r.copy[0] : r.copy) as
      | {
          id: string;
          barcode: string | null;
          book?: unknown;
        }
      | null;
    const bookRowRaw = copyRow?.book;
    const bookRow = (Array.isArray(bookRowRaw) ? bookRowRaw[0] : bookRowRaw) as
      | {
          id: string;
          title: string;
          author: string | null;
          isbn: string | null;
          cover_image_url: string | null;
        }
      | null;

    const borrowerRow = (Array.isArray(r.borrower) ? r.borrower[0] : r.borrower) as
      | { id?: string; email?: string | null; profile?: unknown }
      | null;
    const borrowerProfileRaw = borrowerRow?.profile;
    const borrowerProfile = (Array.isArray(borrowerProfileRaw)
      ? borrowerProfileRaw[0]
      : borrowerProfileRaw) as
      | { display_name?: string | null; student_id?: string | null }
      | null;

    const handlerRow = (Array.isArray(r.handler) ? r.handler[0] : r.handler) as
      | { id?: string; email?: string | null; profile?: unknown }
      | null;
    const handlerProfileRaw = handlerRow?.profile;
    const handlerProfile = (Array.isArray(handlerProfileRaw)
      ? handlerProfileRaw[0]
      : handlerProfileRaw) as
      | { display_name?: string | null }
      | null;

    const isSelfCheckout = !r.handled_by || r.handled_by === (borrowerRow?.id ?? null);
    const handlerDisplayName =
      handlerProfile?.display_name ?? handlerRow?.email ?? null;

    const borrowedMs = new Date(r.borrowed_at).getTime();
    const endMs = r.returned_at ? new Date(r.returned_at).getTime() : nowMs;
    const durationDays = Math.max(
      0,
      Math.round((endMs - borrowedMs) / 86400000),
    );

    return {
      id: r.id,
      borrowedAt: r.borrowed_at,
      dueAt: r.due_at,
      returnedAt: r.returned_at ?? null,
      durationDays,
      status: computeHistoryStatus(r.returned_at ?? null, r.due_at, nowMs),
      copy: copyRow ? { id: copyRow.id, barcode: copyRow.barcode } : null,
      book: bookRow
        ? {
            id: bookRow.id,
            title: bookRow.title,
            author: bookRow.author ?? null,
            isbn: bookRow.isbn ?? null,
            coverImageUrl: bookRow.cover_image_url ?? null,
          }
        : null,
      borrower: borrowerRow
        ? {
            id: borrowerRow.id ?? '',
            displayName: borrowerProfile?.display_name ?? null,
            studentId: borrowerProfile?.student_id ?? null,
          }
        : null,
      handler: handlerRow
        ? {
            id: handlerRow.id ?? '',
            displayName: handlerDisplayName,
            isSelfCheckout,
          }
        : { id: '', displayName: null, isSelfCheckout: true },
    };
  });

  // Client-side text-search filters (borrower / book / handler).
  const borrowerQ = filters.borrowerQ?.trim().toLowerCase();
  const bookQ = filters.bookQ?.trim().toLowerCase();
  const handlerQ = filters.handlerQ?.trim().toLowerCase();

  const filtered = mapped.filter((row) => {
    if (borrowerQ) {
      const hay = [
        row.borrower?.displayName,
        row.borrower?.studentId,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!hay.includes(borrowerQ)) return false;
    }
    if (bookQ) {
      const hay = [row.book?.title, row.book?.author, row.book?.isbn]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!hay.includes(bookQ)) return false;
    }
    if (handlerQ) {
      const hay = (row.handler?.displayName ?? '').toLowerCase();
      if (!hay.includes(handlerQ)) return false;
    }
    return true;
  });

  return {
    rows: filtered,
    total: count ?? filtered.length,
    active: filtered.filter((r) => r.status === 'borrowed').length,
    returned: filtered.filter((r) => r.status === 'returned').length,
    overdue: filtered.filter((r) => r.status === 'overdue').length,
    page,
    pageSize: effectivePageSize,
  };
}

// ============================================================
// v3.0.3 — ISBN lookup + barcode allocation (Add Books page)
// ============================================================

export async function findBookByIsbn(isbn: string): Promise<{
  id: string;
  title: string;
  author: string | null;
  copyCount: number;
} | null> {
  const supabase = getSupabaseServerClient();
  const cleaned = isbn.replace(/[^0-9X]/gi, '');
  if (!cleaned) return null;

  const { data, error } = await supabase
    .from('Books')
    .select('id, title, author, copies:Copies(id)')
    .eq('isbn', cleaned)
    .maybeSingle();

  if (error) {
    console.error('[findBookByIsbn]', error);
    throw error;
  }
  if (!data) return null;

  const copiesRaw = (data as { copies?: unknown }).copies;
  const copies = Array.isArray(copiesRaw) ? copiesRaw : [];
  return {
    id: (data as { id: string }).id,
    title: (data as { title: string }).title,
    author: (data as { author: string | null }).author ?? null,
    copyCount: copies.length,
  };
}

export async function getNextAvailableBarcodes(count: number): Promise<string[]> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from('Copies')
    .select('barcode')
    .like('barcode', 'SWI-%')
    .order('barcode', { ascending: false })
    .limit(50);

  if (error) throw error;
  const existing = ((data ?? []) as Array<{ barcode: string | null }>)
    .map((r) => r.barcode)
    .filter((b): b is string => Boolean(b));

  const { computeNextBarcodes } = await import('@/app/lib/barcode');
  return computeNextBarcodes(existing, count);
}

export type ManagedUserRow = {
  id: string;
  email: string;
  role: string | null;
  display_name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  profile?: Record<string, unknown> | null;
};

export async function fetchManagedUsers(): Promise<ManagedUserRow[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('Users')
    .select('*, profile:UserProfile(*)')
    .order('email');
  if (error) {
    console.error('[fetchManagedUsers] error', error);
    return [];
  }
  return (data ?? []) as ManagedUserRow[];
}

export async function fetchManagedUserById(id: string): Promise<ManagedUserRow | null> {
  if (!id) return null;
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('Users')
    .select('*, profile:UserProfile(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error('[fetchManagedUserById] error', error);
    return null;
  }
  return (data ?? null) as ManagedUserRow | null;
}

export type RecentLoanEntry = {
  id: string;
  borrowedAt: string;
  returnedAt: string | null;
  dueAt: string;
  renewedCount: number;
  action: 'borrowed' | 'returned' | 'renewed';
  book: {
    id: string;
    title: string;
    author: string | null;
    isbn: string | null;
    coverImageUrl: string | null;
  };
};

type RawRecentLoanRow = {
  id: string;
  borrowed_at: string;
  due_at: string;
  returned_at: string | null;
  renewed_count: number | null;
  copy?: {
    book?: {
      id: string;
      title: string;
      author: string | null;
      isbn: string | null;
      cover_image_url: string | null;
    } | null;
  } | null;
};

export async function fetchRecentLoansByUser(
  userId: string,
  maxResults = 5,
): Promise<RecentLoanEntry[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('Loans')
    .select(
      `
        id,
        borrowed_at,
        due_at,
        returned_at,
        renewed_count,
        copy:Copies(
          book:Books(
            id,
            title,
            author,
            isbn,
            cover_image_url
          )
        )
      `,
    )
    .eq('user_id', userId)
    .order('borrowed_at', { ascending: false })
    .limit(maxResults);

  if (error) {
    console.error('[fetchRecentLoansByUser] error', error);
    return [];
  }

  const rows = ((data ?? []) as unknown as RawRecentLoanRow[]).filter(
    (row) => Boolean(row.copy?.book?.id),
  );

  return rows.map((row) => {
    const renewedCount = row.renewed_count ?? 0;
    const action: RecentLoanEntry['action'] = row.returned_at
      ? 'returned'
      : renewedCount > 0
        ? 'renewed'
        : 'borrowed';
    return {
      id: row.id,
      borrowedAt: row.borrowed_at,
      returnedAt: row.returned_at ?? null,
      dueAt: row.due_at,
      renewedCount,
      action,
      book: {
        id: row.copy!.book!.id,
        title: row.copy!.book!.title ?? 'Unknown title',
        author: row.copy!.book!.author ?? null,
        isbn: row.copy!.book!.isbn ?? null,
        coverImageUrl: row.copy!.book!.cover_image_url ?? null,
      },
    };
  });
}

