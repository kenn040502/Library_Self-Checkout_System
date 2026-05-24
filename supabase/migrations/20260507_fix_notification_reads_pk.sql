-- ============================================================
-- Fix NotificationReads schema drift
--
-- The original migration (20260326_notifications.sql) declared
-- PRIMARY KEY (notification_id, user_id), but the actual prod DB
-- ended up with PRIMARY KEY on notification_id alone — meaning a
-- given notification could only ever be marked read by one user,
-- and bulk upserts using `onConflict: 'notification_id,user_id'`
-- failed with "no unique or exclusion constraint matching the
-- ON CONFLICT specification". That broke the entire mark-all-read
-- flow silently (PATCH returned 200 because the helper logged but
-- did not throw).
--
-- This migration brings the table in line with what the app expects.
-- ============================================================

-- 1) Drop the meaningless gen_random_uuid() default — notification_id
--    must come from the application as the FK to Notifications.id.
ALTER TABLE "NotificationReads"
  ALTER COLUMN notification_id DROP DEFAULT;

-- 2) Drop the wrong single-column primary key (idempotent).
ALTER TABLE "NotificationReads"
  DROP CONSTRAINT IF EXISTS "NotificationReads_pkey";

-- 3) Add the composite primary key the app expects. This unblocks
--    .upsert(..., { onConflict: 'notification_id,user_id' }) used by
--    markNotificationsReadByIds / markAllNotificationsRead.
ALTER TABLE "NotificationReads"
  ADD CONSTRAINT "NotificationReads_pkey"
  PRIMARY KEY (notification_id, user_id);
