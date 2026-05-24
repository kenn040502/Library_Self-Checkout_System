'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PlaceHoldButton from './placeHoldButton';
import ManageCopiesModal from './manageCopiesModal';
import ManageBookModal from './manageBookModal';
import { updateBook } from '@/app/lib/supabase/updates';
import { Pagination } from '@/app/ui/dashboard/pagination';
import BookCover, { getBookGradient } from '@/app/ui/dashboard/primitives/BookCover';
import BlurFade from '@/app/ui/magicUi/blurFade';
import type { CategoryKey } from '@/app/ui/dashboard/bookCategories';
import clsx from 'clsx';

// ---- Category filter ----
// Screenshot categories: All / Computing / Design / Psychology / Self-help / History
// Plus existing Business & Engineering kept so older data still filters.
type BookCategory =
  | 'Computing'
  | 'Design'
  | 'Business'
  | 'Engineering'
  | 'Psychology'
  | 'Self-help'
  | 'History';

const TAG_CATEGORY_MAP: Record<string, BookCategory> = {
  // Computing
  'machine learning': 'Computing', 'software development': 'Computing',
  'computer science': 'Computing', 'algorithms': 'Computing',
  'data science': 'Computing', 'programming': 'Computing',
  'web development': 'Computing', 'database management': 'Computing',
  'computer networks': 'Computing', 'network protocols': 'Computing',
  'software engineering': 'Computing', 'computer programming': 'Computing',
  'information security': 'Computing', 'distributed systems': 'Computing',
  'parallel computing': 'Computing', 'scripting': 'Computing',
  'software architecture': 'Computing', 'software design': 'Computing',
  'data visualization': 'Computing', 'information visualization': 'Computing',
  'computer graphics': 'Computing', 'internet technology': 'Computing',
  'information systems': 'Computing', 'intelligent systems': 'Computing',
  'predictive analytics': 'Computing', 'programming languages': 'Computing',
  'automation': 'Computing', 'pytorch': 'Computing',
  'information technology': 'Computing', 'cybersecurity': 'Computing',
  'artificial intelligence': 'Computing',

  // Business
  'organizational behavior': 'Business', 'business statistics': 'Business',
  'financial markets': 'Business', 'business economics': 'Business',
  'accounting': 'Business', 'business ethics': 'Business',
  'marketing management': 'Business', 'consumer behavior': 'Business',
  'managerial accounting': 'Business', 'strategic management': 'Business',
  'business administration': 'Business', 'global finance': 'Business',
  'global trade': 'Business', 'banking': 'Business',
  'project management': 'Business', 'product development': 'Business',
  'innovation': 'Business', 'presentation skills': 'Business',
  'portfolio development': 'Business', 'workshop': 'Business',
  'finance': 'Business', 'economics': 'Business', 'marketing': 'Business',

  // Design
  'ux design': 'Design', 'human computer interaction': 'Design',
  'user experience': 'Design', 'visual arts': 'Design',
  'web design': 'Design', 'interface design': 'Design',
  'drawing': 'Design', 'design principles': 'Design',
  'design thinking': 'Design', 'art and design': 'Design',
  'usability engineering': 'Design', 'user experience design': 'Design',
  'multimedia': 'Design', 'graphic design': 'Design',

  // Engineering
  'electronics': 'Engineering', 'circuit analysis': 'Engineering',
  'robotics': 'Engineering', 'control systems': 'Engineering',
  'materials science': 'Engineering', 'engineering mathematics': 'Engineering',
  'applied mathematics': 'Engineering', 'applied thermodynamics': 'Engineering',
  'engineering physics': 'Engineering', 'bioengineering': 'Engineering',
  'differential equations': 'Engineering', 'automatic control': 'Engineering',
  'applied statistics': 'Engineering', 'statistical models': 'Engineering',
  'mechatronics': 'Engineering', 'mechanical engineering': 'Engineering',
  'electrical engineering': 'Engineering', 'civil engineering': 'Engineering',

  // Psychology
  'psychology': 'Psychology', 'cognitive psychology': 'Psychology',
  'behavioural science': 'Psychology', 'behavioral science': 'Psychology',
  'neuroscience': 'Psychology', 'decision making': 'Psychology',
  'behavioral economics': 'Psychology',

  // Self-help
  'self-help': 'Self-help', 'self help': 'Self-help', 'productivity': 'Self-help',
  'habits': 'Self-help', 'personal development': 'Self-help',
  'leadership': 'Self-help', 'mindfulness': 'Self-help',

  // History
  'history': 'History', 'world history': 'History', 'historical fiction': 'History',
  'ancient history': 'History', 'modern history': 'History', 'biography': 'History',
};

