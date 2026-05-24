'use client';

import clsx from 'clsx';
import BookList, { type ReadingAssistantBook } from '@/app/ui/dashboard/readingAssistant/bookList';

export type Role = 'user' | 'assistant';

type MessageBubbleProps = {
  role: Role;
  text: string;
  books?: ReadingAssistantBook[];
  loading?: boolean; // if true, render typing dots instead of text
};

export default function MessageBubble({ role, text, books, loading }: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <div className={clsx('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={clsx(
          'rounded-card px-4 py-3',
          isUser
            ? 'max-w-[80%] bg-surface-cream-strong text-ink dark:bg-dark-surface-strong dark:text-on-dark'
            : 'max-w-[88%] border border-hairline bg-canvas text-body dark:border-dark-hairline dark:bg-dark-canvas dark:text-on-dark-soft',
          books && books.length > 0 ? 'max-w-full' : '',
        )}
      >
        {loading ? (
          <div className="flex items-center gap-1.5 py-1.5" aria-label="Assistant is thinking">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-soft" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-soft [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-soft [animation-delay:300ms]" />
          </div>
        ) : (
          <p className="whitespace-pre-wrap font-sans text-body-md leading-relaxed">
            {text}
          </p>
        )}
        {!loading && books && books.length > 0 && <BookList books={books} />}
      </div>
    </div>
  );
}
