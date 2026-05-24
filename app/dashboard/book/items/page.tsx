import { redirect } from 'next/navigation';
import BookList from '@/app/ui/dashboard/bookList';
import BookItemsFilter from '@/app/ui/dashboard/bookItemsFilter';
import { CATEGORY_OPTIONS, type CategoryKey } from '@/app/ui/dashboard/bookCategories';
import { fetchBooks } from '@/app/lib/supabase/queries';
import { getDashboardSession } from '@/app/lib/auth/session';

export type ItemStatus =
  | 'available'
  | 'checked_out'
  | 'on_hold'
  | 'reserved'
  | 'maintenance';

type ViewMode = 'grid' | 'list';
type SortField = 'title' | 'author' | 'year' | 'created_at';
type SortOrder = 'asc' | 'desc';

function isItemStatus(x: unknown): x is ItemStatus {
  return (
    x === 'available' ||
    x === 'checked_out' ||
    x === 'on_hold' ||
    x === 'reserved' ||
    x === 'maintenance'
  );
}

const CATEGORY_KEYS = new Set(CATEGORY_OPTIONS.map((c) => c.key));
const isCategoryKey = (x: unknown): x is CategoryKey =>
  typeof x === 'string' && CATEGORY_KEYS.has(x as CategoryKey);

function toUIBook(db: any) {
  const available = db.availableCopies ?? db.available_copies ?? 0;
  const total = db.totalCopies ?? db.total_copies ?? db.copies?.length ?? 0;
  const onLoan = (db.copies ?? []).filter((c: any) => c.status === 'on_loan').length;
  const derivedStatus: ItemStatus =
    available > 0 ? 'available' : onLoan > 0 ? 'checked_out' : 'maintenance';

  return {
    id: db.id,
    title: db.title ?? 'Untitled',
    author: db.author ?? 'Unknown',
    cover: db.coverImageUrl ?? db.cover_image_url ?? null,
    tags: db.tags ?? null,
    category: db.category ?? null,
    classification: db.classification ?? null,
    isbn: db.isbn ?? null,
    year: db.publicationYear ?? db.publication_year ?? db.year ?? null,
    publisher: db.publisher ?? null,
    status: isItemStatus(db.status) ? (db.status as ItemStatus) : derivedStatus,
    copies_available: available,
    total_copies: total,
    copies_on_loan: onLoan,
  };
}

export default async function BookItemsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[]>>;
}) {
  const { user } = await getDashboardSession();
  if (!user) redirect('/login');
  const patronId = user.id;

  const params = searchParams ? await searchParams : undefined;

  const qp = (key: string) => {
    const v = params?.[key];
    return Array.isArray(v) ? v[0] : v;
  };

  const q = (qp('q') ?? '').trim();
  const rawStatus = (qp('status') ?? '').trim();
  const statusFilter: ItemStatus | undefined = isItemStatus(rawStatus) ? rawStatus : undefined;
  const sort = (qp('sort') as SortField) || 'title';
  const order: SortOrder = (qp('order') as SortOrder) === 'desc' ? 'desc' : 'asc';
  const view: ViewMode = (qp('view') as ViewMode) === 'list' ? 'list' : 'grid';
  const rawCategory = qp('category');
  const category: CategoryKey = isCategoryKey(rawCategory) ? rawCategory : 'all';

  const dbBooks = await fetchBooks(q);
  let books = (dbBooks ?? []).map(toUIBook);

  if (statusFilter) {
    books = books.filter((b) => b.status === statusFilter);
  }

  const cmp = (a: any, b: any) => {
    const A = (a ?? '').toString().toLowerCase();
    const B = (b ?? '').toString().toLowerCase();
    if (A < B) return order === 'asc' ? -1 : 1;
    if (A > B) return order === 'asc' ? 1 : -1;
    return 0;
  };
  books.sort((a, b) => {
    if (sort === 'title') return cmp(a.title, b.title);
    if (sort === 'author') return cmp(a.author, b.author);
    if (sort === 'year') return cmp(a.year, b.year);
    if (sort === 'created_at') return cmp((a as any).created_at, (b as any).created_at);
    return 0;
  });

  const isStaff = user.role !== 'user';
  return (
    <>
      <title>Book Catalogue | Dashboard</title>

      <div className="flex flex-col gap-6">
        {/* ── Filter bar ── */}
        <BookItemsFilter
          action="/dashboard/book/items"
          defaults={{
            q,
            status: statusFilter,
            sort,
            order,
            view,
            category,
          }}
        />

        {/* ── Result count ── */}
        {q && (
          <p className="-mt-2 font-mono text-code text-muted-soft dark:text-on-dark-soft">
            {books.length === 0
              ? `No results for "${q}"`
              : `${books.length} result${books.length === 1 ? '' : 's'} for "${q}"`}
          </p>
        )}

        {/* ── Book list ── */}
        <BookList
          books={books}
          variant={view}
          patronId={patronId}
          isStaff={isStaff}
          category={category}
          searchQuery={q}
          canEdit={isStaff}
        />
      </div>
    </>
  );
}