const CATEGORY_KEY_TO_LABEL: Record<Exclude<CategoryKey, 'all'>, BookCategory> = {
  computing: 'Computing',
  design: 'Design',
  business: 'Business',
  engineering: 'Engineering',
  psychology: 'Psychology',
  'self-help': 'Self-help',
  history: 'History',
};

const getBookCategory = (book: UIBook): BookCategory | null => {
  if (book.category) {
    const direct = book.category.trim();
    if (direct) {
      const normalized = direct.toLowerCase();
      if (normalized === 'computer science' || normalized === 'computing') return 'Computing';
      if (normalized === 'art & design' || normalized === 'art and design' || normalized === 'design') return 'Design';
      if (normalized === 'business') return 'Business';
      if (normalized === 'engineering') return 'Engineering';
      if (normalized === 'psychology') return 'Psychology';
      if (normalized === 'self-help' || normalized === 'self help') return 'Self-help';
      if (normalized === 'history') return 'History';
    }
  }
  for (const tag of book.tags ?? []) {
    const cat = TAG_CATEGORY_MAP[tag.toLowerCase()];
    if (cat) return cat;
  }
  return null;
};

/** SIP-aligned item status (match your Supabase column) */
export type ItemStatus =
  | 'available'
  | 'checked_out'
  | 'on_hold'
  | 'reserved'
  | 'maintenance';

export type UIBook = {
  id: string;
  title: string;
  author: string;
  cover?: string | null;
  tags?: string[] | null;
  category?: string | null;
  classification?: string | null;
  isbn?: string | null;
  year?: string | number | null;
  publisher?: string | null;
  status?: ItemStatus | null;
  copies_available?: number | null;
  total_copies?: number | null;
  copies_on_loan?: number | null;
};

type Props = {
  books: UIBook[];
  variant?: 'grid' | 'list';
  patronId?: string;
  isStaff?: boolean;
  category?: CategoryKey;
  onDetailsClick?: (book: UIBook) => void;
  pageSize?: number;
  /** Search query — when provided, matched substrings in title/author are highlighted. */
  searchQuery?: string;
  /** When true, render an Edit affordance on each row that links to the admin edit page. */
  canEdit?: boolean;
};

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function highlightMatch(text: string | null | undefined, query: string | undefined): React.ReactNode {
  if (!text) return text ?? null;
  if (!query) return text;
  const trimmed = query.trim();
  if (!trimmed) return text;
  try {
    const re = new RegExp(`(${escapeRegex(trimmed)})`, 'ig');
    const parts = text.split(re);
    return parts.map((part, i) =>
      re.test(part) ? (
        <mark
          key={i}
          className="rounded bg-primary/15 px-0.5 text-primary dark:bg-dark-primary/20 dark:text-dark-primary"
        >
          {part}
        </mark>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      ),
    );
  } catch {
    return text;
  }
}

const STATUS_META: Record<
  ItemStatus,
  { label: string; canBorrow: boolean }
> = {
  available:   { label: 'Available',   canBorrow: true },
  checked_out: { label: 'Checked out', canBorrow: false },
  on_hold:     { label: 'On hold',     canBorrow: false },
  reserved:    { label: 'Reserved',    canBorrow: false },
  maintenance: { label: 'Maintenance', canBorrow: false },
};

