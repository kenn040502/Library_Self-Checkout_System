'use client';
import clsx from 'clsx';
import { Button } from '@/app/ui/button';

export default function IsbnLookupBox({
  value, onChange, onLookup, onScan, pending,
}: {
  value: string;
  onChange: (v: string) => void;
  onLookup: () => void;
  onScan: () => void;
  pending: boolean;
}) {
  const cleaned = value.replace(/[-\s]/g, '');
  const isbnValid = /^\d{10}$|^\d{13}$|^\d{9}X$|^\d{12}X$/.test(cleaned);
  const lookupDisabled = !isbnValid || pending;

  return (
    <div className="flex flex-wrap items-stretch gap-2">
      <input
        type="text"
        inputMode="numeric"
        required
        placeholder="Enter ISBN (10 or 13 digits)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={clsx(
          'h-10 min-w-[14rem] flex-1 rounded-btn border border-hairline bg-canvas px-3 font-sans text-body-md text-ink',
          'placeholder:text-muted-soft',
          'focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          'dark:border-dark-hairline dark:bg-dark-surface-soft dark:text-on-dark',
        )}
      />
      <Button
        type="button"
        onClick={onLookup}
        disabled={lookupDisabled}
        aria-disabled={lookupDisabled}
      >
        {pending ? 'Looking up…' : 'Lookup'}
      </Button>
      <button
        type="button"
        onClick={onScan}
        className={clsx(
          'h-10 rounded-btn border border-hairline bg-surface-card px-4 font-sans text-button text-ink transition-colors',
          'hover:bg-surface-cream-strong',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
          'dark:border-dark-hairline dark:bg-dark-surface-card dark:text-on-dark dark:hover:bg-dark-surface-strong',
          'dark:focus-visible:ring-offset-dark-canvas',
        )}
      >
        Scan ISBN
      </button>
    </div>
  );
}
