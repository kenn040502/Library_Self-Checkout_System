'use client';

import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import type { YouTubeTopicCollection } from '@/app/lib/youtube/types';
import YouTubeCourseCard from './courseCard';

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

function CollectionSection({
  definition,
  result,
  browseHref,
  index,
}: {
  definition: YouTubeTopicCollection['definition'];
  result: YouTubeTopicCollection['result'];
  browseHref: string;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.45, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-4 rounded-3xl border border-swin-charcoal/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/50"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-swin-charcoal/60 dark:text-slate-400">
            Spotlight topic
          </p>
          <h3 className="text-lg font-semibold text-swin-charcoal dark:text-white">{definition.title}</h3>
          {definition.description ? (
            <p className="text-sm text-swin-charcoal/70 dark:text-slate-300/80">{definition.description}</p>
          ) : null}
        </div>
        <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
          <Link
            href={browseHref}
            className="rounded-full border border-swin-charcoal/10 px-4 py-2 text-sm font-medium text-swin-charcoal transition hover:border-swin-red hover:text-swin-red dark:border-white/20 dark:text-white"
          >
            Browse all
          </Link>
        </motion.div>
      </div>

      {result.items.length > 0 ? (
        <motion.div
          className="grid gap-5 md:grid-cols-2 xl:grid-cols-4"
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={{ visible: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } }, hidden: {} }}
        >
          {result.items.map((course) => (
            <motion.div key={course.urn} variants={cardVariant}>
              <YouTubeCourseCard course={course} />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="rounded-2xl border border-dashed border-swin-charcoal/20 bg-white/40 p-6 text-sm text-swin-charcoal/70 dark:border-white/15 dark:bg-slate-900/30 dark:text-slate-300/80">
          No videos found for this topic. Try the search form above.
        </div>
      )}
    </motion.div>
  );
}

type Props = {
  collections: Array<YouTubeTopicCollection>;
  difficulty: string;
};

const buildBrowseHref = (query: string, difficulty: string) => {
  const params = new URLSearchParams();
  params.set('q', query);
  if (difficulty && difficulty !== 'ALL') params.set('difficulty', difficulty);
  return `/dashboard/learning/youtube?${params.toString()}`;
};

export default function CollectionsPanel({ collections, difficulty }: Props) {
  if (!collections.length) {
    return (
      <div className="rounded-3xl border border-dashed border-swin-charcoal/20 bg-white p-6 text-center text-sm text-swin-charcoal/70 dark:border-white/20 dark:bg-slate-900/40 dark:text-slate-300/80">
        No videos found. Try the search form above.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {collections.map(({ definition, result }, index) => (
        <CollectionSection
          key={definition.key}
          definition={definition}
          result={result}
          browseHref={buildBrowseHref(definition.query, difficulty)}
          index={index}
        />
      ))}
    </div>
  );
}