function AvailabilityChip({
  available,
  total,
  status,
  variant = 'grid',
}: {
  available: number | null | undefined;
  total: number | null | undefined;
  status: ItemStatus;
  variant?: 'grid' | 'list';
}) {
  const avail = available ?? 0;
  const tot = total ?? 0;

  // Same color logic for both variants, so define className here to avoid duplication
  const statusClassName = clsx(
    "inline-flex rounded-pill px-2.5 py-0.5 text-[12px] font-semibold justify-center",
    variant === 'grid' ? "w-full" : "w-auto"
  );

  if (tot === 0) {
    return (
      <span className={clsx(statusClassName + " bg-surface-cream-strong dark:bg-dark-surface-strong text-muted dark:text-on-dark-soft")} >
        No copies
      </span>
    );
  }
  if (avail > 0) {
    return (
      <span className={clsx(statusClassName + " bg-success/15 text-success")} >
        {avail} available
      </span>
    );
  }
  // No copies free — show On loan (primary) per design
  if (status === 'on_hold') {
    return (
      <span className={clsx(statusClassName + " bg-accent-amber/15 text-accent-amber")} >
        On hold
      </span>
    );
  }
  return (
    <span className={clsx(statusClassName + " bg-primary/10 text-primary dark:bg-dark-primary/15 dark:text-dark-primary")} >
      On loan
    </span>
  );
}

