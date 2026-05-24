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
      className="grid gap-3 rounded-2xl border border-swin-charcoal/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/60"
      onSubmit={handleSubmit}
    >
      <div className="group flex items-center gap-2 rounded-xl border border-swin-charcoal/10 bg-swin-charcoal/5 px-3 py-2 transition-all focus-within:border-swin-red focus-within:bg-white focus-within:ring-4 focus-within:ring-swin-red/5 dark:border-white/10 dark:bg-white/5 dark:focus-within:bg-slate-900">
        <MagnifyingGlassIcon className="h-4 w-4 flex-shrink-0 text-swin-charcoal/40 transition-colors group-focus-within:text-swin-red dark:text-white/30" />
        <input
          ref={inputRef}
          type="search"
          defaultValue={query}
          placeholder='Try "Python" or "project management"'
          className="w-full border-none bg-transparent text-xs text-swin-charcoal placeholder:text-swin-charcoal/40 focus:outline-none focus:ring-0 dark:text-white dark:placeholder:text-white/30"
        />
      </div>

      <div className="flex items-center gap-2">
        <select
          ref={selectRef}
          defaultValue={difficulty}
          className="flex-1 rounded-xl border border-swin-charcoal/10 bg-white px-3 py-2 text-xs text-swin-charcoal shadow-sm focus:border-swin-red focus:outline-none dark:border-white/10 dark:bg-slate-900 dark:text-white"
        >
          <option value="ALL">All levels</option>
          <option value="BEGINNER">Beginner</option>
          <option value="INTERMEDIATE">Intermediate</option>
          <option value="ADVANCED">Advanced</option>
        </select>
        <button
          type="submit"
          className="rounded-xl bg-swin-red px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-swin-red/90"
        >
          Search
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="rounded-xl border border-swin-charcoal/15 px-4 py-2 text-xs font-semibold text-swin-charcoal transition hover:border-swin-red hover:text-swin-red dark:border-white/20 dark:text-white dark:hover:text-swin-red"
        >
          Reset
        </button>
      </div>
    </form>
  );
}
