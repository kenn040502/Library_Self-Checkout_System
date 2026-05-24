'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { ClipboardIcon, PencilIcon, ArrowUturnLeftIcon, CheckIcon } from '@heroicons/react/24/outline';

export type Role = 'user' | 'assistant';

type MessageBubbleProps = {
  role: Role;
  text: string;
  streaming?: boolean;
  basedOn?: string | null;
  onEdit?: () => void;
  onResend?: () => void;
};

export default function MessageBubble({ role, text, streaming, basedOn, onEdit, onResend }: MessageBubbleProps) {
  const isUser = role === 'user';
  const showThinking = !isUser && streaming && text.length === 0;
  const [copied, setCopied] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const hasContent = useMemo(
    () => text.trim().length > 0,
    [text],
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  return (
    <div className={clsx('group flex flex-col gap-1', isUser ? 'items-end' : 'items-start')} style={{ animation: 'bubbleIn 0.22s ease-out' }}>
      {/* Bubble */}
      <div
        className={clsx(
          'rounded-2xl px-4 py-3',
          isUser
            ? 'max-w-[80%] bg-red-500 text-white shadow-sm'
            : 'max-w-[88%] border border-hairline bg-white text-gray-800 shadow-sm dark:border-dark-hairline dark:bg-dark-canvas dark:text-on-dark-soft',
        )}
      >
        {showThinking ? (
          <div className="flex items-center gap-2 py-1.5" aria-label="Assistant is thinking">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-400" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-400 [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-400 [animation-delay:300ms]" />
            </span>
            <span className="font-sans text-body-sm text-gray-500">Thinking…</span>
          </div>
        ) : (
          <p className={clsx(
            'whitespace-pre-wrap font-sans text-body-md leading-relaxed',
            isUser ? 'font-bold text-white' : 'font-normal text-gray-800 dark:text-on-dark-soft',
          )}>
            {text}
            {!isUser && streaming && text.length > 0 && (
              <span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-gray-400 align-baseline" aria-hidden="true" />
            )}
          </p>
        )}
        {!showThinking && !isUser && basedOn && (
          <p className="mt-2 font-sans text-caption text-gray-400 dark:text-on-dark-soft">Based on: {basedOn}</p>
        )}
      </div>

      {/* Action buttons — user bubbles only, shown on hover */}
      {isUser && !showThinking && text.length > 0 && (
        <div className="flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <ActionBtn onClick={handleCopy} label={copied ? 'Copied!' : 'Copy'}>
            {copied ? <CheckIcon className="h-3.5 w-3.5 text-green-500" /> : <ClipboardIcon className="h-3.5 w-3.5" />}
          </ActionBtn>
          {onEdit && (
            <ActionBtn onClick={onEdit} label="Edit">
              <PencilIcon className="h-3.5 w-3.5" />
            </ActionBtn>
          )}
          {onResend && (
            <ActionBtn onClick={onResend} label="Resend">
              <ArrowUturnLeftIcon className="h-3.5 w-3.5" />
            </ActionBtn>
          )}
        </div>
      )}
    </div>
  );
}

function ActionBtn({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-1 font-sans text-[11px] text-gray-500 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700 dark:border-dark-hairline dark:bg-dark-canvas dark:text-on-dark-soft dark:hover:bg-dark-surface-strong"
    >
      {children}
      <span>{label}</span>
    </button>
  );
}
