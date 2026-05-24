'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import React, { useMemo, useState } from 'react';
import {
  AcademicCapIcon,
  ClockIcon,
  PlayCircleIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import type { YouTubeAsset } from '@/app/lib/youtube/types';
import YouTubePlayerModal from './youtubePlayerModal';

const levelLabel = (value: YouTubeAsset['skillLevel']) => {
  if (!value || value === 'ALL') return 'All levels';
  if (value === 'BEGINNER') return 'Beginner';
  if (value === 'INTERMEDIATE') return 'Intermediate';
  if (value === 'ADVANCED') return 'Advanced';
  return value;
};

const formatViewCount = (count: string | null | undefined): string | null => {
  if (!count) return null;
  const num = Number(count);
  if (!Number.isFinite(num)) return null;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M views`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K views`;
  return `${num} views`;
};

type Props = {
  course: YouTubeAsset;
};

const toEmbedSrc = (course: YouTubeAsset): string | null => {
  if (course.embeddable === false) return null;
  const url = course.url?.trim();
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();

    if (course.contentType === 'PLAYLIST') {
      const list = parsed.searchParams.get('list');
      return list
        ? `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(list)}&rel=0&modestbranding=1`
        : null;
    }

    if (course.contentType !== 'VIDEO') return null;

    let videoId: string | null = null;
    if (host === 'youtu.be') {
      videoId = parsed.pathname.split('/').filter(Boolean)[0] ?? null;
    } else {
      if (parsed.pathname === '/watch') videoId = parsed.searchParams.get('v');
      if (!videoId && parsed.pathname.startsWith('/shorts/')) {
        videoId = parsed.pathname.split('/').filter(Boolean)[1] ?? null;
      }
      if (!videoId && parsed.pathname.startsWith('/embed/')) {
        videoId = parsed.pathname.split('/').filter(Boolean)[1] ?? null;
      }
    }

    return videoId
      ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?rel=0&modestbranding=1`
      : null;
  } catch {
    return null;
  }
};

export default function YouTubeCourseCard({ course }: Props) {
  const [open, setOpen] = useState(false);
  const showImage = typeof course.imageUrl === 'string' && course.imageUrl.trim().length > 0;
  const channelLabel = course.channelTitle ?? (
    course.authors && course.authors.length > 0
      ? course.authors.map((author) => author.name).filter(Boolean).join(', ')
      : null
  );
  const tagList = Array.isArray(course.topics) ? course.topics.slice(0, 3) : [];
  const viewLabel = formatViewCount(course.viewCount);
  const embedSrc = useMemo(() => toEmbedSrc(course), [course.url, course.contentType]);
  const canPlayHere = Boolean(embedSrc);

  return (
    <>
    <motion.article
      whileHover={{ y: -6, scale: 1.02, boxShadow: '0 16px 40px -8px rgba(200,35,51,0.18)' }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className={clsx(
        'group flex h-full flex-col overflow-hidden rounded-3xl border shadow-sm cursor-pointer',
        'border-swin-charcoal/10 bg-white text-swin-charcoal dark:border-white/5 dark:bg-slate-900/70 dark:text-white',
      )}
      role={canPlayHere ? 'button' : undefined}
      tabIndex={canPlayHere ? 0 : undefined}
      onClick={() => {
        if (!canPlayHere) return;
        setOpen(true);
      }}
      onKeyDown={(e) => {
        if (!canPlayHere) return;
        if (e.key === 'Enter' || e.key === ' ') setOpen(true);
      }}
    >
      <div className="relative h-40 w-full overflow-hidden">
        {showImage ? (
          <Image
            src={course.imageUrl as string}
            alt={course.title}
            fill
            sizes="(min-width: 768px) 260px, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            priority={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-r from-swin-charcoal via-swin-red to-slate-900 text-white">
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <PlayCircleIcon className="h-12 w-12 text-white/80" />
            </motion.div>
          </div>
        )}
        <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-swin-charcoal shadow">
          {course.contentType === 'PLAYLIST'
            ? 'Playlist'
            : course.contentType === 'CHANNEL'
            ? 'Channel'
            : 'Video'}
        </span>
        {/* YouTube play button overlay */}
        {canPlayHere ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-full bg-red-600/85 p-3 opacity-70 transition-opacity md:opacity-0 md:group-hover:opacity-100">
              <PlayCircleIcon className="h-8 w-8 text-white" />
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold leading-tight">{course.title}</h3>
          {course.description ? (
            <p className="line-clamp-3 text-sm text-swin-charcoal/70 dark:text-slate-300/80">
              {course.description}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-swin-charcoal/70 dark:text-slate-300/80">
          {course.durationFormatted ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-swin-charcoal/5 px-3 py-1 dark:bg-slate-700/60">
              <ClockIcon className="h-4 w-4" />
              {course.durationFormatted}
            </span>
          ) : null}
          {course.skillLevel ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-200">
              <AcademicCapIcon className="h-4 w-4" />
              {levelLabel(course.skillLevel)}
            </span>
          ) : null}
          {viewLabel ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-3 py-1 text-blue-600 dark:bg-blue-400/10 dark:text-blue-200">
              <EyeIcon className="h-4 w-4" />
              {viewLabel}
            </span>
          ) : null}
        </div>

        {tagList.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tagList.map((tag) => (
              <motion.span
                key={`${course.urn}-${tag}`}
                whileHover={{ scale: 1.08 }}
                className="rounded-full bg-swin-red/10 px-3 py-1 text-xs font-medium text-swin-red dark:bg-swin-red/20 dark:text-rose-200"
              >
                {tag}
              </motion.span>
            ))}
          </div>
        ) : null}

        <div className="mt-auto flex items-center justify-between pt-2 text-sm">
          {channelLabel ? (
            <p className="text-swin-charcoal/60 dark:text-slate-300/80">
              <span className="font-medium text-swin-charcoal dark:text-white">{channelLabel}</span>
            </p>
          ) : (
            <span className="text-swin-charcoal/50 dark:text-slate-400">YouTube video</span>
          )}
          {!canPlayHere && course.url ? (
            <a
              href={course.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 rounded-full bg-red-600 px-4 py-1.5 text-xs font-semibold text-white"
            >
              {course.embeddable === false ? 'Open on YouTube' : 'YouTube'}
            </a>
          ) : null}
        </div>
      </div>
    </motion.article>

    {canPlayHere && embedSrc ? (
      <YouTubePlayerModal
        open={open}
        title={course.title}
        embedSrc={embedSrc}
        youtubeUrl={course.url}
        onClose={() => setOpen(false)}
      />
    ) : null}
    </>
  );
}
