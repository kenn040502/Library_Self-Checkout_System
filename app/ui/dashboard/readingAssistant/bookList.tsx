'use client';

import Link from 'next/link';
import BookCover, { getBookGradient } from '@/app/ui/dashboard/primitives/BookCover';

export type BookLevel = 'beginner' | 'intermediate' | 'advanced';

export type ReadingAssistantBook = {
  id: string;
  title: string;
  author: string | null;
  coverImageUrl: string | null;
  classification: string | null;
  isbn: string | null;
  level?: BookLevel;
};

type BookListProps = {
  books: ReadingAssistantBook[];
};

const LEVEL_CONFIG: Record<BookLevel, { label: string; badge: string }> = {
  beginner:     { label: 'Beginner',     badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
  intermediate: { label: 'Intermediate', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
  advanced:     { label: 'Advanced',     badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
};

const LEVELS: BookLevel[] = ['beginner', 'intermediate', 'advanced'];

function BookRow({ book }: { book: ReadingAssistantBook }) {
  const catalogueHref = `/dashboard/book/${book.id}`;
  const borrowHref = `/dashboard/book/checkout?bookId=${encodeURIComponent(book.id)}`;

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-surface-cream-strong/40 dark:hover:bg-dark-surface-strong/40">
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
}

export default function BookList({ books }: BookListProps) {
  if (!books.length) return null;

  const hasAnyLevel = books.some((b) => b.level);

  if (!hasAnyLevel) {
    return (
      <div className="mt-3 divide-y divide-hairline-soft rounded-btn border border-hairline bg-surface-card dark:divide-dark-hairline dark:border-dark-hairline dark:bg-dark-surface-card">
        {books.map((book) => <BookRow key={book.id} book={book} />)}
      </div>
    );
  }

  const grouped = LEVELS.map((level) => ({
    level,
    books: books.filter((b) => b.level === level),
  })).filter((g) => g.books.length > 0);

  return (
    <div className="mt-3 space-y-3">
      {grouped.map(({ level, books: levelBooks }) => {
        const { label, badge } = LEVEL_CONFIG[level];
        return (
          <div key={level} className="overflow-hidden rounded-btn border border-hairline bg-surface-card dark:border-dark-hairline dark:bg-dark-surface-card">
            <div className="flex items-center gap-2 border-b border-hairline px-3 py-2 dark:border-dark-hairline">
              <span className={`rounded-full px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wide ${badge}`}>
                {label}
              </span>
            </div>
            <div className="divide-y divide-hairline-soft dark:divide-dark-hairline">
              {levelBooks.map((book) => <BookRow key={book.id} book={book} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
