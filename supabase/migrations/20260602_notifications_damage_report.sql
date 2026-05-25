-- ============================================================
-- Add 'damage_report' to Notifications.type allowed values.
--
-- Used when staff submits a new damage report (action='reported'),
-- when admin edits one (action='updated'), and when staff/admin
-- deletes one (action='deleted'). Differentiated via metadata.action.
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
    'damage_report'
  ));
