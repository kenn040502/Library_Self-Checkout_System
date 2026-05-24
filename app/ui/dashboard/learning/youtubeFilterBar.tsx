'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AdjustmentsHorizontalIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { YouTubeLevel } from '@/app/lib/youtube/types';

const TOPICS = [
  { id: 'eng',      label: 'Engineering',       query: 'engineering' },
  { id: 'cs',       label: 'Computer Science',   query: 'computer science' },
  { id: 'security', label: 'Cyber Security',     query: 'cyber security' },
  { id: 'ds',       label: 'Data Science',       query: 'data science' },
  { id: 'finance',  label: 'Business & Finance', query: 'business finance' },
  { id: 'design',   label: 'Design',             query: 'design' },
  { id: 'math',     label: 'Mathematics',        query: 'mathematics' },
  { id: 'science',  label: 'Science',            query: 'physics chemistry biology' },
  { id: 'lang',     label: 'Languages',          query: 'language learning' },
  { id: 'health',   label: 'Health',             query: 'health medicine wellness' },
] as const;

type TopicId = typeof TOPICS[number]['id'];
const STORAGE_KEY = 'yt-interests';
const ALL_IDS = TOPICS.map((t) => t.id) as TopicId[];

export default function YouTubeFilterBar({
  activeQuery,
  difficulty,
}: {
  activeQuery: string;
  difficulty: YouTubeLevel | 'ALL';
}) {
  const [interests, setInterests] = useState<TopicId[]>(ALL_IDS);
  const [pending,   setPending]   = useState<TopicId[]>(ALL_IDS);
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw !== null) {
        const saved = JSON.parse(raw) as TopicId[];
        setInterests(saved);
        setPending(saved);
      }
    } catch { /* keep defaults */ }
  }, []);

  const openPicker = useCallback(() => {
    setPending(interests);
    setShowPicker(true);
  }, [interests]);

  const closePicker = useCallback(() => setShowPicker(false), []);

  useEffect(() => {
    if (!showPicker) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        closePicker();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPicker, closePicker]);

  const toggle = useCallback((id: TopicId) => {
    setPending((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }, []);

  const toggleAll = useCallback(() => {
    setPending((prev) => prev.length === TOPICS.length ? [] : ALL_IDS);
  }, []);

  const apply = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
    setInterests(pending);
    setShowPicker(false);
  }, [pending]);

  const buildHref = (query: string) => {
    const p = new URLSearchParams({ view: 'youtube', q: query });
    if (difficulty && difficulty !== 'ALL') p.set('difficulty', difficulty);
    return `/dashboard/learning/youtube?${p.toString()}`;
  };

  const visibleTopics = TOPICS.filter((t) => interests.includes(t.id));

  return (
    <div className="relative" ref={pickerRef}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={showPicker ? closePicker : openPicker}
          aria-label="Customise interests"
          className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-swin-charcoal/10 text-swin-charcoal transition hover:bg-swin-charcoal/20 active:scale-95 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
        >
          <AdjustmentsHorizontalIcon className="h-4 w-4" />
        </button>

        <div className="flex gap-2 overflow-x-auto scrollbar-none flex-1 -mr-4 pr-4 sm:mr-0 sm:pr-0">
          {visibleTopics.length === 0 ? (
            <span className="py-1.5 px-1 text-xs text-swin-charcoal/40 dark:text-white/30">
              No topics selected — tap the filter icon to add some
            </span>
          ) : (
            visibleTopics.map((t) => {
              const active = activeQuery === t.query;
              return (
                <Link
                  key={t.id}
                  href={buildHref(t.query)}
                  className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-150 active:scale-[0.96] ${
                    active
                      ? 'bg-swin-red text-white shadow-sm shadow-swin-red/30'
                      : 'bg-swin-charcoal/[0.08] text-swin-charcoal/60 hover:bg-swin-charcoal/[0.12] hover:text-swin-charcoal dark:bg-white/[0.08] dark:text-white/50 dark:hover:bg-white/[0.14] dark:hover:text-white'
                  }`}
                >
                  {t.label}
                </Link>
              );
            })
          )}
        </div>
      </div>

      {showPicker && (
        <div className="absolute left-0 top-full mt-2 z-30 w-72 rounded-2xl border border-swin-charcoal/10 bg-white shadow-lg shadow-black/10 p-4 dark:border-white/10 dark:bg-neutral-900">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-swin-charcoal dark:text-white">Your topics</span>
            <div className="flex items-center gap-2">
              {pending.length > 0 && (
                <span className="text-[11px] text-swin-charcoal/40 dark:text-white/40">
                  {pending.length} selected
                </span>
              )}
              <button
                type="button"
                onClick={closePicker}
                aria-label="Close"
                className="flex h-6 w-6 items-center justify-center rounded-full bg-swin-charcoal/10 text-swin-charcoal hover:bg-swin-charcoal/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 transition"
              >
                <XMarkIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {TOPICS.map((t) => {
              const on = pending.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggle(t.id)}
                  className={`w-full rounded-full px-3 py-1.5 text-xs font-semibold text-center transition-all duration-150 active:scale-[0.96] ${
                    on
                      ? 'bg-swin-red text-white shadow-sm shadow-swin-red/30'
                      : 'bg-swin-charcoal/[0.08] text-swin-charcoal/60 hover:bg-swin-charcoal/[0.12] hover:text-swin-charcoal dark:bg-white/[0.08] dark:text-white/50 dark:hover:bg-white/[0.14] dark:hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={toggleAll}
              className="flex-none rounded-full border border-swin-charcoal/15 px-4 py-2 text-xs font-semibold text-swin-charcoal/60 hover:text-swin-charcoal hover:border-swin-charcoal/30 dark:border-white/10 dark:text-white/50 dark:hover:text-white dark:hover:border-white/20 transition"
            >
              {pending.length === TOPICS.length ? 'Clear all' : 'Select all'}
            </button>
            <button
              type="button"
              onClick={apply}
              className="flex-1 rounded-full bg-swin-red py-2 text-xs font-bold text-white transition hover:bg-swin-red/90 active:scale-95"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
