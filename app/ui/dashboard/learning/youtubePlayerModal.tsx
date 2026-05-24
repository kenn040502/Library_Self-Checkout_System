'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

type Props = {
  open: boolean;
  title: string;
  embedSrc: string;
  youtubeUrl?: string | null;
  onClose: () => void;
};

export default function YouTubePlayerModal({ open, title, embedSrc, youtubeUrl, onClose }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-950">
        <div className="flex items-center justify-between gap-3 border-b border-swin-charcoal/10 px-4 py-3 dark:border-white/10">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-swin-charcoal dark:text-white">{title}</p>
          </div>
          <div className="flex items-center gap-2">
            {youtubeUrl ? (
              <a
                href={youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-swin-charcoal/10 px-3 py-1 text-xs font-semibold text-swin-charcoal hover:border-swin-red hover:text-swin-red dark:border-white/10 dark:text-white"
              >
                YouTube
                <ArrowTopRightOnSquareIcon className="h-4 w-4" />
              </a>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-full border border-swin-charcoal/10 p-2 text-swin-charcoal hover:border-swin-red hover:text-swin-red dark:border-white/10 dark:text-white"
              aria-label="Close"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="aspect-video w-full bg-black">
          <iframe
            className="h-full w-full"
            src={embedSrc}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    </div>
    ,
    document.body,
  );
}
