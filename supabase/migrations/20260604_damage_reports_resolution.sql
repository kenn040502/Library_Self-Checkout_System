-- ============================================================
-- Damage report resolution tracking
-- Adds resolved_at / resolved_by / resolution_notes so staff
-- can mark a repaired copy as back-in-circulation without
-- deleting the historical damage record.
-- ============================================================

ALTER TABLE "DamageReports"
  ADD COLUMN IF NOT EXISTS resolved_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_by      UUID REFERENCES "Users"(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolution_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_damage_reports_resolved_at
  ON "DamageReports"(resolved_at)
  WHERE resolved_at IS NOT NULL;
