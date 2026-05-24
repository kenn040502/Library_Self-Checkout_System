-- ============================================================
-- Add 'hold_cancelled' to the Notifications.type allowed values.
--
-- The existing CHECK constraint (last updated by
-- 20260326_notifications_user.sql) only permits:
--   checkout, checkin, loan_confirmed, due_soon, hold_ready, hold_placed
--
-- This silently blocked every `createNotification(..., 'hold_cancelled', ...)`
-- and `createUserNotification(..., 'hold_cancelled', ...)` call, so patrons
-- and staff never received the hold-cancellation notifications.
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
    'hold_cancelled'
  ));
