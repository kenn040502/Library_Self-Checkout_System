'use client';

import Link from 'next/link';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
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
      {books.map((book) => (
        <Link
          key={book.id}
          href={`/dashboard/book/${book.id}`}
          className="group flex items-center gap-3 px-3 py-2.5 transition hover:bg-surface-cream-strong/40 dark:hover:bg-dark-surface-strong/40"
        >
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
          <ArrowRightIcon
            className="h-4 w-4 flex-shrink-0 text-muted-soft transition group-hover:translate-x-0.5 group-hover:text-primary dark:text-on-dark-soft dark:group-hover:text-dark-primary"
          />
        </Link>
      ))}
    </div>
  );
}
