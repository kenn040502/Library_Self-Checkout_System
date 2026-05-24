'use client';

import clsx from 'clsx';
import BookList, { type ReadingAssistantBook } from '@/app/ui/dashboard/readingAssistant/bookList';

export type Role = 'user' | 'assistant';

type MessageBubbleProps = {
  role: Role;
  text: string;
  books?: ReadingAssistantBook[];
  /** true while the assistant reply is still streaming in (or before the first token, when text is empty) */
  streaming?: boolean;
  /** FAQ section the answer cites, shown as a small caption under assistant text */
  basedOn?: string | null;
};

export default function MessageBubble({ role, text, books, streaming, basedOn }: MessageBubbleProps) {
  const isUser = role === 'user';
  const showThinking = !isUser && streaming && text.length === 0;

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
        {showThinking ? (
          <div className="flex items-center gap-2 py-1.5" aria-label="Assistant is thinking">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-soft" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-soft [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-soft [animation-delay:300ms]" />
            </span>
            <span className="font-sans text-body-sm text-muted dark:text-on-dark-soft">Thinking…</span>
          </div>
        ) : (
          <p className="whitespace-pre-wrap font-sans text-body-md leading-relaxed">
            {text}
            {!isUser && streaming && text.length > 0 && (
              <span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-muted-soft align-baseline" aria-hidden="true" />
            )}
          </p>
        )}
        {!showThinking && !isUser && basedOn && (
          <p className="mt-2 font-sans text-caption text-muted-soft dark:text-on-dark-soft">Based on: {basedOn}</p>
        )}
        {!showThinking && books && books.length > 0 && <BookList books={books} />}
      </div>
    </div>
  );
}
