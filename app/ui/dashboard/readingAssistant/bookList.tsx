'use client';

import Link from 'next/link';
import BookCover, { getBookGradient } from '@/app/ui/dashboard/primitives/BookCover';

export type ReadingAssistantBook = {
  id: string;
  title: string;
  author: string | null;
  coverImageUrl: string | null;
  classification: string | null;
  isbn: string | null;
};

type BookListProps = {
  books: ReadingAssistantBook[];
};

export default function BookList({ books }: BookListProps) {
  if (!books.length) return null;

  return (
    <div className="mt-3 divide-y divide-hairline-soft rounded-btn border border-hairline bg-surface-card dark:divide-dark-hairline dark:border-dark-hairline dark:bg-dark-surface-card">
      {books.map((book) => {
        const catalogueHref = `/dashboard/book/${book.id}`;
        const borrowHref = `/dashboard/book/checkout?bookId=${encodeURIComponent(book.id)}`;

        return (
          <div
            key={book.id}
            className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-surface-cream-strong/40 dark:hover:bg-dark-surface-strong/40"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {book.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={book.coverImageUrl}
                  alt=""
                  className="h-12 w-8 flex-shrink-0 rounded-sm object-cover ring-1 ring-hairline dark:ring-dark-hairline"
                  loading="lazy"
                />
              ) : (
                <BookCover gradient={getBookGradient(book.title ?? book.id)} w={32} h={46} radius={3} />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-title-sm tracking-tight text-ink dark:text-on-dark">
                  {book.title}
                </p>
                <p className="truncate font-display text-caption italic text-muted dark:text-on-dark-soft">
                  {book.author ?? 'Unknown author'}
                  {book.classification ? ` · ${book.classification}` : ''}
                </p>
              </div>
            </div>

            <div className="flex flex-shrink-0 items-center gap-2">
              <Link
                href={catalogueHref}
                className="inline-flex h-7 items-center justify-center rounded-btn border border-hairline bg-surface-card px-2 font-sans text-[10px] font-semibold uppercase tracking-wide text-ink transition hover:bg-surface-cream-strong dark:border-dark-hairline dark:bg-dark-surface-card dark:text-on-dark dark:hover:bg-dark-surface-strong"
              >
                Browse
              </Link>
              <Link
                href={borrowHref}
                className="inline-flex h-7 items-center justify-center rounded-btn bg-primary px-2 font-sans text-[10px] font-semibold uppercase tracking-wide text-on-primary transition hover:bg-primary/90"
              >
                Borrow
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
