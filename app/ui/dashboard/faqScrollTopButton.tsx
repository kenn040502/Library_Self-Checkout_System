'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';

type FaqScrollTopButtonProps = {
  className?: string;
};

export default function FaqScrollTopButton({ className }: FaqScrollTopButtonProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      aria-label="Scroll to top"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={clsx(
        'fixed bottom-24 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-swin-red text-white shadow-lg shadow-swin-red/30 transition-all duration-300 hover:bg-swin-red/90 hover:scale-110 active:scale-95 md:bottom-8 md:right-8',
        className,
      )}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
        <path fillRule="evenodd" d="M10 17a.75.75 0 0 1-.75-.75V5.612L5.29 9.77a.75.75 0 0 1-1.08-1.04l5.25-5.5a.75.75 0 0 1 1.08 0l5.25 5.5a.75.75 0 1 1-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0 1 10 17Z" clipRule="evenodd" />
      </svg>
    </button>
  );
}
