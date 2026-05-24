'use client';

import { useRef } from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';

type ComposerProps = {
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
};

export default function Composer({ value, onChange, onSubmit, disabled }: ComposerProps) {
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) onSubmit();
    }
  };

  const canSend = !disabled && value.trim().length > 0;

  return (
    <div className="mt-4 space-y-1.5">
      <p className="px-1 font-sans text-caption text-muted-soft dark:text-on-dark-soft">
        Powered by Gemini · Ask about loans, holds, books, fines.
      </p>
      <div className="flex items-end gap-2 rounded-card border border-hairline bg-canvas p-2 dark:border-dark-hairline dark:bg-dark-canvas">
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Type your question…"
          className="min-h-[40px] flex-1 resize-none border-0 bg-transparent px-3 py-2 font-sans text-body-md text-ink placeholder:text-muted-soft focus:outline-none focus:ring-0 dark:text-on-dark dark:placeholder:text-on-dark-soft"
          style={{ maxHeight: '160px' }}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={() => canSend && onSubmit()}
          disabled={!canSend}
          className="inline-flex h-10 items-center gap-1.5 rounded-btn bg-primary px-4 font-sans text-button text-on-primary transition hover:bg-primary-active disabled:cursor-not-allowed disabled:bg-primary-disabled disabled:text-muted dark:bg-dark-primary"
        >
          <span>Send</span>
          <PaperAirplaneIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
