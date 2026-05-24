'use client';

import { useState, useMemo } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import NewsGrid, { type NewsItem } from './newsGrid';

const SOURCES = ['All', 'BBC Technology', 'TechCrunch', 'The Verge', 'Ars Technica', 'Engadget'];

const SOURCE_COLORS: Record<string, string> = {
  'BBC Technology': 'bg-red-600',
  'TechCrunch':     'bg-green-600',
  'The Verge':      'bg-violet-600',
  'Ars Technica':   'bg-orange-600',
  'Engadget':       'bg-blue-600',
};

export default function NewsFeed({ stories }: { stories: NewsItem[] }) {
  const [query,  setQuery]  = useState('');
  const [source, setSource] = useState('All');
  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    return stories.filter((s) => {
      const matchesSource = source === 'All' || s.source === source;
      const matchesQuery  = !q || s.title?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q) || s.source?.toLowerCase().includes(q);
      return matchesSource && matchesQuery;
    });
  }, [stories, q, source]);

  return (
    <div className="space-y-4">

      {/* Search bar */}
      <div className="relative group">
        <MagnifyingGlassIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-swin-charcoal/40 transition-colors group-focus-within:text-swin-red dark:text-white/30" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search news headlines…"
          className="w-full rounded-2xl border border-swin-charcoal/10 bg-swin-charcoal/5 py-3.5 pl-12 pr-10 text-sm text-swin-charcoal placeholder:text-swin-charcoal/40 transition-all focus:border-swin-red focus:bg-white focus:outline-none focus:ring-4 focus:ring-swin-red/5 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/30 dark:focus:border-swin-red dark:focus:bg-slate-900"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-swin-charcoal/30 transition hover:bg-swin-charcoal/10 hover:text-swin-red dark:text-white/30 dark:hover:bg-white/10"
            aria-label="Clear search"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Source filter pills */}
      <div className="flex flex-wrap gap-2">
        {SOURCES.map((src) => {
          const isActive = source === src;
          const colorClass = src === 'All' ? '' : SOURCE_COLORS[src] ?? 'bg-swin-red';
          return (
            <button
              key={src}
              type="button"
              onClick={() => setSource(src)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                isActive
                  ? src === 'All'
                    ? 'bg-swin-charcoal text-white dark:bg-white dark:text-swin-charcoal'
                    : `${colorClass} text-white shadow-sm`
                  : 'bg-swin-charcoal/5 text-swin-charcoal hover:bg-swin-charcoal/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10'
              }`}
            >
              {src}
            </button>
          );
        })}
      </div>

      {/* Result count */}
      {(q || source !== 'All') && (
        <p className="text-xs text-swin-charcoal/50 dark:text-white/40">
          {filtered.length === 0
            ? 'No stories match your filters.'
            : `Showing ${filtered.length} of ${stories.length} stories`}
          {(q || source !== 'All') && (
            <button
              onClick={() => { setQuery(''); setSource('All'); }}
              className="ml-2 font-semibold text-swin-red hover:underline"
            >
              Clear filters
            </button>
          )}
        </p>
      )}

      {/* Grid */}
      {filtered.length > 0 ? (
        <NewsGrid stories={filtered} />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-swin-charcoal/20 bg-white p-10 text-center dark:border-white/20 dark:bg-slate-900/40">
          <p className="text-sm text-swin-charcoal/50 dark:text-white/50">No results found.</p>
          <button
            onClick={() => { setQuery(''); setSource('All'); }}
            className="mt-3 rounded-xl bg-swin-red px-4 py-2 text-xs font-semibold text-white transition hover:bg-swin-red/90"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
