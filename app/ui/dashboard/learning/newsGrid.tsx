'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowTopRightOnSquareIcon,
  ClockIcon,
  NewspaperIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

export type NewsItem = {
  id: string;
  title: string;
  description: string;
  url: string;
  imageUrl: string | null;
  source: string;
  pubDate: string;
};

function timeAgo(dateStr: string): string {
  try {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch { return dateStr; }
}

const SOURCE_COLORS: Record<string, string> = {
  'BBC Technology':  'bg-red-600',
  'TechCrunch':      'bg-green-600',
  'The Verge':       'bg-violet-600',
  'Ars Technica':    'bg-orange-600',
  'Engadget':        'bg-blue-600',
};

// ── Article detail panel ──────────────────────────────────
function ArticlePanel({ item, onClose }: { item: NewsItem; onClose: () => void }) {
  const color = SOURCE_COLORS[item.source] ?? 'bg-swin-red';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      />
      <motion.div
        className="relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-slate-950 sm:max-w-2xl sm:rounded-3xl"
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 30 }}
      >
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-swin-charcoal/20 dark:bg-white/20" />
        </div>

        {/* Hero image */}
        {item.imageUrl && (
          <div className="relative aspect-[16/7] w-full flex-shrink-0 overflow-hidden">
            <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            {/* Source chip on image */}
            <span className={`absolute bottom-4 left-4 rounded-full ${color} px-3 py-1 text-xs font-bold text-white`}>
              {item.source}
            </span>
          </div>
        )}

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">

          {/* Source + time (if no image) */}
          {!item.imageUrl && (
            <div className="flex items-center gap-2">
              <span className={`rounded-full ${color} px-3 py-1 text-xs font-bold text-white`}>{item.source}</span>
              <span className="text-xs text-swin-charcoal/40 dark:text-white/40">{timeAgo(item.pubDate)}</span>
            </div>
          )}
          {item.imageUrl && (
            <span className="text-xs text-swin-charcoal/40 dark:text-white/40">{timeAgo(item.pubDate)}</span>
          )}

          {/* Title */}
          <h2 className="text-xl font-bold leading-snug text-swin-charcoal dark:text-white">
            {item.title}
          </h2>

          {/* Description */}
          {item.description && (
            <p className="text-sm leading-relaxed text-swin-charcoal/70 dark:text-slate-300/80">
              {item.description}
            </p>
          )}

          {/* Read button */}
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-swin-red py-4 text-sm font-bold text-white shadow-lg shadow-swin-red/25 transition hover:bg-swin-red/90"
          >
            Read Full Article
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
          </a>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-swin-charcoal/15 py-3 text-sm font-semibold text-swin-charcoal transition hover:border-swin-red hover:text-swin-red dark:border-white/15 dark:text-white dark:hover:border-swin-red dark:hover:text-swin-red"
          >
            <XMarkIcon className="h-4 w-4" />
            Close Panel
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Fallback image gradient ───────────────────────────────
const GRADIENTS = [
  'from-violet-600 to-indigo-600',
  'from-swin-red to-orange-500',
  'from-cyan-600 to-blue-600',
  'from-emerald-600 to-teal-500',
  'from-pink-600 to-rose-500',
  'from-amber-500 to-yellow-500',
];

