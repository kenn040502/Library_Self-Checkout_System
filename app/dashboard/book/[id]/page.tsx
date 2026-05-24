import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon, QrCodeIcon, BookmarkIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import { getDashboardSession } from '@/app/lib/auth/session';
import { fetchBookById } from '@/app/lib/supabase/queries';
import AdminShell from '@/app/ui/dashboard/adminShell';
import BookCover, { getBookGradient } from '@/app/ui/dashboard/primitives/BookCover';
import PlaceHoldButton from '@/app/ui/dashboard/placeHoldButton';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BookDetailPage({ params }: PageProps) {
  const { user } = await getDashboardSession();
  if (!user) redirect('/login');

  const { id } = await params;
  const book = await fetchBookById(id);
  if (!book) notFound();

  const available = book.availableCopies ?? 0;
  const total = book.totalCopies ?? book.copies.length;
  const onLoan = (book.copies ?? []).filter((c) => c.status === 'on_loan').length;
  const canBorrow = available > 0;

  const tags = book.tags ?? [];
  const canEdit = user.role === 'staff' || user.role === 'admin';

  return (
    <>
      <title>{`${book.title} | Swinburne Library`}</title>
      <AdminShell
        titleSubtitle="Book detail"
        title={book.title}
        description={book.author ? `by ${book.author}` : undefined}
        primaryAction={
          <div className="flex items-center gap-2">
            {canEdit && (
              <Link
                href={`/dashboard/admin/books/${book.id}/edit`}
                className="inline-flex items-center gap-1.5 rounded-btn bg-primary hover:bg-primary-active px-3.5 py-2.5 font-sans text-button text-on-primary transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-dark-canvas"
              >
                <PencilSquareIcon className="h-4 w-4" />
                Edit
              </Link>
            )}
            <Link
              href="/dashboard/book/items"
              className="inline-flex items-center gap-1.5 rounded-btn border border-hairline dark:border-dark-hairline bg-surface-card dark:bg-dark-surface-card px-3.5 py-2.5 font-sans text-button text-ink/80 dark:text-on-dark/80 transition hover:border-primary/30 hover:text-ink dark:hover:text-on-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-dark-canvas"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Back to catalogue
            </Link>
          </div>
        }
      >
        <div className="grid gap-8 md:grid-cols-[260px,1fr]">
          {/* Cover column */}
          <div>
            {book.coverImageUrl ? (
              <div className="overflow-hidden rounded-xl shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={book.coverImageUrl}
                  alt={`Cover of ${book.title}`}
                  className="aspect-[2/3] w-full object-cover"
                />
              </div>
            ) : (
              <BookCover
                gradient={getBookGradient(book.id)}
                title={book.title}
                author={book.author ?? 'Unknown'}
                w={260}
                h={372}
                radius={12}
              />
            )}
          </div>

          {/* Details column */}
          <div className="flex flex-col gap-5">
            {/* Availability + actions */}
            <div className="rounded-card border border-hairline dark:border-dark-hairline bg-surface-card dark:bg-dark-surface-card p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">
                    Availability
                  </p>
                  <p className="mt-1 font-display text-display-sm text-ink dark:text-on-dark">
                    {available} of {total} available
                  </p>
                  {onLoan > 0 && (
                    <p className="mt-0.5 font-sans text-body-sm text-muted-soft dark:text-on-dark-soft">
                      {onLoan} on loan
                    </p>
                  )}
                </div>
                <span
                  className={
                    canBorrow
                      ? 'rounded-pill bg-success/15 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-success'
                      : 'rounded-pill bg-primary/15 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-primary dark:bg-dark-primary/20 dark:text-dark-primary'
                  }
                >
                  {canBorrow ? 'Available' : 'On loan'}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {canBorrow ? (
                  <Link
                    href={`/dashboard/book/checkout?bookId=${book.id}`}
                    className="inline-flex items-center gap-1.5 rounded-btn bg-primary hover:bg-primary-active px-4 py-2.5 font-sans text-button text-on-primary transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-dark-canvas"
                  >
                    <QrCodeIcon className="h-4 w-4" />
                    Borrow this book
                  </Link>
                ) : (
                  <PlaceHoldButton bookId={book.id} patronId={user.id} bookTitle={book.title} />
                )}
                <Link
                  href="/dashboard/book/items"
                  className="inline-flex items-center gap-1.5 rounded-btn border border-hairline dark:border-dark-hairline bg-surface-card dark:bg-dark-surface-card px-3.5 py-2.5 font-sans text-button text-ink/80 dark:text-on-dark/80 transition hover:border-primary/30 hover:text-ink dark:hover:text-on-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-dark-canvas"
                >
                  <BookmarkIcon className="h-4 w-4" />
                  Browse more
                </Link>
              </div>
            </div>

            {/* Metadata */}
            <dl className="grid gap-x-6 gap-y-3 rounded-card border border-hairline dark:border-dark-hairline bg-surface-card dark:bg-dark-surface-card p-5 font-mono text-code sm:grid-cols-2">
              {book.isbn && (
                <div>
                  <dt className="font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">
                    ISBN
                  </dt>
                  <dd className="mt-0.5 text-ink dark:text-on-dark">{book.isbn}</dd>
                </div>
              )}
              {book.classification && (
                <div>
                  <dt className="font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">
                    Call number
                  </dt>
                  <dd className="mt-0.5 text-ink dark:text-on-dark">
                    {book.classification}
                  </dd>
                </div>
              )}
              {book.publisher && (
                <div>
                  <dt className="font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">
                    Publisher
                  </dt>
                  <dd className="mt-0.5 text-ink dark:text-on-dark">
                    {book.publisher}
                  </dd>
                </div>
              )}
              {book.publicationYear && (
                <div>
                  <dt className="font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">
                    Year
                  </dt>
                  <dd className="mt-0.5 text-ink dark:text-on-dark">
                    {book.publicationYear}
                  </dd>
                </div>
              )}
              {book.category && (
                <div>
                  <dt className="font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">
                    Category
                  </dt>
                  <dd className="mt-0.5 text-ink dark:text-on-dark">
                    {book.category}
                  </dd>
                </div>
              )}
            </dl>

            {/* Tags */}
            {tags.length > 0 && (
              <div>
                <p className="mb-2 font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">
                  Tags
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-pill bg-surface-cream-strong dark:bg-dark-surface-strong px-2.5 py-0.5 font-sans text-body-sm font-medium text-ink/75 dark:text-on-dark/75"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Copies (staff/admin only) */}
            {(user.role === 'staff' || user.role === 'admin') && book.copies.length > 0 && (
              <div className="rounded-card border border-hairline dark:border-dark-hairline bg-surface-card dark:bg-dark-surface-card p-5">
                <p className="mb-3 font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">
                  Copies ({book.copies.length})
                </p>
                <ul className="space-y-1.5">
                  {book.copies.map((copy) => (
                    <li
                      key={copy.id}
                      className="flex items-center justify-between gap-3 rounded-btn border border-hairline dark:border-dark-hairline px-3 py-2 font-sans text-body-sm"
                    >
                      <span className="font-mono text-code text-ink/75 dark:text-on-dark/75">
                        {copy.barcode}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted dark:text-on-dark-soft">
                        {copy.status.replace('_', ' ')}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </AdminShell>
    </>
  );
}
