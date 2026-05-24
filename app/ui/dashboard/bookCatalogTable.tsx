'use client';

import React from 'react';
import ManageBookModal from './manageBookModal';

// ---- Category mapping ----
type BookCategory = 'Computer Science' | 'Business' | 'Art & Design' | 'Engineering';

const TAG_CATEGORY_MAP: Record<string, BookCategory> = {
  // Computer Science
  'machine learning': 'Computer Science', 'software development': 'Computer Science',
  'computer science': 'Computer Science', 'algorithms': 'Computer Science',
  'data science': 'Computer Science', 'programming': 'Computer Science',
  'web development': 'Computer Science', 'database management': 'Computer Science',
  'computer networks': 'Computer Science', 'network protocols': 'Computer Science',
  'software engineering': 'Computer Science', 'computer programming': 'Computer Science',
  'information security': 'Computer Science', 'distributed systems': 'Computer Science',
  'parallel computing': 'Computer Science', 'scripting': 'Computer Science',
  'software architecture': 'Computer Science', 'software design': 'Computer Science',
  'data visualization': 'Computer Science', 'information visualization': 'Computer Science',
  'computer graphics': 'Computer Science', 'internet technology': 'Computer Science',
  'information systems': 'Computer Science', 'intelligent systems': 'Computer Science',
  'predictive analytics': 'Computer Science', 'programming languages': 'Computer Science',
  'automation': 'Computer Science', 'pytorch': 'Computer Science',
  'information technology': 'Computer Science', 'cybersecurity': 'Computer Science',
  'artificial intelligence': 'Computer Science',
  // Business
  'organizational behavior': 'Business', 'business statistics': 'Business',
  'financial markets': 'Business', 'business economics': 'Business',
  'accounting': 'Business', 'business ethics': 'Business',
  'marketing management': 'Business', 'consumer behavior': 'Business',
  'managerial accounting': 'Business', 'strategic management': 'Business',
  'business administration': 'Business', 'global finance': 'Business',
  'global trade': 'Business', 'banking': 'Business',
  'project management': 'Business', 'product development': 'Business',
  'innovation': 'Business', 'presentation skills': 'Business',
  'portfolio development': 'Business', 'workshop': 'Business',
  'finance': 'Business', 'economics': 'Business', 'marketing': 'Business',
  // Art & Design
  'ux design': 'Art & Design', 'human computer interaction': 'Art & Design',
  'user experience': 'Art & Design', 'visual arts': 'Art & Design',
  'web design': 'Art & Design', 'interface design': 'Art & Design',
  'drawing': 'Art & Design', 'design principles': 'Art & Design',
  'design thinking': 'Art & Design', 'art and design': 'Art & Design',
  'usability engineering': 'Art & Design', 'user experience design': 'Art & Design',
  'multimedia': 'Art & Design', 'graphic design': 'Art & Design',
  // Engineering
  'electronics': 'Engineering', 'circuit analysis': 'Engineering',
  'robotics': 'Engineering', 'control systems': 'Engineering',
  'materials science': 'Engineering', 'engineering mathematics': 'Engineering',
  'applied mathematics': 'Engineering', 'applied thermodynamics': 'Engineering',
  'engineering physics': 'Engineering', 'bioengineering': 'Engineering',
  'differential equations': 'Engineering', 'automatic control': 'Engineering',
  'applied statistics': 'Engineering', 'statistical models': 'Engineering',
  'mechatronics': 'Engineering', 'mechanical engineering': 'Engineering',
  'electrical engineering': 'Engineering', 'civil engineering': 'Engineering',
};

const CATEGORIES: BookCategory[] = ['Computer Science', 'Business', 'Art & Design', 'Engineering'];

const getBookCategory = (tags?: string[] | null): BookCategory | null => {
  if (!tags?.length) return null;
  for (const tag of tags) {
    const category = TAG_CATEGORY_MAP[tag.toLowerCase()];
    if (category) return category;
  }
  return null;
};
import { updateBook, deleteBook, type ItemStatus } from '@/app/lib/supabase/updates';
import type { CopyStatus } from '@/app/lib/supabase/types';
import { Pagination } from '@/app/ui/dashboard/pagination';

export type CatalogBook = {
  id: string;
  title: string | null;
  author: string | null;
  isbn?: string | null;
  classification?: string | null;
  publication_year?: string | number | null;
  publisher?: string | null;
  category?: string | null;
  tags?: string[] | null;
  /** SIP-aligned status */
  status?: ItemStatus | null; // 'available' | 'checked_out' | 'borrowed' | 'reserved' | ...
  /** convenience cache; derived from status when saving */
  available?: boolean | null;
  cover?: string | null;
  copies_available?: number | null;
  total_copies?: number | null;
  sip_status?: CopyStatus | null;
};

