'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
  ChatBubbleLeftIcon,
  ClockIcon,
  HeartIcon,
  HashtagIcon,
} from '@heroicons/react/24/outline';

export type DevToArticle = {
  id: number;
  title: string;
  description: string;
  url: string;
  cover_image: string | null;
  social_image: string | null;
  reading_time_minutes: number;
  public_reactions_count: number;
  comments_count: number;
  readable_publish_date: string;
  tag_list: string[];
  user: {
    name: string;
    username: string;
    profile_image_90: string | null;
  };
};

function formatCount(n: number): string {
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

// ── Article Panel (slide-up / side sheet) ─────────────────
function ArticlePanel({
  article,
  onClose,
}: {
  article: DevToArticle;
  onClose: () => void;
}) {
  const coverImg = article.cover_image ?? article.social_image;
  const avatar   = article.user?.profile_image_90;

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      />

      {/* Panel */}
      <motion.div
        className="relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-slate-950 sm:max-w-2xl sm:rounded-3xl"
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 30 }}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-swin-charcoal/20 dark:bg-white/20" />
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition hover:bg-black/50"
          aria-label="Close"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>

        {/* Cover image */}
        {coverImg && (
          <div className="relative aspect-[16/7] w-full flex-shrink-0 overflow-hidden">
            <img
              src={coverImg}
              alt={article.title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Author row */}
          <div className="flex items-center gap-3">
            {avatar ? (
              <img
                src={avatar}
                alt={article.user?.name}
                className="h-10 w-10 rounded-full object-cover ring-2 ring-swin-red/20"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-swin-red/10 text-sm font-bold text-swin-red">
                {(article.user?.name ?? 'A')[0]}
              </div>
            )}
            <div>
              <p className="font-semibold text-swin-charcoal dark:text-white">
                {article.user?.name}
              </p>
              <p className="text-xs text-swin-charcoal/50 dark:text-white/40">
                @{article.user?.username} · {article.readable_publish_date}
              </p>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold leading-snug text-swin-charcoal dark:text-white">
            {article.title}
          </h2>

          {/* Description */}
          {article.description && (
            <p className="text-base text-swin-charcoal/70 dark:text-slate-300/80 leading-relaxed">
              {article.description}
            </p>
          )}

          {/* Tags */}
          {article.tag_list?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {article.tag_list.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 rounded-full bg-swin-red/8 px-3 py-1 text-xs font-semibold text-swin-red dark:bg-swin-red/15 dark:text-rose-300"
                >
                  <HashtagIcon className="h-3 w-3" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-6 rounded-2xl border border-swin-charcoal/8 bg-swin-charcoal/3 px-5 py-3 text-sm text-swin-charcoal/60 dark:border-white/8 dark:bg-white/3 dark:text-white/50">
            <span className="flex items-center gap-2">
              <HeartIcon className="h-4 w-4 text-swin-red" />
              <span className="font-semibold text-swin-charcoal dark:text-white">
                {formatCount(article.public_reactions_count)}
              </span>
              reactions
            </span>
            <span className="flex items-center gap-2">
              <ChatBubbleLeftIcon className="h-4 w-4" />
              <span className="font-semibold text-swin-charcoal dark:text-white">
                {formatCount(article.comments_count)}
              </span>
              comments
            </span>
            <span className="flex items-center gap-2">
              <ClockIcon className="h-4 w-4" />
              <span className="font-semibold text-swin-charcoal dark:text-white">
                {article.reading_time_minutes} min
              </span>
              read
            </span>
          </div>

          {/* CTA */}
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-swin-red py-4 text-base font-bold text-white shadow-lg shadow-swin-red/25 transition hover:bg-swin-red/90"
          >
            Read Full Article on DEV Community
            <ArrowTopRightOnSquareIcon className="h-5 w-5" />
          </a>

          {/* Close Panel button */}
          <button
            type="button"
            onClick={onClose}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-swin-charcoal/15 py-3.5 text-sm font-semibold text-swin-charcoal transition hover:border-swin-red hover:text-swin-red dark:border-white/15 dark:text-white dark:hover:border-swin-red dark:hover:text-swin-red"
          >
            <XMarkIcon className="h-4 w-4" />
            Close Panel
          </button>

        </div>
      </motion.div>
    </div>
  );
}

// ── GRADIENTS ─────────────────────────────────────────────
const GRADIENTS = [
  'from-violet-500 to-indigo-500',
  'from-swin-red to-orange-400',
  'from-cyan-500 to-blue-500',
  'from-emerald-500 to-teal-400',
  'from-pink-500 to-rose-400',
  'from-amber-500 to-yellow-400',
  'from-fuchsia-500 to-purple-500',
  'from-sky-500 to-cyan-400',
];

// ── Main grid (client) ─────────────────────────────────────
export default function DevToGrid({ articles }: { articles: DevToArticle[] }) {
  const [selected, setSelected] = useState<DevToArticle | null>(null);

  return (
    <>
      {/* Masonry grid */}
      <div className="columns-2 gap-2 sm:columns-2 sm:gap-4 xl:columns-3 2xl:columns-4">
        {articles.map((article, i) => {
          const gradient = GRADIENTS[i % GRADIENTS.length];
          const hasCover = Boolean(article.cover_image);
          const avatar   = article.user?.profile_image_90 ?? null;

          return (
            <button
              key={article.id}
              type="button"
              onClick={() => setSelected(article)}
              className="group mb-2 sm:mb-4 block w-full break-inside-avoid overflow-hidden rounded-2xl sm:rounded-3xl border border-swin-charcoal/10 bg-white text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-white/5 dark:bg-slate-900/70"
            >
              {/* Cover / gradient */}
              <div className="relative overflow-hidden">
                {hasCover ? (
                  <img
                    src={article.cover_image!}
                    alt={article.title}
                    className="w-full object-cover transition duration-500 group-hover:scale-105 group-hover:brightness-90"
                    loading="lazy"
                  />
                ) : (
                  <div className={`flex h-24 sm:h-32 w-full items-center justify-center bg-gradient-to-br ${gradient} p-3 text-center text-white`}>
                    <p className="line-clamp-2 text-[11px] sm:text-sm font-bold leading-tight">{article.title}</p>
                  </div>
                )}
                <span className="absolute right-2 top-2 sm:right-3 sm:top-3 flex items-center gap-0.5 sm:gap-1 rounded-full bg-black/60 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[10px] font-semibold text-white backdrop-blur-sm">
                  <ClockIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  {article.reading_time_minutes}m
                </span>
              </div>

              {/* Body */}
              <div className="flex flex-col gap-2 sm:gap-3 p-2.5 sm:p-4">
                {/* Author row */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {avatar ? (
                    <img src={avatar} alt={article.user?.name ?? ''} className="h-5 w-5 sm:h-7 sm:w-7 rounded-full object-cover ring-2 ring-swin-red/20" loading="lazy" />
                  ) : (
                    <div className="flex h-5 w-5 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-swin-red/10 text-[10px] sm:text-xs font-bold text-swin-red">
                      {(article.user?.name ?? 'A')[0]}
                    </div>
                  )}
                  <span className="truncate text-[10px] sm:text-xs font-semibold text-swin-charcoal dark:text-white">
                    {article.user?.name ?? 'Unknown'}
                  </span>
                  <span className="ml-auto flex-shrink-0 text-[9px] sm:text-[10px] text-swin-charcoal/40 dark:text-white/40 hidden sm:block">
                    {article.readable_publish_date}
                  </span>
                </div>

                {/* Title */}
                <h3 className="line-clamp-2 text-xs sm:text-sm font-bold leading-snug text-swin-charcoal dark:text-white">
                  {article.title}
                </h3>

                {/* Description — hidden on mobile for compact Rednote look */}
                {article.description && (
                  <p className="hidden sm:block line-clamp-2 text-xs text-swin-charcoal/60 dark:text-slate-300/70">
                    {article.description}
                  </p>
                )}

                {/* Tags — show fewer on mobile */}
                {article.tag_list?.length > 0 && (
                  <div className="flex flex-wrap gap-1 sm:gap-1.5">
                    {article.tag_list.slice(0, 2).map((tag) => (
                      <span key={tag} className="rounded-full bg-swin-red/8 px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold text-swin-red dark:bg-swin-red/15 dark:text-rose-300">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Footer stats */}
                <div className="flex items-center gap-2 sm:gap-4 border-t border-swin-charcoal/8 pt-2 sm:pt-3 text-xs text-swin-charcoal/50 dark:border-white/8 dark:text-white/40">
                  <span className="flex items-center gap-0.5 sm:gap-1">
                    <HeartIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-swin-red" />
                    <span className="text-[10px] sm:text-xs">{formatCount(article.public_reactions_count ?? 0)}</span>
                  </span>
                  <span className="flex items-center gap-0.5 sm:gap-1">
                    <ChatBubbleLeftIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span className="text-[10px] sm:text-xs">{formatCount(article.comments_count ?? 0)}</span>
                  </span>
                  <span className="ml-auto text-[9px] sm:text-[10px] font-medium text-swin-red opacity-0 transition group-hover:opacity-100">
                    Tap →
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Modal portal */}
      <AnimatePresence>
        {selected && (
          <ArticlePanel
            article={selected}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
