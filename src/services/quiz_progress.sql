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

-- Ensure the saveQuizProgress upsert can find a unique row by user_id
-- so the app can only have one quiz progress record per user at a time.
CREATE UNIQUE INDEX IF NOT EXISTS idx_quiz_progress_user_id ON quiz_progress (user_id);

-- Index for fast lookup of incomplete progress
CREATE INDEX IF NOT EXISTS idx_quiz_progress_user_id
  ON quiz_progress (user_id);

-- Index for completed sessions (for future analytics)
CREATE INDEX IF NOT EXISTS idx_quiz_progress_completed_at
  ON quiz_progress (completed_at);

-- Ensure RLS is enabled on quiz_progress
ALTER TABLE quiz_progress ENABLE ROW LEVEL SECURITY;

-- Policy: Allow users to insert their own quiz progress
CREATE POLICY quiz_progress_insert_policy
ON quiz_progress
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy: Allow users to update their own quiz progress
CREATE POLICY quiz_progress_update_policy
ON quiz_progress
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy: Allow users to select their own quiz progress
CREATE POLICY quiz_progress_select_policy
ON quiz_progress
FOR SELECT
TO authenticated
USING (user_id = auth.uid());
