'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';

type DueDatePickerProps = {
  name?: string;
  defaultDate: string;
  minOffsetDays?: number;
  maxOffsetDays?: number;
  presets?: number[];
};

const toIsoDate = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const addDays = (base: Date, days: number) => {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
};

export default function DueDatePicker({
  name = 'dueDate',
  defaultDate,
  minOffsetDays = 1,
  maxOffsetDays = 30,
  presets = [7, 14, 21],
}: DueDatePickerProps) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const minDate = toIsoDate(addDays(today, minOffsetDays));
  const maxDate = toIsoDate(addDays(today, maxOffsetDays));

  const [value, setValue] = useState<string>(() => {
    const fallback = toIsoDate(addDays(today, 14));
    return defaultDate || fallback;
  });

  const selectedOffset = useMemo(() => {
    const picked = new Date(value);
    if (Number.isNaN(picked.valueOf())) return null;
    const diff = Math.round((picked.getTime() - today.getTime()) / 86_400_000);
    return diff;
  }, [value, today]);

  const handlePreset = (days: number) => {
    setValue(toIsoDate(addDays(today, days)));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {presets.map((days) => {
          const active = selectedOffset === days;
          return (
            <button
              key={days}
              type="button"
              onClick={() => handlePreset(days)}
              suppressHydrationWarning
              className={clsx(
                'rounded-pill px-3 py-1.5 font-sans text-caption transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-dark-canvas',
                active
                  ? 'bg-surface-cream-strong text-ink dark:bg-dark-surface-strong dark:text-on-dark'
                  : 'bg-surface-card text-muted hover:bg-surface-cream-strong hover:text-ink dark:bg-dark-surface-card dark:text-on-dark-soft dark:hover:bg-dark-surface-strong dark:hover:text-on-dark',
              )}
            >
              {days}d
            </button>
          );
        })}
      </div>
      <label className="block">
        <span className="sr-only">Due date</span>
        <input
          type="date"
          name={name}
          value={value}
          min={minDate}
          max={maxDate}
          onChange={(e) => setValue(e.target.value)}
          suppressHydrationWarning
          className="h-10 w-full rounded-btn border border-hairline bg-canvas px-3 font-sans text-body-md text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-dark-hairline dark:bg-dark-surface-soft dark:text-on-dark"
          required
        />
      </label>
      {selectedOffset != null && selectedOffset >= minOffsetDays && selectedOffset <= maxOffsetDays && (
        <p className="font-mono text-caption text-muted dark:text-on-dark-soft">
          Returns in {selectedOffset} day{selectedOffset === 1 ? '' : 's'}
        </p>
      )}
    </div>
  );
}