export default function BookList({
  books,
  variant = 'grid',
  patronId,
  isStaff = false,
  category,
  pageSize,
  searchQuery,
  canEdit = false,
}: Props) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = React.useState(1);
  const [managingBookId, setManagingBookId] = React.useState<string | null>(null);
  const managingBook = managingBookId ? books.find((b) => b.id === managingBookId) : null;
  const [editingBookId, setEditingBookId] = React.useState<string | null>(null);
  const editingBook = editingBookId ? books.find((b) => b.id === editingBookId) : null;
  const [editForm, setEditForm] = React.useState({
    title: '',
    author: '',
    isbn: '',
    classification: '',
    publication_year: '',
    publisher: '',
    category: '',
  });
  const [editError, setEditError] = React.useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = React.useState(false);

  const openEdit = (book: UIBook) => {
    setEditError(null);
    setEditingBookId(book.id);
    setEditForm({
      title: book.title ?? '',
      author: book.author ?? '',
      isbn: book.isbn ?? '',
      classification: book.classification ?? '',
      publication_year: book.year ? String(book.year) : '',
      publisher: book.publisher ?? '',
      category: book.category ?? '',
    });
  };

  const closeEdit = () => {
    setEditingBookId(null);
    setEditError(null);
    setIsSavingEdit(false);
  };

  const saveEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingBook) return;
    setIsSavingEdit(true);
    setEditError(null);
    try {
      await updateBook({
        id: editingBook.id,
        title: editForm.title.trim(),
        author: editForm.author.trim() || null,
        isbn: editForm.isbn.trim() || null,
        classification: editForm.classification.trim() || null,
        publication_year: editForm.publication_year.trim() || null,
        publisher: editForm.publisher.trim() || null,
        category: editForm.category.trim() || null,
        tags: editingBook.tags ?? undefined,
      });
      closeEdit();
      router.refresh();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update book.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const filteredBooks = React.useMemo(() => {
    if (!category || category === 'all') return books;
    const target = CATEGORY_KEY_TO_LABEL[category];
    return books.filter((b) => getBookCategory(b) === target);
  }, [books, category]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [category]);

  const booksPerPage =
    pageSize ?? (variant === 'grid' ? 18 : 8);

  const totalPages = Math.ceil(filteredBooks.length / booksPerPage);

  const paginatedBooks = filteredBooks.slice(
    (currentPage - 1) * booksPerPage,
    currentPage * booksPerPage,
  );

  if (!books?.length) return <EmptyState />;

  if (variant === 'grid') {
    return (
      <>
        <BlurFade
          delay={0.2}
          yOffset={10}
          className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
        >
          {paginatedBooks.map((b, idx) => {
            const status = (b.status ?? 'available') as ItemStatus;
            const meta = STATUS_META[status] ?? STATUS_META.available;
            const canBorrow = meta.canBorrow && (b.copies_available ?? 1) > 0;
            const noCopies = (b.total_copies ?? 0) === 0;
            const hasCover = !!b.cover;

            return (
              <BlurFade key={b.id} delay={0.2 + idx * 0.03} yOffset={10}>
                <article className="group flex flex-col gap-3">
                  <Link
                    href={`/dashboard/book/${b.id}`}
                    aria-label={`View details for ${b.title}`}
                    className="block"
                  >
                    {hasCover ? (
                      <div className="relative overflow-hidden rounded-card shadow-sm transition duration-300 group-hover:-translate-y-0.5 group-hover:shadow-lg">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={b.cover!}
                          alt=""
                          className="aspect-[2/3] w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-card shadow-sm transition duration-300 group-hover:-translate-y-0.5 group-hover:shadow-lg">
                        <BookCover
                          gradient={getBookGradient(b.id)}
                          title={b.title}
                          author={b.author}
                          fill
                          radius={6}
                        />
                      </div>
                    )}
                  </Link>

                  <div className="min-w-0">
                    <h3 className="line-clamp-2 font-display text-[15px] font-semibold leading-tight tracking-tight text-ink dark:text-on-dark">
                      {highlightMatch(b.title, searchQuery)}
                    </h3>
                    <p className="mt-0.5 truncate font-display text-[12px] italic text-muted-soft dark:text-on-dark-soft">
                      {b.author ? highlightMatch(b.author, searchQuery) : 'Unknown author'}
                    </p>
                    
                    <div className="mt-2 flex flex-col items-start gap-2 sm:items-center">
                      {/* status row */}
                      <div className='w-full'>
                        <AvailabilityChip
                          available={b.copies_available}
                          total={b.total_copies}
                          status={status}
                          variant={'grid'}
                        />
                      </div>
                      
                      {/* buttons row */}
                      <div className="flex w-full gap-2 ">
                        {!canBorrow && !noCopies && (
                          <PlaceHoldButton bookId={b.id} patronId={patronId} bookTitle={b.title} />
                        )}
                      </div>

                      {isStaff && (
                        <div className="flex w-full gap-2 sm:items-center">
                        {canEdit && (
                          <Link
                            href={`/dashboard/admin/books/${b.id}/edit`}
                            title="Edit book"
                            className="
                                flex-1 rounded-pill border border-primary/30
                                px-4 py-2 text-[12px] text-center
                                font-semibold text-primary transition
                                hover:bg-primary/10
                              ">
                            Edit
                          </Link>)}
                          <button
                            type="button"
                            onClick={() => setManagingBookId(b.id)}
                            title="Manage copies"
                            suppressHydrationWarning
                            className="
                              flex-1 rounded-pill border border-hairline dark:border-dark-hairline
                              px-4 py-2 text-[12px]
                              font-semibold text-muted dark:text-on-dark-soft transition
                              hover:border-primary/30 hover:text-ink dark:hover:text-on-dark
                            ">
                            Copies
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              </BlurFade>
            );
          })}
        </BlurFade>

        {totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}

        {isStaff && (
          <ManageCopiesModal
            bookId={managingBookId ?? ''}
            bookTitle={managingBook?.title ?? ''}
            isOpen={managingBookId !== null}
            onClose={() => setManagingBookId(null)}
            onChanged={() => router.refresh()}
          />
        )}
      </>
    );
  }

  // List variant
  return (
    <>
      <div className="overflow-hidden rounded-card border border-hairline bg-canvas dark:border-dark-hairline dark:bg-dark-surface-card">
        <ul className="divide-y divide-hairline dark:divide-dark-hairline">
          {paginatedBooks.map((b, idx) => {
            const status = (b.status ?? 'available') as ItemStatus;
            const meta = STATUS_META[status] ?? STATUS_META.available;
            const canBorrow = meta.canBorrow && (b.copies_available ?? 1) > 0;
            const noCopies = (b.total_copies ?? 0) === 0;

            return (
              <BlurFade key={b.id} delay={0.15 + idx * 0.03} yOffset={8}>
                <li className="flex flex-col gap-3 px-4 py-3 transition hover:bg-surface-soft dark:hover:bg-dark-surface-soft sm:flex-row sm:items-center">
                  <Link
                    href={`/dashboard/book/${b.id}`}
                    aria-label={`View details for ${b.title}`}
                    className="flex min-w-0 flex-1 items-center gap-4 transition hover:opacity-80"
                  >
                    {b.cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={b.cover}
                        alt=""
                        className="h-16 w-12 flex-shrink-0 rounded object-cover ring-1 ring-hairline dark:ring-dark-hairline"
                      />
                    ) : (
                      <BookCover gradient={getBookGradient(b.id)} w={48} h={64} radius={3} />
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-display text-[15px] font-semibold tracking-tight text-ink dark:text-on-dark">
                        {highlightMatch(b.title, searchQuery)}
                      </h3>
                      <p className="truncate font-display text-[12px] italic text-muted-soft dark:text-on-dark-soft">
                        {b.author ? highlightMatch(b.author, searchQuery) : 'Unknown author'}
                        {b.year ? <span className="ml-2 font-mono not-italic text-muted-soft dark:text-on-dark-soft">· {b.year}</span> : null}
                      </p>
                    </div>
                  </Link>
                  <div className="flex w-full items-center gap-2 sm:w-auto">
                    <AvailabilityChip
                      available={b.copies_available}
                      total={b.total_copies}
                      status={status}
                      variant="list"
                    />

                    <div className="flex flex-1 items-center gap-2 sm:flex-none">
                      {!canBorrow && !noCopies && (
                        <PlaceHoldButton
                          bookId={b.id}
                          patronId={patronId}
                          bookTitle={b.title}
                        />
                      )}

                      {canBorrow && (
                        <Link
                          href={`/dashboard/book/checkout?bookId=${b.id}`}
                          className="
                            flex-1 rounded-pill bg-primary px-3 py-2
                            text-center text-[11px] font-semibold text-on-primary
                            transition hover:bg-primary-active
                            sm:flex-none sm:py-1
                          "
                        >
                          Borrow
                        </Link>
                      )}

                      {isStaff && (
                        <>
                          {canEdit && (
                            <Link
                              href={`/dashboard/admin/books/${b.id}/edit`}
                              className="
                                flex-1 rounded-pill border border-primary/30
                                px-3 py-2 text-center text-[11px]
                                font-semibold text-primary transition
                                hover:bg-primary/10
                                sm:flex-none sm:py-1
                              "
                            >
                              Edit
                            </Link>
                          )}

                          <button
                            type="button"
                            onClick={() => setManagingBookId(b.id)}
                            className="
                              flex-1 rounded-pill border border-hairline
                              dark:border-dark-hairline
                              px-3 py-2 text-[11px]
                              font-semibold text-muted
                              dark:text-on-dark-soft transition
                              hover:border-primary/30 hover:text-ink
                              dark:hover:text-on-dark
                              sm:flex-none sm:py-1
                            "
                          >
                            Copies
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              </BlurFade>
            );
          })}
        </ul>
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {isStaff && (
        <ManageCopiesModal
          bookId={managingBookId ?? ''}
          bookTitle={managingBook?.title ?? ''}
          isOpen={managingBookId !== null}
          onClose={() => setManagingBookId(null)}
          onChanged={() => router.refresh()}
        />
      )}

      {isStaff && (
        <ManageBookModal open={editingBookId !== null} onClose={closeEdit} title="Edit book" lockScroll={false}>
          <form className="space-y-3" onSubmit={saveEdit}>
            <div>
              <label className="block font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">Title</label>
              <input
                className="mt-1 w-full rounded-btn border border-hairline bg-canvas px-3 py-2 font-sans text-body-md text-ink placeholder:text-muted-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:border-dark-hairline dark:bg-dark-surface-soft dark:text-on-dark dark:placeholder:text-on-dark-soft dark:focus-visible:ring-offset-dark-canvas"
                value={editForm.title}
                onChange={(event) => setEditForm((prev) => ({ ...prev, title: event.target.value }))}
                required
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">Author</label>
                <input
                  className="mt-1 w-full rounded-btn border border-hairline bg-canvas px-3 py-2 font-sans text-body-md text-ink placeholder:text-muted-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:border-dark-hairline dark:bg-dark-surface-soft dark:text-on-dark dark:placeholder:text-on-dark-soft dark:focus-visible:ring-offset-dark-canvas"
                  value={editForm.author}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, author: event.target.value }))}
                />
              </div>
              <div>
                <label className="block font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">ISBN</label>
                <input
                  className="mt-1 w-full rounded-btn border border-hairline bg-canvas px-3 py-2 font-sans text-body-md text-ink placeholder:text-muted-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:border-dark-hairline dark:bg-dark-surface-soft dark:text-on-dark dark:placeholder:text-on-dark-soft dark:focus-visible:ring-offset-dark-canvas"
                  value={editForm.isbn}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, isbn: event.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">Call no.</label>
                <input
                  className="mt-1 w-full rounded-btn border border-hairline bg-canvas px-3 py-2 font-sans text-body-md text-ink placeholder:text-muted-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:border-dark-hairline dark:bg-dark-surface-soft dark:text-on-dark dark:placeholder:text-on-dark-soft dark:focus-visible:ring-offset-dark-canvas"
                  value={editForm.classification}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, classification: event.target.value }))}
                />
              </div>
              <div>
                <label className="block font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">Year</label>
                <input
                  className="mt-1 w-full rounded-btn border border-hairline bg-canvas px-3 py-2 font-sans text-body-md text-ink placeholder:text-muted-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:border-dark-hairline dark:bg-dark-surface-soft dark:text-on-dark dark:placeholder:text-on-dark-soft dark:focus-visible:ring-offset-dark-canvas"
                  value={editForm.publication_year}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, publication_year: event.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">Publisher</label>
                <input
                  className="mt-1 w-full rounded-btn border border-hairline bg-canvas px-3 py-2 font-sans text-body-md text-ink placeholder:text-muted-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:border-dark-hairline dark:bg-dark-surface-soft dark:text-on-dark dark:placeholder:text-on-dark-soft dark:focus-visible:ring-offset-dark-canvas"
                  value={editForm.publisher}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, publisher: event.target.value }))}
                />
              </div>
              <div>
                <label className="block font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">Category</label>
                <input
                  className="mt-1 w-full rounded-btn border border-hairline bg-canvas px-3 py-2 font-sans text-body-md text-ink placeholder:text-muted-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:border-dark-hairline dark:bg-dark-surface-soft dark:text-on-dark dark:placeholder:text-on-dark-soft dark:focus-visible:ring-offset-dark-canvas"
                  value={editForm.category}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, category: event.target.value }))}
                />
              </div>
            </div>

            {editError && (
              <p className="font-sans text-body-sm font-semibold text-primary dark:text-dark-primary">
                {editError}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeEdit}
                className="rounded-btn border border-hairline bg-surface-card px-4 py-2 font-sans text-button text-ink transition hover:bg-surface-cream-strong dark:border-dark-hairline dark:bg-dark-surface-card dark:text-on-dark dark:hover:bg-dark-surface-strong"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingEdit}
                className="rounded-btn bg-primary px-4 py-2 font-sans text-button text-on-primary transition hover:bg-primary-active disabled:cursor-not-allowed disabled:bg-primary-disabled disabled:text-muted dark:bg-dark-primary dark:hover:bg-primary-active"
              >
                {isSavingEdit ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </ManageBookModal>
      )}
    </>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-hairline bg-surface-soft px-6 py-14 text-center dark:border-dark-hairline dark:bg-dark-surface-soft">
      <p className="font-display text-display-sm tracking-tight text-muted dark:text-on-dark-soft">
        No books found
      </p>
      <p className="font-sans text-body-sm text-muted-soft dark:text-on-dark-soft">
        Try a different keyword or clear the filters.
      </p>
    </div>
  );
}