function ImagePlaceholder({ source, idx }: { source: string; idx: number }) {
  const grad = GRADIENTS[idx % GRADIENTS.length];
  return (
    <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${grad}`}>
      <NewspaperIcon className="h-10 w-10 text-white/50" />
    </div>
  );
}

// ── Main news grid ────────────────────────────────────────
export default function NewsGrid({ stories }: { stories: NewsItem[] }) {
  const [selected, setSelected] = useState<NewsItem | null>(null);

  if (stories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-swin-charcoal/20 bg-white p-12 text-center dark:border-white/20 dark:bg-slate-900/40">
        <NewspaperIcon className="mb-3 h-10 w-10 text-swin-charcoal/20 dark:text-white/20" />
        <p className="text-swin-charcoal/50 dark:text-white/50">No news could be loaded right now.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-xl bg-swin-red px-5 py-2 text-sm font-semibold text-white transition hover:bg-swin-red/90"
        >
          Refresh
        </button>
      </div>
    );
  }

  const [hero, ...rest] = stories;
  const heroBgIdx = 0;

  return (
    <>
      <div className="space-y-4">

        {/* ── Google News hero ── */}
        <button
          type="button"
          onClick={() => setSelected(hero)}
          className="group w-full overflow-hidden rounded-3xl border border-swin-charcoal/10 bg-white shadow-sm transition-all hover:shadow-xl dark:border-white/5 dark:bg-slate-900/70"
        >
          <div className="flex flex-col sm:flex-row">
            {/* Hero image */}
            <div className="relative h-52 w-full flex-shrink-0 overflow-hidden sm:h-auto sm:w-64 lg:w-80">
              {hero.imageUrl ? (
                <img
                  src={hero.imageUrl}
                  alt={hero.title}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  loading="eager"
                />
              ) : (
                <ImagePlaceholder source={hero.source} idx={heroBgIdx} />
              )}
            </div>

            {/* Hero text */}
            <div className="flex flex-1 flex-col justify-between gap-4 p-5 sm:p-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full ${SOURCE_COLORS[hero.source] ?? 'bg-swin-red'} px-3 py-0.5 text-[11px] font-bold text-white`}>
                    {hero.source}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-swin-charcoal/40 dark:text-white/40">
                    <ClockIcon className="h-3 w-3" /> {timeAgo(hero.pubDate)}
                  </span>
                </div>
                <h2 className="text-lg font-bold leading-snug text-swin-charcoal group-hover:text-swin-red transition-colors dark:text-white dark:group-hover:text-swin-red sm:text-xl">
                  {hero.title}
                </h2>
                {hero.description && (
                  <p className="line-clamp-3 text-sm text-swin-charcoal/60 dark:text-slate-300/70">
                    {hero.description}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-swin-charcoal/40 dark:text-white/40">Tap to preview</span>
                <span className="flex items-center gap-1 text-xs font-semibold text-swin-red opacity-0 transition group-hover:opacity-100">
                  Read more <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          </div>
        </button>

        {/* ── Card grid ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((item, i) => {
            const color = SOURCE_COLORS[item.source] ?? 'bg-swin-red';
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelected(item)}
                className="group flex flex-col overflow-hidden rounded-2xl border border-swin-charcoal/10 bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-white/5 dark:bg-slate-900/70"
              >
                {/* Thumbnail */}
                <div className="relative h-44 w-full flex-shrink-0 overflow-hidden">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105 group-hover:brightness-90"
                      loading="lazy"
                    />
                  ) : (
                    <ImagePlaceholder source={item.source} idx={i + 1} />
                  )}
                  {/* Source badge overlay */}
                  <span className={`absolute left-3 top-3 rounded-full ${color} px-2.5 py-0.5 text-[10px] font-bold text-white shadow`}>
                    {item.source}
                  </span>
                </div>

                {/* Card body */}
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <h3 className="line-clamp-3 text-sm font-bold leading-snug text-swin-charcoal group-hover:text-swin-red transition-colors dark:text-white dark:group-hover:text-swin-red">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="line-clamp-2 text-xs text-swin-charcoal/55 dark:text-slate-300/65">
                      {item.description}
                    </p>
                  )}
                  <div className="mt-auto flex items-center gap-1 pt-2 text-[11px] text-swin-charcoal/40 dark:text-white/35">
                    <ClockIcon className="h-3 w-3" />
                    {timeAgo(item.pubDate)}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Panel */}
      <AnimatePresence>
        {selected && (
          <ArticlePanel item={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </>
  );
}
