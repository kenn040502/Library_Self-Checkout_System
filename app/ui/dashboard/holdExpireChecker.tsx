'use client';

import { useEffect } from 'react';

/**
 * Invisible component — fires once on mount to sweep for 'ready' holds whose
 * pickup deadline has passed, creating per-patron and staff-broadcast
 * notifications via /api/holds/expire-check. Idempotent server-side so it's
 * safe to fire on every dashboard load.
 */
export default function HoldExpireChecker() {
  useEffect(() => {
    fetch('/api/holds/expire-check', { method: 'POST' }).catch(() => {
      // Non-critical — silently ignore failures
    });
  }, []);

  return null;
}
