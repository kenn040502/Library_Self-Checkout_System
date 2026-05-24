'use client';

import { useState, useMemo } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import DevToGrid, { type DevToArticle } from './devToGrid';

export default function CommunityFeed({ articles }: { articles: DevToArticle[] }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return articles;
    return articles.filter(
      (a) =>
        a.title?.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q) ||
        a.tag_list?.some((t) => t.toLowerCase().includes(q)) ||
        a.user?.name?.toLowerCase().includes(q)
    );
  }, [articles, q]);

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative group">
        <MagnifyingGlassIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-swin-charcoal/40 transition-colors group-focus-within:text-swin-red dark:text-white/30" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search articles, tags, or authors…"
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

      {/* Result count */}
      {q && (
        <p className="text-xs text-swin-charcoal/50 dark:text-white/40">
          {filtered.length === 0
            ? 'No articles match your search.'
            : `Showing ${filtered.length} of ${articles.length} articles for "${query}"`}
        </p>
      )}

      {filtered.length > 0 ? (
        <DevToGrid articles={filtered} />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-swin-charcoal/20 bg-white p-10 text-center dark:border-white/20 dark:bg-slate-900/40">
          <p className="text-sm text-swin-charcoal/50 dark:text-white/50">
            {q ? `No results for "${query}"` : 'No articles found.'}
          </p>
          {q && (
            <button
              onClick={() => setQuery('')}
              className="mt-3 rounded-xl bg-swin-red px-4 py-2 text-xs font-semibold text-white transition hover:bg-swin-red/90"
            >
              Clear search
            </button>
          )}
        </div>
      )}
    </div>
  );
}
