'use client';

import { useEffect } from 'react';

/**
 * Fail-safe: ensure the page remains scrollable.
 * In dev (Fast Refresh / Turbopack), modal cleanups can be skipped, leaving `body { overflow: hidden }`.
 * This component resets body overflow on mount and unmount.
 */
export default function ScrollUnlock() {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return null;
}

