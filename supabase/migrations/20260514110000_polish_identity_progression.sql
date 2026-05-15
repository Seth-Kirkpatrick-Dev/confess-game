-- ============================================================
-- POLISH, IDENTITY & PROGRESSION
-- Phases 1–4 schema: reports, reactions, achievements,
-- leaderboard history, cosmetics, identity columns.
-- ============================================================

-- ── Security: lock down profiles UPDATE ────────────────────────────────────────
-- All profile mutations go through service-role API routes.
-- Clients (anon key) must not be able to self-edit tier, points, streaks, etc.
DROP POLICY IF EXISTS "profiles_update" ON profiles;

-- ── Phase 1: Author soft-delete (pre-resolution only) ─────────────────────────
-- USING: only the author's own unresolved, not-yet-deleted rows
-- WITH CHECK: the only allowed mutation is flipping is_deleted to true
DROP POLICY IF EXISTS "confessions_delete_by_author" ON confessions;
CREATE POLICY "confessions_delete_by_author" ON confessions FOR UPDATE
  USING  (auth.uid() = user_id AND is_resolved = false AND is_deleted = false)
  WITH CHECK (is_deleted = true AND is_resolved = false);

-- ── Phase 1: Community moderation columns ─────────────────────────────────────
ALTER TABLE confessions ADD COLUMN IF NOT EXISTS is_hidden_pending_review BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE profiles    ADD COLUMN IF NOT EXISTS is_flagged_pending_review BOOLEAN DEFAULT false NOT NULL;

-- ── Phase 1: Reports table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id      UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  confession_id    UUID REFERENCES confessions(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reason           TEXT NOT NULL CHECK (reason IN ('spam','harassment','explicit','misinformation','other')),
  notes            TEXT,
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','reviewed','actioned','dismissed')),
  created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(reporter_id, confession_id),
  CHECK (confession_id IS NOT NULL OR reported_user_id IS NOT NULL)
);
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
-- Reporters can file reports; admin reads via service role (bypasses RLS)
CREATE POLICY "reports_insert" ON reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- ── Phase 2: Reactions ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reactions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  confession_id UUID REFERENCES confessions(id) ON DELETE CASCADE NOT NULL,
  emoji         TEXT NOT NULL CHECK (emoji IN ('😂','😱','🤔','💯','🔥','😬')),
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, confession_id, emoji)
);
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reactions_select" ON reactions FOR SELECT USING (true);
CREATE POLICY "reactions_insert" ON reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reactions_delete" ON reactions FOR DELETE USING  (auth.uid() = user_id);

-- ── Phase 3: Identity & progression columns on profiles ───────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_config       JSONB    DEFAULT '{}'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS weekly_points       INTEGER  DEFAULT 0 NOT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS monthly_points      INTEGER  DEFAULT 0 NOT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false NOT NULL;

-- ── Phase 3: Achievements catalog ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS achievements (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name                  TEXT NOT NULL UNIQUE,
  description           TEXT NOT NULL,
  icon                  TEXT NOT NULL,
  category              TEXT NOT NULL CHECK (category IN (
                          'activity','streak','accuracy','fooling','daily','leaderboard','rare')),
  hint_text_when_locked TEXT NOT NULL,
  reward_points         INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "achievements_select" ON achievements FOR SELECT USING (true);

-- ── Phase 3: User achievements (inserts via service role only) ────────────────
CREATE TABLE IF NOT EXISTS user_achievements (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  achievement_id UUID REFERENCES achievements(id) NOT NULL,
  unlocked_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, achievement_id)
);
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_achievements_select" ON user_achievements FOR SELECT USING (true);

-- Featured badge on profiles (FK after achievements table exists)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS featured_badge_id UUID REFERENCES achievements(id);

-- ── Phase 3: Leaderboard history (weekly/monthly rollovers) ──────────────────
CREATE TABLE IF NOT EXISTS leaderboard_history (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  period_type  TEXT NOT NULL CHECK (period_type IN ('weekly','monthly')),
  period_start TIMESTAMPTZ NOT NULL,
  period_end   TIMESTAMPTZ NOT NULL,
  rank         INTEGER NOT NULL,
  user_id      UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  points       INTEGER NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(period_type, period_start, rank)
);
ALTER TABLE leaderboard_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leaderboard_history_select" ON leaderboard_history FOR SELECT USING (true);

-- ── Phase 3: Cosmetics catalog & ownership ────────────────────────────────────
CREATE TABLE IF NOT EXISTS cosmetics (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name         TEXT NOT NULL,
  category     TEXT NOT NULL CHECK (category IN (
                 'name_color','border','theme','avatar_part','avatar_accessory','avatar_effect')),
  tier         TEXT NOT NULL CHECK (tier IN ('free','points','premium')),
  points_cost  INTEGER,
  preview_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
ALTER TABLE cosmetics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cosmetics_select" ON cosmetics FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS user_cosmetics (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  cosmetic_id UUID REFERENCES cosmetics(id) NOT NULL,
  acquired_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, cosmetic_id)
);
ALTER TABLE user_cosmetics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_cosmetics_select" ON user_cosmetics FOR SELECT USING (auth.uid() = user_id);

-- One row per user, one column per cosmetic slot
CREATE TABLE IF NOT EXISTS user_equipped (
  user_id          UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
  name_color_id    UUID REFERENCES cosmetics(id),
  border_id        UUID REFERENCES cosmetics(id),
  theme_id         UUID REFERENCES cosmetics(id),
  avatar_effect_id UUID REFERENCES cosmetics(id)
);
ALTER TABLE user_equipped ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_equipped_select" ON user_equipped FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_equipped_insert" ON user_equipped FOR INSERT  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_equipped_update" ON user_equipped FOR UPDATE  USING     (auth.uid() = user_id);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS reports_confession_pending_idx  ON reports(confession_id)    WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS reports_user_pending_idx        ON reports(reported_user_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS reactions_confession_idx        ON reactions(confession_id);
CREATE INDEX IF NOT EXISTS leaderboard_history_period_idx  ON leaderboard_history(period_type, period_start);
CREATE INDEX IF NOT EXISTS leaderboard_history_user_idx    ON leaderboard_history(user_id);
-- Partial index matching feed query filters
CREATE INDEX IF NOT EXISTS confessions_feed_idx ON confessions(created_at DESC)
  WHERE is_deleted = false AND is_hidden_pending_review = false;
