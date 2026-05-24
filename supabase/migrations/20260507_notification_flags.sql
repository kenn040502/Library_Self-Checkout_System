-- ============================================================
-- Notification Flags (star/flag per user per notification)
-- Run this in your Supabase SQL editor
-- ============================================================

CREATE TABLE IF NOT EXISTS "NotificationFlags" (
  notification_id UUID        NOT NULL REFERENCES "Notifications"(id) ON DELETE CASCADE,
  user_id         TEXT        NOT NULL,
  flagged_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (notification_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_flags_user
  ON "NotificationFlags"(user_id);