/* -------------------- Main component -------------------- */

export default function BookCatalogTable({ books }: { books: CatalogBook[] }) {
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState<CatalogBook | null>(null);
  const [sortKey, setSortKey] = React.useState<
    | 'title'
    | 'author'
    | 'isbn'
    | 'classification'
    | 'publication_year'
    | 'publisher'
    | 'status'
    | 'sip_status'
  >('title');
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('asc');

  // Local sort (client-side). You can move this server-side later if needed.
  const sorted = React.useMemo(() => {
    const key = sortKey;
    const dir = sortDir === 'asc' ? 1 : -1;
    const clone = [...books];
    clone.sort((a, b) => {
      const A = (a as any)?.[key] ?? '';
      const B = (b as any)?.[key] ?? '';
      const aS = String(A).toLowerCase();
      const bS = String(B).toLowerCase();
      if (aS < bS) return -1 * dir;
      if (aS > bS) return 1 * dir;
      return 0;
    });
    return clone;
  }, [books, sortKey, sortDir]);

  const [selectedCategory, setSelectedCategory] = React.useState<BookCategory | null>(null);

  const filtered = React.useMemo(() => {
    if (!selectedCategory) return sorted;
    return sorted.filter((b) => getBookCategory(b.tags) === selectedCategory);
  }, [sorted, selectedCategory]);

  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10; // default 10 books per page

  // Reset to page 1 when category filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory]);

  // Compute total pages
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  // Slice the books for current page
  const paginated = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  function toggleSort(nextKey: typeof sortKey) {
    if (nextKey === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(nextKey);
      setSortDir('asc');
    }
  }

  function sortIcon(col: typeof sortKey) {
    if (col !== sortKey) return '⇅';
    return sortDir === 'asc' ? '▲' : '▼';
    }

  /* ---------- Manage modal state ---------- */
  const [form, setForm] = React.useState({
    title: '',
    author: '',
    isbn: '',
    classification: '',
    publication_year: '',
    publisher: '',
    tags: '' as string, // comma-separated
    category: '' as string,
    sip_status: 'available' as CopyStatus,
  });
  const [autoTagging, setAutoTagging] = React.useState(false);
  const [autoTagError, setAutoTagError] = React.useState<string | null>(null);
  const [bulkTagging, setBulkTagging] = React.useState(false);
  const [bulkTagMessage, setBulkTagMessage] = React.useState<string | null>(null);
  const [bulkTagError, setBulkTagError] = React.useState<string | null>(null);
  const [bulkRetagging, setBulkRetagging] = React.useState(false);
  const [bulkRetagMessage, setBulkRetagMessage] = React.useState<string | null>(null);
  const [bulkRetagError, setBulkRetagError] = React.useState<string | null>(null);
  const [autoCategorizing, setAutoCategorizing] = React.useState(false);
  const [autoCategoryMessage, setAutoCategoryMessage] = React.useState<string | null>(null);
  const [autoCategoryError, setAutoCategoryError] = React.useState<string | null>(null);
  const [embedding, setEmbedding] = React.useState(false);
  const [embedMessage, setEmbedMessage] = React.useState<string | null>(null);
  const [embedError, setEmbedError] = React.useState<string | null>(null);

  async function onEmbedAll(reembed = false) {
    setEmbedMessage(null);
    setEmbedError(null);
    setEmbedding(true);
    try {
      const res = await fetch('/api/book/embed-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reembed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Embedding failed');
      const n = Number(data?.embedded ?? 0);
      const f = Number(data?.failed ?? 0);
      setEmbedMessage(`Embedded ${n} book${n === 1 ? '' : 's'}${f ? ` (${f} failed)` : ''}.`);
    } catch (err) {
      setEmbedError(err instanceof Error ? err.message : 'Embedding failed');
    } finally {
      setEmbedding(false);
    }
  }

  function onManage(b: CatalogBook) {
    setActive(b);
    setForm({
      title: b.title ?? '',
      author: b.author ?? '',
      isbn: b.isbn ?? '',
      classification: b.classification ?? '',
      publication_year: b.publication_year ? String(b.publication_year) : '',
      publisher: b.publisher ?? '',
      tags: (b.tags ?? []).join(', '),
      category: b.category ?? '',
      sip_status: (b.sip_status as CopyStatus) ?? 'available',
    });
    setOpen(true);
  }

  function onClose() {
    setOpen(false);
    setActive(null);
    setAutoTagError(null);
    setAutoTagging(false);
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!active) return;

    // Send only numbers when present; server will omit nulls for NOT NULL columns.
    const payload = {
      id: active.id,
      title: form.title.trim(),
      author: form.author.trim() || null,
      isbn: form.isbn.trim() || null,
      classification: form.classification.trim() || null,
      publisher: form.publisher.trim() || null,
      publication_year: form.publication_year.trim() || null,
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      category: form.category || null,
      sip_status: form.sip_status,
    };

    await updateBook(payload);
    onClose();
  }

  async function onAutoTag() {
    if (!active) return;
    setAutoTagError(null);
    setAutoTagging(true);
    try {
      const res = await fetch('/api/book/auto-tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: active.id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Auto-tag failed');

      if (Array.isArray(data?.tags) && data.tags.length) {
        setForm((f) => ({ ...f, tags: data.tags.join(', ') }));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Auto-tag failed';
      setAutoTagError(msg);
    } finally {
      setAutoTagging(false);
    }
  }

  async function onAutoTagAll() {
    setBulkTagMessage(null);
    setBulkTagError(null);
    setBulkTagging(true);
    try {
      const res = await fetch('/api/book/auto-tag', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Auto-tag failed');
      const tagged = Number(data?.tagged ?? 0);
      setBulkTagMessage(`Auto-tagged ${tagged} book${tagged === 1 ? '' : 's'}.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Auto-tag failed';
      setBulkTagError(msg);
    } finally {
      setBulkTagging(false);
    }
  }

  async function onReTagAll() {
    setBulkRetagMessage(null);
    setBulkRetagError(null);
    setBulkRetagging(true);
    try {
      const res = await fetch('/api/book/auto-tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retag: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Re-tag failed');
      const tagged = Number(data?.tagged ?? 0);
      setBulkRetagMessage(`Re-tagged ${tagged} book${tagged === 1 ? '' : 's'}.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Re-tag failed';
      setBulkRetagError(msg);
    } finally {
      setBulkRetagging(false);
    }
  }

  async function onAutoCategorizeAll(recategorize = false) {
    setAutoCategoryMessage(null);
    setAutoCategoryError(null);
    setAutoCategorizing(true);
    try {
      const res = await fetch('/api/book/auto-category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recategorize }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Auto-categorize failed');
      const n = Number(data?.categorized ?? 0);
      setAutoCategoryMessage(`Categorized ${n} book${n === 1 ? '' : 's'}.`);
    } catch (err) {
      setAutoCategoryError(err instanceof Error ? err.message : 'Auto-categorize failed');
    } finally {
      setAutoCategorizing(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm('Delete this book permanently?')) return;
    await deleteBook(id);
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onAutoTagAll}
          disabled={bulkTagging}
          className="inline-flex items-center gap-2 rounded-btn border border-hairline bg-surface-card px-3 py-1.5 font-sans text-button text-ink hover:bg-surface-cream-strong disabled:cursor-not-allowed disabled:opacity-60 dark:border-dark-hairline dark:bg-dark-surface-card dark:text-on-dark dark:hover:bg-dark-surface-strong"
        >
          {bulkTagging ? 'Auto-tagging…' : 'Auto-tag all untagged'}
        </button>
        {bulkTagMessage && <span className="font-sans text-body-sm text-success">{bulkTagMessage}</span>}
        {bulkTagError && <span className="font-sans text-body-sm text-error">{bulkTagError}</span>}

        <button
          type="button"
          onClick={onReTagAll}
          disabled={bulkRetagging}
          className="inline-flex items-center gap-2 rounded-btn border border-hairline bg-surface-card px-3 py-1.5 font-sans text-button text-ink hover:bg-surface-cream-strong disabled:cursor-not-allowed disabled:opacity-60 dark:border-dark-hairline dark:bg-dark-surface-card dark:text-on-dark dark:hover:bg-dark-surface-strong"
        >
          {bulkRetagging ? 'Re-tagging…' : 'Re-tag all (overwrite)'}
        </button>
        {bulkRetagMessage && <span className="font-sans text-body-sm text-success">{bulkRetagMessage}</span>}
        {bulkRetagError && <span className="font-sans text-body-sm text-error">{bulkRetagError}</span>}

        <button
          type="button"
          onClick={() => onAutoCategorizeAll(false)}
          disabled={autoCategorizing}
          className="inline-flex items-center gap-2 rounded-btn border border-hairline bg-surface-card px-3 py-1.5 font-sans text-button text-ink hover:bg-surface-cream-strong disabled:cursor-not-allowed disabled:opacity-60 dark:border-dark-hairline dark:bg-dark-surface-card dark:text-on-dark dark:hover:bg-dark-surface-strong"
        >
          {autoCategorizing ? 'Categorizing…' : 'Auto-categorize uncategorized'}
        </button>
        <button
          type="button"
          onClick={() => onAutoCategorizeAll(true)}
          disabled={autoCategorizing}
          className="inline-flex items-center gap-2 rounded-btn border border-hairline bg-surface-card px-3 py-1.5 font-sans text-button text-ink hover:bg-surface-cream-strong disabled:cursor-not-allowed disabled:opacity-60 dark:border-dark-hairline dark:bg-dark-surface-card dark:text-on-dark dark:hover:bg-dark-surface-strong"
        >
          {autoCategorizing ? 'Categorizing…' : 'Re-categorize all (overwrite)'}
        </button>
        {autoCategoryMessage && <span className="font-sans text-body-sm text-success">{autoCategoryMessage}</span>}
        {autoCategoryError && <span className="font-sans text-body-sm text-error">{autoCategoryError}</span>}

        <button
          type="button"
          onClick={() => onEmbedAll(false)}
          disabled={embedding}
          className="inline-flex items-center gap-2 rounded-btn border border-hairline bg-surface-card px-3 py-1.5 font-sans text-button text-ink hover:bg-surface-cream-strong disabled:cursor-not-allowed disabled:opacity-60 dark:border-dark-hairline dark:bg-dark-surface-card dark:text-on-dark dark:hover:bg-dark-surface-strong"
        >
          {embedding ? 'Embedding…' : 'Embed unembedded books'}
        </button>
        <button
          type="button"
          onClick={() => onEmbedAll(true)}
          disabled={embedding}
          className="inline-flex items-center gap-2 rounded-btn border border-hairline bg-surface-card px-3 py-1.5 font-sans text-button text-ink hover:bg-surface-cream-strong disabled:cursor-not-allowed disabled:opacity-60 dark:border-dark-hairline dark:bg-dark-surface-card dark:text-on-dark dark:hover:bg-dark-surface-strong"
        >
          {embedding ? 'Embedding…' : 'Re-embed all'}
        </button>
        {embedMessage && <span className="font-sans text-body-sm text-success">{embedMessage}</span>}
        {embedError && <span className="font-sans text-body-sm text-error">{embedError}</span>}
      </div>

      {/* Category filter chips */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">Filter:</span>
        <button
          type="button"
          onClick={() => setSelectedCategory(null)}
          className={`rounded-pill px-3 py-1 font-sans text-button transition-colors ${
            selectedCategory === null
              ? 'bg-ink text-canvas dark:bg-on-dark dark:text-dark-canvas'
              : 'border border-hairline bg-surface-card text-ink hover:bg-surface-cream-strong dark:border-dark-hairline dark:bg-dark-surface-card dark:text-on-dark dark:hover:bg-dark-surface-strong'
          }`}
        >
          All
        </button>
        {CATEGORIES.map((cat) => {
          const colors: Record<BookCategory, string> = {
            'Computer Science': 'bg-primary text-on-primary',
            'Business':         'bg-success text-on-primary',
            'Art & Design':     'bg-accent-teal text-on-primary',
            'Engineering':      'bg-accent-amber text-on-primary',
          };
          const borders: Record<BookCategory, string> = {
            'Computer Science': 'border-primary/30 text-primary hover:bg-primary/10 dark:border-primary/40 dark:text-dark-primary dark:hover:bg-primary/10',
            'Business':         'border-success/30 text-success hover:bg-success/10 dark:border-success/40 dark:text-success dark:hover:bg-success/10',
            'Art & Design':     'border-accent-teal/30 text-accent-teal hover:bg-accent-teal/10 dark:border-accent-teal/40 dark:text-accent-teal dark:hover:bg-accent-teal/10',
            'Engineering':      'border-accent-amber/30 text-accent-amber hover:bg-accent-amber/10 dark:border-accent-amber/40 dark:text-accent-amber dark:hover:bg-accent-amber/10',
          };
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              className={`rounded-pill px-3 py-1 font-sans text-button transition-colors ${
                selectedCategory === cat
                  ? colors[cat]
                  : `border bg-surface-card dark:bg-dark-surface-card ${borders[cat]}`
              }`}
            >
              {cat}
            </button>
          );
        })}
        {selectedCategory && (
          <span className="ml-1 font-sans text-caption text-muted-soft dark:text-on-dark-soft">
            {filtered.length} book{filtered.length === 1 ? '' : 's'} found
          </span>
        )}
      </div>

      {/* Desktop/tablet: classic table */}
    <div className="hidden md:block overflow-hidden rounded-card border border-hairline bg-surface-card dark:border-dark-hairline dark:bg-dark-surface-card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-hairline-soft text-ink dark:divide-dark-hairline dark:text-on-dark">
            <thead className="bg-surface-cream-strong text-ink dark:bg-dark-surface-strong dark:text-on-dark">
              <tr>
                <Th onClick={() => toggleSort('title')}>
                  <HeaderLabel label="Title" icon={sortIcon('title')} />
                </Th>
                <Th onClick={() => toggleSort('author')}>
                  <HeaderLabel label="Author" icon={sortIcon('author')} />
                </Th>
                <Th className="hidden lg:table-cell" onClick={() => toggleSort('isbn')}>
                  <HeaderLabel label="ISBN" icon={sortIcon('isbn')} />
                </Th>
                <Th className="hidden lg:table-cell" onClick={() => toggleSort('classification')}>
                  <HeaderLabel label="Call No." icon={sortIcon('classification')} />
                </Th>
                <Th className="hidden lg:table-cell" onClick={() => toggleSort('publication_year')}>
                  <HeaderLabel label="Year" icon={sortIcon('publication_year')} />
                </Th>
                <Th className="hidden xl:table-cell" onClick={() => toggleSort('publisher')}>
                  <HeaderLabel label="Publisher" icon={sortIcon('publisher')} />
                </Th>
                <Th onClick={() => toggleSort('status')}>
                  <HeaderLabel label="Status" icon={sortIcon('status')} />
                </Th>
                <Th onClick={() => toggleSort('sip_status')}>
                  <HeaderLabel label="SIP Status" icon={sortIcon('sip_status')} />
                </Th>
                <Th>Actions</Th>
              </tr>
            </thead>
          <tbody className="divide-y divide-hairline-soft bg-surface-card dark:divide-dark-hairline dark:bg-dark-surface-card">
              {paginated.map((b) => (
                <tr key={b.id} className="hover:bg-surface-cream-strong/50 dark:hover:bg-dark-surface-strong/50">
                  <Td>
                    <div className="flex items-center gap-3">
                      {b.cover ? (
                        <img
                          src={b.cover}
                          alt=""
                          aria-hidden
                          className="h-12 w-8 rounded object-cover ring-1 ring-hairline dark:ring-dark-hairline"
                        />
                      ) : (
                        <div className="h-12 w-8 rounded bg-surface-cream-strong ring-1 ring-hairline dark:bg-dark-surface-strong dark:ring-dark-hairline" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-sans text-title-md text-ink dark:text-on-dark">{b.title ?? 'Untitled'}</p>
                        {!!(b.tags && b.tags.length) && (
                          <p className="truncate font-sans text-caption text-muted dark:text-on-dark-soft">{b.tags.slice(0, 3).join(', ')}</p>
                        )}
                      </div>
                    </div>
                  </Td>
                  <Td>{b.author ?? <span className="text-muted-soft dark:text-on-dark-soft">Unknown</span>}</Td>
                  <Td className="hidden lg:table-cell font-mono text-code text-muted dark:text-on-dark-soft">{b.isbn ?? '-'}</Td>
                  <Td className="hidden lg:table-cell font-mono text-code text-muted dark:text-on-dark-soft">{b.classification ?? '-'}</Td>
                  <Td className="hidden lg:table-cell">{b.publication_year ?? '-'}</Td>
                  <Td className="hidden xl:table-cell">{b.publisher ?? '-'}</Td>
                  <Td>{renderStatusBadge(b.status)}</Td>
                  <Td>{renderSipStatusBadge(b.sip_status)}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="rounded-btn border border-hairline bg-surface-card px-3 py-1.5 font-sans text-button text-ink hover:bg-surface-cream-strong dark:border-dark-hairline dark:bg-dark-surface-card dark:text-on-dark dark:hover:bg-dark-surface-strong"
                        onClick={() => onManage(b)}
                        type="button"
                      >
                        Manage
                      </button>
                      <button
                        className="rounded-btn border border-primary/20 bg-surface-card px-3 py-1.5 font-sans text-button text-primary hover:bg-primary/5 dark:border-dark-primary/20 dark:bg-dark-surface-card dark:text-dark-primary dark:hover:bg-dark-primary/10"
                        onClick={() => onDelete(b.id)}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center font-sans text-body-md text-muted dark:text-on-dark-soft">
                    No books found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile: card list (no horizontal scrolling) */}
      <ul className="md:hidden space-y-3">
        {paginated.map((b) => (
          <li
            key={b.id}
            className="rounded-card border border-hairline bg-surface-card p-4 text-ink dark:border-dark-hairline dark:bg-dark-surface-card dark:text-on-dark"
          >
            <div className="flex gap-3">
              {b.cover ? (
                <img
                  src={b.cover}
                  alt=""
                  aria-hidden
                  className="h-16 w-12 rounded object-cover ring-1 ring-hairline dark:ring-dark-hairline"
                />
              ) : (
                <div className="h-16 w-12 rounded bg-surface-cream-strong ring-1 ring-hairline dark:bg-dark-surface-strong dark:ring-dark-hairline" />
              )}

              <div className="min-w-0 flex-1">
                {/* Title + Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-sans text-title-md text-ink dark:text-on-dark">
                      {b.title ?? 'Untitled'}
                    </h3>
                    <p className="truncate font-sans text-body-sm text-muted dark:text-on-dark-soft">
                      {b.author ?? 'Unknown'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {renderStatusBadge(b.status)}
                    {renderSipStatusBadge(b.sip_status)}
                  </div>
                </div>

                {/* Explicit, readable K/V list */}
                <div className="mt-3 space-y-1.5 font-sans text-body-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted dark:text-on-dark-soft">ISBN</span>
                    <span className="font-mono text-code text-ink dark:text-on-dark truncate">{b.isbn ?? '-'}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted dark:text-on-dark-soft">Call No.</span>
                    <span className="font-mono text-code text-ink dark:text-on-dark truncate">{b.classification ?? '-'}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted dark:text-on-dark-soft">Year</span>
                    <span className="font-medium text-ink dark:text-on-dark truncate">
                      {b.publication_year ?? '-'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted dark:text-on-dark-soft">Publisher</span>
                    <span className="font-medium text-ink dark:text-on-dark truncate">{b.publisher ?? '-'}</span>
                  </div>
                  {!!(b.tags && b.tags.length) && (
                    <div className="flex items-start gap-3">
                      <span className="text-muted dark:text-on-dark-soft">Tags</span>
                      <span className="font-medium text-ink dark:text-on-dark truncate">
                        {b.tags.slice(0, 3).join(', ')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="rounded-btn border border-hairline bg-surface-card px-3 py-1.5 font-sans text-button text-ink hover:bg-surface-cream-strong dark:border-dark-hairline dark:bg-dark-surface-card dark:text-on-dark dark:hover:bg-dark-surface-strong"
                    onClick={() => onManage(b)}
                    type="button"
                  >
                    Manage
                  </button>
                  <button
                    className="rounded-btn border border-primary/20 bg-surface-card px-3 py-1.5 font-sans text-button text-primary hover:bg-primary/5 dark:border-dark-primary/20 dark:bg-dark-surface-card dark:text-dark-primary dark:hover:bg-dark-primary/10"
                    onClick={() => onDelete(b.id)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </li>
        ))}
        {sorted.length === 0 && (
          <li className="rounded-card border border-hairline bg-surface-card p-6 text-center font-sans text-body-md text-muted dark:border-dark-hairline dark:bg-dark-surface-card dark:text-on-dark-soft">
            No books found.
          </li>
        )}
      </ul>


      {/* Following viewport on scroll */}
      <ManageBookModal open={open} onClose={onClose} title="Manage book" lockScroll={false}>
        <form className="space-y-4" onSubmit={onSave}>
          <div>
            <label className="block font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">Title</label>
            <input
              className="mt-1 w-full rounded-btn border border-hairline bg-canvas px-3 py-2 font-sans text-body-md text-ink placeholder:text-muted-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:border-dark-hairline dark:bg-dark-surface-soft dark:text-on-dark dark:placeholder:text-on-dark-soft dark:focus-visible:ring-offset-dark-canvas"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
            <label className="block font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">Author</label>
            <input
              className="mt-1 w-full rounded-btn border border-hairline bg-canvas px-3 py-2 font-sans text-body-md text-ink placeholder:text-muted-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:border-dark-hairline dark:bg-dark-surface-soft dark:text-on-dark dark:placeholder:text-on-dark-soft dark:focus-visible:ring-offset-dark-canvas"
              value={form.author}
              onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
            />
          </div>
          <div>
            <label className="block font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">ISBN</label>
            <input
              className="mt-1 w-full rounded-btn border border-hairline bg-canvas px-3 py-2 font-sans text-body-md text-ink placeholder:text-muted-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:border-dark-hairline dark:bg-dark-surface-soft dark:text-on-dark dark:placeholder:text-on-dark-soft dark:focus-visible:ring-offset-dark-canvas"
              value={form.isbn}
              onChange={(e) => setForm((f) => ({ ...f, isbn: e.target.value }))}
            />
          </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
            <label className="block font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">Call no.</label>
            <input
              className="mt-1 w-full rounded-btn border border-hairline bg-canvas px-3 py-2 font-sans text-body-md text-ink placeholder:text-muted-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:border-dark-hairline dark:bg-dark-surface-soft dark:text-on-dark dark:placeholder:text-on-dark-soft dark:focus-visible:ring-offset-dark-canvas"
              value={form.classification}
              onChange={(e) => setForm((f) => ({ ...f, classification: e.target.value }))}
            />
          </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
            <label className="block font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">Year</label>
            <input
              className="mt-1 w-full rounded-btn border border-hairline bg-canvas px-3 py-2 font-sans text-body-md text-ink placeholder:text-muted-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:border-dark-hairline dark:bg-dark-surface-soft dark:text-on-dark dark:placeholder:text-on-dark-soft dark:focus-visible:ring-offset-dark-canvas"
              value={form.publication_year}
              onChange={(e) => setForm((f) => ({ ...f, publication_year: e.target.value }))}
            />
          </div>
          <div>
            <label className="block font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">Publisher</label>
            <input
              className="mt-1 w-full rounded-btn border border-hairline bg-canvas px-3 py-2 font-sans text-body-md text-ink placeholder:text-muted-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:border-dark-hairline dark:bg-dark-surface-soft dark:text-on-dark dark:placeholder:text-on-dark-soft dark:focus-visible:ring-offset-dark-canvas"
              value={form.publisher}
              onChange={(e) => setForm((f) => ({ ...f, publisher: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <label className="block font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">SIP status</label>
          <select
            className="mt-1 w-full rounded-btn border border-hairline bg-canvas px-3 py-2 font-sans text-body-md text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:border-dark-hairline dark:bg-dark-surface-soft dark:text-on-dark dark:focus-visible:ring-offset-dark-canvas"
            value={form.sip_status}
            onChange={(e) =>
              setForm((f) => ({ ...f, sip_status: e.target.value as CopyStatus }))
            }
          >
              <option value="available">Available</option>
              <option value="on_loan">On loan</option>
              <option value="hold_shelf">On hold shelf</option>
              <option value="processing">Processing</option>
              <option value="lost">Lost</option>
              <option value="damaged">Damaged</option>
            </select>
            <p className="mt-1 font-sans text-caption text-muted dark:text-on-dark-soft">
              Applies to all copies of this book; mirrors the SIP/ILS status.
            </p>
        </div>

        <div>
          <label className="block font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">Category</label>
          <select
            className="mt-1 w-full rounded-btn border border-hairline bg-canvas px-3 py-2 font-sans text-body-md text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:border-dark-hairline dark:bg-dark-surface-soft dark:text-on-dark dark:focus-visible:ring-offset-dark-canvas"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          >
            <option value="">— None —</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">Tags</label>
          <input
            className="mt-1 w-full rounded-btn border border-hairline bg-canvas px-3 py-2 font-sans text-body-md text-ink placeholder:text-muted-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:border-dark-hairline dark:bg-dark-surface-soft dark:text-on-dark dark:placeholder:text-on-dark-soft dark:focus-visible:ring-offset-dark-canvas"
            placeholder="programming, ui, algorithms"
            value={form.tags}
            onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
          />
          <p className="mt-1 font-sans text-caption text-muted dark:text-on-dark-soft">Separate with commas</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={autoTagging || !active}
              onClick={onAutoTag}
              className="inline-flex items-center gap-2 rounded-btn border border-hairline bg-surface-card px-3 py-1.5 font-sans text-button text-ink hover:bg-surface-cream-strong disabled:cursor-not-allowed disabled:opacity-60 dark:border-dark-hairline dark:bg-dark-surface-card dark:text-on-dark dark:hover:bg-dark-surface-strong"
            >
              {autoTagging ? 'Tagging…' : 'Auto-tag with AI'}
            </button>
            {autoTagError && (
              <span className="font-sans text-body-sm text-error">{autoTagError}</span>
            )}
          </div>
        </div>

          <div className="mt-2 flex flex-wrap justify-between gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-btn border border-hairline bg-surface-card px-4 py-2 font-sans text-button text-ink hover:bg-surface-cream-strong dark:border-dark-hairline dark:bg-dark-surface-card dark:text-on-dark dark:hover:bg-dark-surface-strong"
            >
              Cancel
            </button>

            {/* Inline delete inside modal (optional) */}
            {active && (
              <button
                type="button"
                onClick={() => onDelete(active.id)}
                className="rounded-btn border border-primary/20 bg-surface-card px-4 py-2 font-sans text-button text-primary hover:bg-primary/5 dark:border-dark-primary/20 dark:bg-dark-surface-card dark:text-dark-primary dark:hover:bg-dark-primary/10"
              >
                Delete
              </button>
            )}

            <button
              type="submit"
              className="rounded-btn bg-primary px-4 py-2 font-sans text-button text-on-primary hover:bg-primary-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-dark-canvas"
            >
              Save changes
            </button>
          </div>
        </form>
      </ManageBookModal>

      {/* Paging control */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </>
  );
}

/* -------------------- Helpers -------------------- */

function renderStatusBadge(status?: ItemStatus | null) {
  const s = status ?? 'available';
  const map: Record<ItemStatus, { text: string; cls: string }> = {
    available: { text: 'Available', cls: 'bg-success/15 text-success' },
    'checked out': { text: 'Checked out', cls: 'bg-warning/15 text-warning' },
    borrowed: { text: 'Checked out', cls: 'bg-warning/15 text-warning' },
    reserved: { text: 'On hold', cls: 'bg-accent-teal/15 text-accent-teal' },
    'in transit': { text: 'In transit', cls: 'bg-accent-teal/15 text-accent-teal' },
    on_hold: { text: 'On hold', cls: 'bg-accent-teal/15 text-accent-teal' },
    in_process: { text: 'In process', cls: 'bg-surface-cream-strong text-muted dark:bg-dark-surface-strong dark:text-on-dark-soft' },
    lost: { text: 'Lost', cls: 'bg-primary/15 text-primary' },
    missing: { text: 'Missing', cls: 'bg-primary/15 text-primary' },
    maintenance: { text: 'Maintenance', cls: 'bg-warning/15 text-warning' },
  };
  const badge = map[s];
  return (
    <span className={`inline-flex items-center rounded-pill px-3 py-1 font-sans text-caption font-medium ${badge.cls}`}>
      {badge.text}
    </span>
  );
}

function renderSipStatusBadge(status?: CopyStatus | null) {
  if (!status) {
    return (
      <span className="inline-flex items-center rounded-pill bg-surface-cream-strong px-3 py-1 font-sans text-caption font-medium text-muted dark:bg-dark-surface-strong dark:text-on-dark-soft">
        Unknown
      </span>
    );
  }

  const map: Record<CopyStatus, { text: string; cls: string }> = {
    available: { text: 'SIP: Available', cls: 'bg-success/10 text-success border border-success/30' },
    on_loan: { text: 'SIP: On loan', cls: 'bg-warning/10 text-warning border border-warning/30' },
    hold_shelf: { text: 'SIP: On hold shelf', cls: 'bg-accent-teal/10 text-accent-teal border border-accent-teal/30' },
    processing: { text: 'SIP: Processing', cls: 'bg-surface-cream-strong text-muted border border-hairline dark:bg-dark-surface-strong dark:text-on-dark-soft dark:border-dark-hairline' },
    lost: { text: 'SIP: Lost', cls: 'bg-primary/10 text-primary border border-primary/30' },
    damaged: { text: 'SIP: Damaged', cls: 'bg-warning/10 text-warning border border-warning/30' },
  };

  const badge = map[status];
  return (
    <span className={`inline-flex items-center rounded-pill px-3 py-1 font-sans text-caption font-medium ${badge.cls}`}>
      {badge.text}
    </span>
  );
}

function HeaderLabel({ label, icon }: { label: string; icon: string }) {
  return (
    <div className="flex select-none items-center gap-2 text-ink dark:text-on-dark">
      <span>{label}</span>
      <span className="text-muted-soft dark:text-on-dark-soft">{icon}</span>
    </div>
  );
}

function Th({
  children,
  className = '',
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <th
      scope="col"
      onClick={onClick}
      className={[
        'px-4 py-3 text-left font-sans text-caption-uppercase',
        'text-ink cursor-pointer select-none dark:text-on-dark',
        className,
      ].join(' ')}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={['px-4 py-3 align-top font-sans text-body-sm text-body dark:text-on-dark/80', className].join(' ')}>{children}</td>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">{label}</dt>
      <dd className="truncate font-sans text-body-sm font-medium text-ink dark:text-on-dark">{children}</dd>
    </div>
  );
}
