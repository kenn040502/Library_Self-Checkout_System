'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { SparklesIcon } from '@heroicons/react/24/outline';

const guideTopics = [
  {
    id: 'how-to-borrow',
    label: 'How to Borrow a Book',
    description: 'Step-by-step checkout walkthrough',
  },
  {
    id: 'due-dates',
    label: 'Loan Period & Due Dates',
    description: '14-day loans, renewals & late returns',
  },
  {
    id: 'returning',
    label: 'Returning Books',
    description: 'How to return and verify the record',
  },
  {
    id: 'scanner',
    label: 'Using the Barcode Scanner',
    description: 'Camera scan tips & troubleshooting',
  },
  {
    id: 'account',
    label: 'Account & Notifications',
    description: 'Sign-in, profile and reminders',
  },
];

const quickActions = [
  { label: 'Borrow a book', href: '/dashboard/book/checkout' },
  { label: 'Camera scan', href: '/dashboard/cameraScan' },
  { label: 'Active loans', href: '/dashboard' },
];

export default function FaqFloatingHelp() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isOnFaqPage = pathname === '/dashboard/faq';
  const isReelsView = pathname === '/dashboard/learning/youtube' && searchParams.get('view') === 'reels';

  const topicHref = (id: string) =>
    isOnFaqPage ? `#${id}-title` : `/dashboard/faq#${id}-title`;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <div ref={panelRef} className={`fixed bottom-40 right-4 z-[60] flex flex-col items-end gap-3 md:bottom-24 md:right-8 ${isReelsView ? 'hidden' : ''}`}>
      {/* Panel */}
      {open && (
        <div
          className="w-60 rounded-card border border-hairline bg-surface-card shadow-[0_4px_16px_rgba(20,20,19,0.08)] dark:border-dark-hairline dark:bg-dark-surface-card"
          style={{ animation: 'faqPanelIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both' }}
        >
          <style>{`
            @keyframes faqPanelIn {
              from { opacity: 0; transform: translateY(12px) scale(0.97); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>

          {/* Header */}
          <div className="flex items-center justify-between rounded-t-card bg-primary px-3 py-2">
            <p className="font-sans text-[11px] font-semibold text-on-primary">Student Guide</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close panel"
              className="flex h-6 w-6 items-center justify-center rounded-full text-on-primary/70 transition hover:bg-on-primary/15 hover:text-on-primary"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </div>

          {/* Guide topics */}
          <div className="p-2">
            <ul className="space-y-0.5">
              {guideTopics.map((topic, index) => (
                <li key={topic.id}>
                  <Link
                    href={topicHref(topic.id)}
                    onClick={() => setOpen(false)}
                    className="group flex items-center gap-2 rounded-btn px-2 py-1.5 transition hover:bg-primary/5 dark:hover:bg-primary/10"
                  >
                    <span className="flex h-4 w-4 flex-none items-center justify-center rounded-full bg-surface-cream-strong font-sans text-[9px] font-bold text-muted group-hover:bg-primary group-hover:text-on-primary dark:bg-dark-surface-strong dark:text-on-dark-soft">
                      {index + 1}
                    </span>
                    <p className="font-sans text-[11px] font-medium text-ink group-hover:text-primary dark:text-on-dark dark:group-hover:text-dark-primary">
                      {topic.label}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Divider */}
          <div className="mx-3 border-t border-hairline dark:border-dark-hairline" />

          {/* Contact footer */}
          <div className="rounded-b-card px-3 py-2">
            <p className="font-sans text-[10px] text-muted dark:text-on-dark-soft">
              Visit Level 1 desk or{' '}
              <a
                href="mailto:library@swinburne.edu.my"
                className="font-semibold text-primary hover:underline"
              >
                email us
              </a>
            </p>
          </div>
        </div>
      )}

      {/* AI recommendations button — mobile only */}
      <Link
        href="/dashboard/recommendations"
        aria-label="AI recommendations"
        className="md:hidden flex h-12 w-12 items-center justify-center rounded-full bg-primary text-on-primary shadow-lg transition-all duration-300 hover:bg-primary-active hover:scale-110 active:scale-95 dark:bg-dark-primary"
      >
        <SparklesIcon className="h-5 w-5" />
      </Link>

      {/* FAB trigger */}
      <button
        type="button"
        aria-label={open ? 'Close help panel' : 'Open student guide'}
        onClick={() => setOpen((v) => !v)}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-ink text-on-dark shadow-lg transition-all duration-300 hover:bg-primary hover:scale-110 active:scale-95 dark:bg-dark-surface-strong dark:hover:bg-primary"
        suppressHydrationWarning
      >
        {open ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
          </svg>
        )}
      </button>
    </div>
  );
}
