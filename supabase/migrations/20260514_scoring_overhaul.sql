-- ============================================================
-- SCORING OVERHAUL
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── confessions: truth + resolution timestamp + daily prompt tag ──────────────
ALTER TABLE confessions ADD COLUMN IF NOT EXISTS is_true BOOLEAN;
ALTER TABLE confessions ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE confessions ADD COLUMN IF NOT EXISTS prompt_category TEXT;

-- Backfill existing confessions with random truth (50/50, no pattern)
UPDATE confessions SET is_true = (random() > 0.5) WHERE is_true IS NULL;

-- Reset is_resolved so cron processes all confessions fresh under new system
-- (one-time re-engagement event — existing voters will get surprise notifications)
UPDATE confessions SET is_resolved = false, resolved_at = NULL;

-- ── votes: outcome fields (populated at resolution, NULL until then) ──────────
ALTER TABLE votes ADD COLUMN IF NOT EXISTS is_correct BOOLEAN;
ALTER TABLE votes ADD COLUMN IF NOT EXISTS points_awarded INTEGER;

-- ── profiles: accuracy stats, tier, streak ────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS correct_votes INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_resolved_votes INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'Newbie' NOT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_activity_date DATE;

-- ── notifications table ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  confession_id UUID REFERENCES confessions(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL DEFAULT 'resolution',
  is_read BOOLEAN DEFAULT false NOT NULL,
  your_vote TEXT NOT NULL,
  truth TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  points_awarded INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select" ON notifications;
DROP POLICY IF EXISTS "notifications_update" ON notifications;

-- Users see only their own; only service role (API) inserts
CREATE POLICY "notifications_select" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications_update" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);
