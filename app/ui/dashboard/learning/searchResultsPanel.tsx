'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { YouTubeAsset } from '@/app/lib/youtube/types';
import YouTubeCourseCard from './courseCard';

const container = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.09, delayChildren: 0.0 },
  },
};

const cardVariant = {
  hidden: { opacity: 0, y: 60, scale: 0.88, filter: 'blur(6px)' },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: { type: 'spring' as const, stiffness: 260, damping: 18, mass: 0.8 },
  },
};

type Props = {
  items: YouTubeAsset[];
  query: string;
  autoScroll?: boolean;
};

export default function SearchResultsPanel({ items, query, autoScroll = true }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!autoScroll || !ref.current || items.length === 0) return;
    const timer = setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
    return () => clearTimeout(timer);
  }, [autoScroll, query, items.length]);

  if (items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-swin-charcoal/20 bg-white p-8 text-center text-sm text-swin-charcoal/70 dark:border-white/20 dark:bg-slate-900/40 dark:text-slate-300/80"
      >
        <p className="mb-4">No videos found for &ldquo;{query}&rdquo;. Please refresh the page or try a different keyword.</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-xl bg-swin-red px-6 py-2.5 text-white font-semibold shadow-sm transition hover:bg-swin-red/90 focus:outline-none focus:ring-2 focus:ring-swin-red focus:ring-offset-2"
        >
          Refresh Page
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={ref}
      className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 scroll-mt-6"
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {items.map((course) => (
        <motion.div key={course.urn} variants={cardVariant}>
          <YouTubeCourseCard course={course} />
        </motion.div>
      ))}
    </motion.div>
  );
}
