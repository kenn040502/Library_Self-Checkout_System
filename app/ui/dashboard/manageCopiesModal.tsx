'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type CopyRow = {
  id: string;
  barcode: string;
  status: string;
  created_at: string | null;
};

const STATUS_STYLE: Record<string, { label: string; chip: string }> = {
  available:  { label: 'Available',   chip: 'bg-success/15 text-success' },
  on_loan:    { label: 'On loan',     chip: 'bg-warning/15 text-warning' },
  lost:       { label: 'Lost',        chip: 'bg-primary/15 text-primary dark:bg-dark-primary/20 dark:text-dark-primary' },
  damaged:    { label: 'Damaged',     chip: 'bg-primary/10 text-primary dark:bg-dark-primary/15 dark:text-dark-primary' },
  processing: { label: 'Processing',  chip: 'bg-accent-teal/15 text-accent-teal' },
  hold_shelf: { label: 'Hold shelf',  chip: 'bg-accent-amber/15 text-accent-amber' },
};

interface Props {
  bookId: string;
  bookTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onChanged?: () => void;
}

export default function ManageCopiesModal({ bookId, bookTitle, isOpen, onClose, onChanged }: Props) {
  const [copies, setCopies] = useState<CopyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [barcode, setBarcode] = useState('');
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setSuccess(null);
    setBarcode('');
    loadCopies();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, bookId]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 80);
  }, [isOpen]);

  const loadCopies = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/copies?bookId=${encodeURIComponent(bookId)}`);
      const data = await res.json();
      if (res.ok) setCopies(data.copies ?? []);
      else setError(data.error ?? 'Failed to load copies.');
    } catch {
      setError('Failed to load copies.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = barcode.trim();
    if (!trimmed) return;
    setError(null);
    setSuccess(null);
    setAdding(true);
    try {
      const res = await fetch('/api/copies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, barcode: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to add copy.');
      } else {
        setSuccess(`Copy "${trimmed}" added.`);
        setBarcode('');
        await loadCopies();
        onChanged?.();
        inputRef.current?.focus();
      }
    } catch {
      setError('Something went wrong.');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (copyId: string, copyBarcode: string) => {
    setError(null);
    setSuccess(null);
    setRemovingId(copyId);
    try {
      const res = await fetch('/api/copies', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ copyId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to remove copy.');
      } else {
        setSuccess(`Copy "${copyBarcode}" removed.`);
        await loadCopies();
        onChanged?.();
      }
    } catch {
      setError('Something went wrong.');
    } finally {
      setRemovingId(null);
    }
  };

  if (!isOpen) return null;

  const availableCount = copies.filter((c) => c.status === 'available').length;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-ink/50 dark:bg-dark-canvas/70" />

      <div
        className="relative w-full max-w-lg rounded-card bg-white dark:bg-dark-surface-card border border-hairline dark:border-dark-hairline shadow-[0_4px_16px_rgba(20,20,19,0.08)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-hairline dark:border-dark-hairline px-6 py-4">
          <div>
            <h2 className="font-display text-display-sm text-ink dark:text-on-dark">Manage Copies</h2>
            <p className="mt-0.5 line-clamp-1 font-sans text-body-sm text-muted dark:text-on-dark-soft">{bookTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-btn p-1 text-muted-soft hover:bg-surface-cream-strong dark:hover:bg-dark-surface-strong hover:text-ink dark:hover:text-on-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-dark-canvas"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] space-y-4 overflow-y-auto px-6 py-4">

          {/* Summary pill */}
          {!loading && (
            <p className="font-sans text-body-sm text-muted dark:text-on-dark-soft">
              <span className="font-semibold text-success">{availableCount}</span> available
              {' · '}
              <span className="font-semibold text-ink dark:text-on-dark">{copies.length}</span> total
            </p>
          )}

          {/* Copies table */}
          {loading ? (
            <div className="flex justify-center py-8">
              <svg className="h-5 w-5 animate-spin text-muted-soft" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
          ) : copies.length === 0 ? (
            <p className="py-6 text-center font-sans text-body-sm text-muted-soft dark:text-on-dark-soft">
              No copies yet. Add one below.
            </p>
          ) : (
            <div className="overflow-hidden rounded-card border border-hairline dark:border-dark-hairline">
              <table className="min-w-full text-sm">
                <thead className="bg-surface-cream-strong dark:bg-dark-surface-strong">
                  <tr className="text-left font-sans text-caption-uppercase text-ink dark:text-on-dark">
                    <th className="px-3 py-2">Barcode</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline-soft dark:divide-dark-hairline">
                  {copies.map((copy) => {
                    const s = STATUS_STYLE[copy.status] ?? STATUS_STYLE.available;
                    const canRemove = copy.status !== 'on_loan';
                    return (
                      <tr key={copy.id} className="bg-surface-card dark:bg-dark-surface-card">
                        <td className="px-3 py-2.5 font-mono text-code text-muted dark:text-on-dark-soft">
                          {copy.barcode}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex rounded-pill px-2 py-0.5 text-[10px] font-semibold ${s.chip}`}>
                            {s.label}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            onClick={() => handleRemove(copy.id, copy.barcode)}
                            disabled={!canRemove || removingId === copy.id}
                            title={!canRemove ? 'Cannot remove — copy is currently on loan' : 'Remove this copy'}
                            className="rounded-btn border border-primary/30 px-2.5 py-1 text-[10px] font-medium text-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-40 dark:border-dark-primary/30 dark:text-dark-primary dark:hover:bg-dark-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-dark-canvas"
                          >
                            {removingId === copy.id ? '…' : 'Remove'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Feedback */}
          {error && (
            <p className="rounded-btn bg-primary/10 px-3 py-2 font-sans text-body-sm text-primary dark:bg-dark-primary/15 dark:text-dark-primary">
              {error}
            </p>
          )}
          {success && (
            <p className="rounded-btn bg-success/15 px-3 py-2 font-sans text-body-sm text-success">
              {success}
            </p>
          )}

          {/* Add copy form */}
          <form onSubmit={handleAdd} className="flex gap-2 pt-1">
            <input
              ref={inputRef}
              type="text"
              value={barcode}
              onChange={(e) => { setBarcode(e.target.value); setError(null); setSuccess(null); }}
              placeholder="Enter barcode"
              className="flex-1 rounded-btn border border-hairline dark:border-dark-hairline bg-canvas dark:bg-dark-surface-soft px-3.5 h-10 font-sans text-body-md text-ink dark:text-on-dark placeholder:text-muted-soft dark:placeholder:text-on-dark-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-dark-canvas"
            />
            <button
              type="submit"
              disabled={adding || !barcode.trim()}
              className="rounded-btn bg-primary hover:bg-primary-active px-5 h-10 font-sans text-button text-on-primary disabled:bg-primary-disabled disabled:text-muted disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-dark-canvas"
            >
              {adding ? 'Adding…' : 'Add copy'}
            </button>
          </form>
        </div>
      </div>
    </div>,
    document.body,
  );
}
