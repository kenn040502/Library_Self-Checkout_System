'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MagnifyingGlassIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

export type PatronOption = {
  id: string;
  displayName: string | null;
  email: string | null;
  studentId: string | null;
  username: string | null;
  activeLoans: number;
  hasOverdue: boolean;
};

type PatronComboboxProps = {
  /** name of hidden input that receives the selected patron identifier (student_id or email or id) */
  name?: string;
  /** name of hidden input that receives the selected patron display name */
  nameOfName?: string;
  /** called when the user picks a patron — lets the parent fetch live loan-count etc. */
  onSelect?: (patron: PatronOption | null) => void;
  /** optional initial text shown in the input (e.g. deep-link from staff dashboard) */
  initialQuery?: string;
  placeholder?: string;
  required?: boolean;
};

export default function PatronCombobox({
  name = 'borrowerIdentifier',
  nameOfName = 'borrowerName',
  onSelect,
  initialQuery = '',
  placeholder = 'Type name, student ID, or email…',
  required = true,
}: PatronComboboxProps) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<PatronOption[]>([]);
  const [selected, setSelected] = useState<PatronOption | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const identifierForBackend = selected
    ? selected.studentId ?? selected.email ?? selected.id
    : '';

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const res = await fetch(`/api/patrons/search?q=${encodeURIComponent(q)}`, {
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error('search failed');
      const data = await res.json();
      const next: PatronOption[] = Array.isArray(data.results) ? data.results : [];
      setResults(next);
      setOpen(next.length > 0);
      setActiveIndex(next.length > 0 ? 0 : -1);
    } catch (err) {
      if ((err as { name?: string }).name === 'AbortError') return;
      console.warn('Patron search failed', err);
      setResults([]);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selected) return;
    const handle = setTimeout(() => {
      void runSearch(query);
    }, 200);
    return () => clearTimeout(handle);
  }, [query, selected, runSearch]);

  useEffect(() => {
    if (selected) return;
    setQuery(initialQuery);
  }, [initialQuery, selected]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const pick = (option: PatronOption) => {
    setSelected(option);
    setQuery(option.displayName ?? option.email ?? '');
    setOpen(false);
    setActiveIndex(-1);
    onSelect?.(option);
  };

  const clear = () => {
    setSelected(null);
    setQuery('');
    setResults([]);
    setOpen(false);
    onSelect?.(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && results[activeIndex]) {
        e.preventDefault();
        pick(results[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <label className="mb-1 block font-sans text-caption-uppercase font-semibold text-muted dark:text-on-dark-soft">
        Patron
      </label>
      <div
        className={clsx(
          'flex items-center gap-2 rounded-btn border bg-canvas dark:bg-dark-surface-soft px-3 h-10 transition focus-within:ring-2 focus-within:ring-primary/40 focus-within:ring-offset-2 focus-within:ring-offset-canvas dark:focus-within:ring-offset-dark-canvas',
          selected
            ? 'border-success/60'
            : 'border-hairline dark:border-dark-hairline',
        )}
      >
        <MagnifyingGlassIcon className="h-4 w-4 text-muted-soft dark:text-on-dark-soft" />
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          suppressHydrationWarning
          onChange={(e) => {
            if (selected) setSelected(null);
            setQuery(e.target.value);
          }}
          onFocus={() => {
            if (results.length > 0 && !selected) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="flex-1 border-0 bg-transparent font-sans text-body-md text-ink dark:text-on-dark placeholder:text-muted-soft dark:placeholder:text-on-dark-soft outline-none"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
        />
        {selected && (
          <button
            type="button"
            onClick={clear}
            suppressHydrationWarning
            className="rounded-pill border border-hairline dark:border-dark-hairline px-2 py-0.5 font-sans text-caption-uppercase font-semibold text-muted dark:text-on-dark-soft transition hover:text-primary dark:hover:text-dark-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            Clear
          </button>
        )}
        {loading && !selected && (
          <span className="font-mono text-code text-muted-soft dark:text-on-dark-soft">…</span>
        )}
      </div>

      {open && results.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-card border border-hairline dark:border-dark-hairline bg-surface-card dark:bg-dark-surface-card shadow-[0_4px_16px_rgba(20,20,19,0.08)]"
        >
          {results.map((option, i) => (
            <li
              key={option.id}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(option);
              }}
              onMouseEnter={() => setActiveIndex(i)}
              className={clsx(
                'flex cursor-pointer items-center gap-3 border-b border-hairline-soft px-3 py-2.5 last:border-b-0 dark:border-dark-hairline',
                i === activeIndex && 'bg-primary/8 dark:bg-dark-primary/15',
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-sans text-body-sm font-semibold text-ink dark:text-on-dark">
                  {option.displayName ?? option.email ?? 'Unnamed patron'}
                </p>
                <p className="truncate font-mono text-code text-muted dark:text-on-dark-soft">
                  {option.studentId ?? option.username ?? option.email ?? option.id}
                </p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-1.5 font-mono text-code text-muted dark:text-on-dark-soft">
                <span>
                  {option.activeLoans} loan{option.activeLoans === 1 ? '' : 's'}
                </span>
                {option.hasOverdue && (
                  <span className="flex items-center gap-0.5 text-primary dark:text-dark-primary">
                    <ExclamationTriangleIcon className="h-3 w-3" /> overdue
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <input type="hidden" name={name} value={identifierForBackend} required={required} />
      <input
        type="hidden"
        name={nameOfName}
        value={selected?.displayName ?? ''}
      />
      {selected && (
        <p className="mt-1.5 font-mono text-code text-muted dark:text-on-dark-soft">
          Selected · {selected.activeLoans}/5 active loans
          {selected.hasOverdue && <span className="ml-1 text-primary dark:text-dark-primary">· has overdue</span>}
        </p>
      )}
    </div>
  );
}
