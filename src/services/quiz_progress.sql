-- ============================================================
-- quiz_progress table
-- Stores incomplete quiz progress so users can resume later
-- ============================================================

CREATE TABLE IF NOT EXISTS quiz_progress (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answers          JSONB NOT NULL DEFAULT '{}',
  current_step     INTEGER NOT NULL DEFAULT 0,
  completed_at     TIMESTAMPTZ,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure a user can only have one incomplete quiz session at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_quiz_progress_user_incomplete
  ON quiz_progress (user_id)
  WHERE completed_at IS NULL;

-- Index for fast lookup of incomplete progress
CREATE INDEX IF NOT EXISTS idx_quiz_progress_user_id
  ON quiz_progress (user_id);

-- Index for completed sessions (for future analytics)
CREATE INDEX IF NOT EXISTS idx_quiz_progress_completed_at
  ON quiz_progress (completed_at);

-- Trigger to auto-update updated_at on row update
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_quiz_progress_updated_at
  BEFORE UPDATE ON quiz_progress
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
