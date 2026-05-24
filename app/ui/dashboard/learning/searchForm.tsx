'use client';

import { useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid';

type SearchDefaults = {
  query?: string;
  difficulty?: string;
};

export default function YouTubeSearchForm({
  defaults,
}: {
  defaults: SearchDefaults;
}) {
  const query = defaults.query ?? '';
  const difficulty = defaults.difficulty ?? 'ALL';
  const inputRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (inputRef.current) inputRef.current.value = query;
    if (selectRef.current) selectRef.current.value = difficulty;
  }, [query, difficulty]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = inputRef.current?.value.trim() ?? '';
    const diff = selectRef.current?.value ?? 'ALL';
    const params = new URLSearchParams({ view: 'youtube' });
    if (q) params.set('q', q);
    if (diff && diff !== 'ALL') params.set('difficulty', diff);
    router.push(`/dashboard/learning/youtube?${params.toString()}`);
  };

  const handleReset = () => {
    if (inputRef.current) inputRef.current.value = '';
    if (selectRef.current) selectRef.current.value = 'ALL';
    router.push('/dashboard/learning/youtube?view=youtube');
  };

  return (
    <form
      className="grid gap-4 rounded-3xl border border-swin-charcoal/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/60"
      onSubmit={handleSubmit}
    >
      <label className="text-sm font-medium text-swin-charcoal dark:text-white">
        Search YouTube tutorials
        <div className="group mt-2 flex items-center gap-3 rounded-2xl border border-swin-charcoal/10 bg-swin-charcoal/5 px-4 py-3.5 transition-all focus-within:border-swin-red focus-within:bg-white focus-within:ring-4 focus-within:ring-swin-red/5 dark:border-white/10 dark:bg-white/5 dark:focus-within:bg-slate-900">
          <MagnifyingGlassIcon className="h-5 w-5 text-swin-charcoal/40 transition-colors group-focus-within:text-swin-red dark:text-white/30" />
          <input
            ref={inputRef}
            type="search"
            defaultValue={query}
            placeholder='Try "Python" or "project management"'
            className="w-full border-none bg-transparent text-sm text-swin-charcoal placeholder:text-swin-charcoal/40 focus:outline-none focus:ring-0 dark:text-white dark:placeholder:text-white/30"
          />
        </div>
      </label>

      <div className="grid gap-4 md:grid-cols-[minmax(0,220px)_auto] md:items-end">
        <label className="text-sm font-medium text-swin-charcoal dark:text-white">
          Difficulty
          <select
            ref={selectRef}
            defaultValue={difficulty}
            className="mt-2 w-full rounded-2xl border border-swin-charcoal/10 bg-white px-4 py-3 text-sm text-swin-charcoal shadow-sm focus:border-swin-red focus:outline-none dark:border-white/10 dark:bg-slate-900 dark:text-white"
          >
            <option value="ALL">All levels</option>
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
          </select>
        </label>
        <div className="flex gap-3">
          <button
            type="submit"
            className="flex-1 rounded-2xl bg-swin-red px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-swin-red/90"
          >
            Search
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-2xl border border-swin-charcoal/15 px-4 py-3 text-sm font-semibold text-swin-charcoal transition hover:border-swin-red hover:text-swin-red dark:border-white/20 dark:text-white dark:hover:text-swin-red"
          >
            Reset
          </button>
        </div>
      </div>
    </form>
  );
}
