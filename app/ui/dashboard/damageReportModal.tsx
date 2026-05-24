'use client';

import { useRef, useState } from 'react';
import { XMarkIcon, PhotoIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { uploadDamagePhotos } from '@/app/dashboard/damageActions';

export type DamageSeverity = 'damaged' | 'lost' | 'needs_inspection';

export type DamageSubmitPayload = {
  severity: DamageSeverity;
  notes: string;
  photoUrls: string[];
};

type DamageReportModalProps = {
  open: boolean;
  loanId: string | null;
  onClose: () => void;
  onSubmit: (payload: DamageSubmitPayload) => void;
};

const SEVERITY_OPTIONS: { value: DamageSeverity; label: string; hint: string }[] = [
  { value: 'damaged', label: 'Damaged', hint: 'Returned but needs repair' },
  { value: 'needs_inspection', label: 'Needs inspection', hint: "Unsure \u2014 flag for later review" },
  { value: 'lost', label: 'Lost', hint: 'Copy did not come back' },
];

const MAX_PHOTOS = 3;

const PRESET_NOTES: string[] = [
  'Water damage',
  'Torn pages',
  'Missing cover',
  'Highlighting / writing',
  'Loose binding',
  'Stained',
];

export default function DamageReportModal({ open, loanId, onClose, onSubmit }: DamageReportModalProps) {
  const [severity, setSeverity] = useState<DamageSeverity>('damaged');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!open) return null;

  const handleFilesChosen = (files: FileList | null) => {
    if (!files) return;
    const next = [...photos, ...Array.from(files)].slice(0, MAX_PHOTOS);
    setPhotos(next);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const appendPresetNote = (preset: string) => {
    setNotes((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return preset;
      if (trimmed.toLowerCase().includes(preset.toLowerCase())) return prev;
      const separator = trimmed.endsWith('.') || trimmed.endsWith(';') ? ' ' : '; ';
      const next = `${trimmed}${separator}${preset}`;
      return next.length > 500 ? next.slice(0, 500) : next;
    });
  };

  const handleSubmit = async () => {
    setError(null);
    if (!loanId) {
      setError('Missing loan reference.');
      return;
    }
    if (notes.length > 500) {
      setError('Notes must be 500 characters or fewer.');
      return;
    }
    setBusy(true);
    try {
      let photoUrls: string[] = [];
      if (photos.length > 0) {
        const fd = new FormData();
        fd.set('loanId', loanId);
        photos.forEach((p) => fd.append('photos', p));
        const result = await uploadDamagePhotos(fd);
        if (result.status !== 'success') {
          setError(result.message);
          setBusy(false);
          return;
        }
        photoUrls = result.urls;
      }
      onSubmit({ severity, notes: notes.trim(), photoUrls });
      // caller closes the modal; we reset state for next open
      setNotes('');
      setPhotos([]);
      setSeverity('damaged');
    } catch (err) {
      console.error('Damage submit failed', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="damage-report-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center sm:p-4"
    >
      <div
        className="absolute inset-0 bg-ink/50 dark:bg-dark-canvas/70 backdrop-blur-sm"
        onClick={() => !busy && onClose()}
      />
      <div className="relative w-full sm:max-w-lg rounded-t-[1.25rem] rounded-b-none sm:rounded-card border border-hairline dark:border-dark-hairline bg-surface-card dark:bg-dark-surface-card shadow-[0_-4px_24px_rgba(20,20,19,0.12)] sm:shadow-[0_4px_16px_rgba(20,20,19,0.08)] max-h-[92dvh] overflow-y-auto overscroll-contain">
        <div className="sticky top-0 z-10 bg-surface-card dark:bg-dark-surface-card px-5 pt-4 pb-3 border-b border-hairline dark:border-dark-hairline sm:hidden">
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-hairline dark:bg-dark-hairline" />
        </div>
        <div className="p-5 sm:p-6">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-pill bg-primary/10 dark:bg-dark-primary/15">
              <ExclamationTriangleIcon className="h-5 w-5 text-primary dark:text-dark-primary" />
            </div>
            <div>
              <h2
                id="damage-report-title"
                className="font-display text-display-sm text-ink dark:text-on-dark"
              >
                Report condition
              </h2>
              <p className="mt-0.5 font-sans text-body-sm text-muted dark:text-on-dark-soft">
                Capture any damage before marking the return complete.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="rounded-pill p-1 text-muted dark:text-on-dark-soft transition hover:bg-surface-cream-strong dark:hover:bg-dark-surface-strong hover:text-ink dark:hover:text-on-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <fieldset className="mb-4">
          <legend className="mb-2 font-sans text-caption-uppercase font-semibold text-muted dark:text-on-dark-soft">
            Severity
          </legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {SEVERITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSeverity(opt.value)}
                className={clsx(
                  'rounded-btn border px-3 py-2.5 text-left font-sans text-body-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                  severity === opt.value
                    ? 'border-primary bg-primary/8 text-primary dark:bg-dark-primary/15 dark:border-dark-primary dark:text-dark-primary'
                    : 'border-hairline dark:border-dark-hairline bg-surface-card dark:bg-dark-surface-card text-muted dark:text-on-dark-soft hover:border-primary/30',
                )}
                aria-pressed={severity === opt.value}
              >
                <p className="font-semibold">{opt.label}</p>
                <p className="mt-0.5 text-caption opacity-75">{opt.hint}</p>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mb-4">
          <span className="mb-1.5 block font-sans text-caption-uppercase font-semibold text-muted dark:text-on-dark-soft">
            Notes (optional)
          </span>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {PRESET_NOTES.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => appendPresetNote(preset)}
                disabled={busy}
                className="rounded-pill border border-hairline dark:border-dark-hairline bg-surface-card dark:bg-dark-surface-card px-2.5 py-1 font-sans text-caption font-medium text-muted dark:text-on-dark-soft transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary dark:hover:text-dark-primary disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                + {preset}
              </button>
            ))}
          </div>
          <textarea
            value={notes}
            maxLength={500}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="e.g. cover torn on spine, water damage on pages 40-60"
            className="w-full rounded-btn border border-hairline dark:border-dark-hairline bg-canvas dark:bg-dark-surface-soft px-3.5 py-2 font-sans text-body-md text-ink dark:text-on-dark placeholder:text-muted-soft dark:placeholder:text-on-dark-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-dark-canvas"
          />
          <p className="mt-1 text-right font-mono text-code text-muted-soft dark:text-on-dark-soft">
            {notes.length}/500
          </p>
        </div>

        <div className="mb-5">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="font-sans text-caption-uppercase font-semibold text-muted dark:text-on-dark-soft">
              Photos (optional, up to {MAX_PHOTOS})
            </span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={photos.length >= MAX_PHOTOS || busy}
              className="flex items-center gap-1.5 rounded-pill border border-hairline dark:border-dark-hairline bg-surface-card dark:bg-dark-surface-card px-3 py-1 font-sans text-caption font-semibold text-ink dark:text-on-dark transition hover:border-primary/30 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <PhotoIcon className="h-3.5 w-3.5" /> Add photo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => handleFilesChosen(e.target.files)}
              className="hidden"
            />
          </div>
          {photos.length === 0 ? (
            <p className="rounded-btn border border-dashed border-hairline dark:border-dark-hairline p-3 text-center font-mono text-code text-muted-soft dark:text-on-dark-soft">
              No photos attached.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {photos.map((file, idx) => (
                <li
                  key={`${file.name}-${idx}`}
                  className="flex items-center justify-between gap-3 rounded-btn border border-hairline dark:border-dark-hairline bg-surface-card dark:bg-dark-surface-card px-3 py-2 font-sans text-body-sm"
                >
                  <span className="truncate font-mono text-code text-muted dark:text-on-dark-soft">
                    {file.name} · {(file.size / 1024).toFixed(0)} KB
                  </span>
                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    className="rounded-pill border border-hairline dark:border-dark-hairline px-2 py-0.5 font-sans text-caption-uppercase font-semibold text-muted dark:text-on-dark-soft hover:text-primary dark:hover:text-dark-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && <p className="mb-3 font-sans text-body-sm font-semibold text-primary dark:text-dark-primary">{error}</p>}

        <div className="flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-btn border border-hairline dark:border-dark-hairline bg-surface-card dark:bg-dark-surface-card px-4 h-10 font-sans text-button text-ink dark:text-on-dark transition hover:bg-surface-cream-strong dark:hover:bg-dark-surface-strong disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-dark-canvas"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy}
            aria-disabled={busy}
            className="rounded-btn bg-primary hover:bg-primary-active px-4 h-10 font-sans text-button text-on-primary transition disabled:bg-primary-disabled disabled:text-muted disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-dark-canvas"
          >
            {busy ? 'Uploading\u2026' : 'Attach to return'}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
