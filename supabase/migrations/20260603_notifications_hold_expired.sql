-- ============================================================
-- Add 'hold_expired' to Notifications.type allowed values.
--
-- Used by the /api/holds/expire-check sweeper when a 'ready' hold's
-- expires_at deadline passes without the patron picking up the book.
-- Both the patron AND staff/admin receive a notification so a staff
-- member can manually cancel the stale hold and free up the queue.
--
-- Run this in your Supabase SQL editor.
-- ============================================================

ALTER TABLE "Notifications"
  DROP CONSTRAINT IF EXISTS "Notifications_type_check";
ALTER TABLE "Notifications"
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE "Notifications"
  ADD CONSTRAINT "Notifications_type_check"
  CHECK (type IN (
    'checkout',
    'checkin',
    'loan_confirmed',
    'due_soon',
    'hold_ready',
    'hold_placed',
    'hold_cancelled',
    'hold_expired',
    'damage_report'
  ));
