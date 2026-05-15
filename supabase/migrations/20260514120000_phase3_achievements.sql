-- ============================================================
-- PHASE 3: ACHIEVEMENTS, AVATAR, LEADERBOARD ROLLOVERS
-- ============================================================

-- ── notifications: make voting-specific columns nullable ──────────────────────
-- Needed so achievement-type notifications can exist in the same table
ALTER TABLE notifications ALTER COLUMN confession_id  DROP NOT NULL;
ALTER TABLE notifications ALTER COLUMN your_vote      DROP NOT NULL;
ALTER TABLE notifications ALTER COLUMN truth          DROP NOT NULL;
ALTER TABLE notifications ALTER COLUMN is_correct     DROP NOT NULL;
ALTER TABLE notifications ALTER COLUMN points_awarded DROP NOT NULL;

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS achievement_id UUID REFERENCES achievements(id);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message TEXT;

-- ── profiles: achievement + avatar tracking ───────────────────────────────────
-- Incremented at resolution when poster's confession fools voters
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_fooled_voters     INTEGER DEFAULT 0 NOT NULL;
-- Incremented on correct vote, reset to 0 on wrong vote (used for "100 in a row")
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS consecutive_correct_votes INTEGER DEFAULT 0 NOT NULL;
-- Denormalized display: emoji icon of the user's chosen featured achievement badge
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS featured_badge_icon TEXT;

-- ── Achievements catalog seed ─────────────────────────────────────────────────
INSERT INTO achievements (name, description, icon, category, hint_text_when_locked, reward_points) VALUES
  ('First Vote',          'Cast your first vote on a confession',          '🗳️',  'activity',    'Vote on any confession to unlock',                  10),
  ('First Confession',    'Post your first confession',                    '🤫',  'activity',    'Post your first confession to unlock',              10),
  ('Prolific Confessor',  'Post 10 confessions',                           '📝',  'activity',    'Post 10 confessions to unlock',                     25),
  ('Confession Machine',  'Post 100 confessions',                          '🏭',  'activity',    'Post 100 confessions to unlock',                   100),
  ('Vote Enthusiast',     'Cast 1,000 votes',                              '🗳️',  'activity',    'Cast 1,000 votes to unlock',                       100),
  ('Week Streak',         'Maintain a 7-day activity streak',              '🔥',  'streak',      'Build a 7-day streak to unlock',                    25),
  ('Month Streak',        'Maintain a 30-day activity streak',             '🔥',  'streak',      'Build a 30-day streak to unlock',                  100),
  ('Century Streak',      'Maintain a 100-day activity streak',            '💯',  'streak',      'Build a 100-day streak to unlock',                 500),
  ('Oracle',              'Reach the Oracle accuracy tier',                '🔮',  'accuracy',    'Reach 80%+ accuracy over 10+ resolved votes',       200),
  ('Sharp Eye',           '90%+ accuracy over at least 50 resolved votes', '🎯', 'accuracy',    'Reach 90%+ accuracy over 50 resolved votes',        150),
  ('Perfect Sense',       '100 correct votes in a row without a wrong',    '🧠',  'accuracy',    'Vote correctly 100 times in a row to unlock',       500),
  ('Deceiver',            'Fool 10 or more voters across your confessions','🎭',  'fooling',     'Have 10 voters guess wrong on your confessions',     25),
  ('Master Deceiver',     'Fool 100 or more voters across your confessions','🎭', 'fooling',    'Have 100 voters guess wrong on your confessions',   100),
  ('Perfect Fool',        'A confession where ≥45% of voters guessed wrong','🃏','fooling',     'Get 45%+ wrong-side votes on a single confession',   50),
  ('Daily Devotee',       'Tag your first confession with a daily prompt', '📌',  'daily',       'Tag a confession with the daily theme to unlock',   10),
  ('Top 100 (Weekly)',    'Finish in the top 100 on the weekly leaderboard','🏆', 'leaderboard', 'Finish in the weekly top 100 to unlock',             50),
  ('Top 10 (Weekly)',     'Finish in the top 10 on the weekly leaderboard', '🥈', 'leaderboard', 'Finish in the weekly top 10 to unlock',            100),
  ('Weekly Champion',     'Finish #1 on the weekly leaderboard',           '🥇',  'leaderboard', 'Reach #1 on the weekly leaderboard to unlock',     250),
  ('Top 10 (Monthly)',    'Finish in the top 10 on the monthly leaderboard','🥈', 'leaderboard', 'Finish in the monthly top 10 to unlock',           200),
  ('Monthly Champion',    'Finish #1 on the monthly leaderboard',          '🥇',  'leaderboard', 'Reach #1 on the monthly leaderboard to unlock',    500),
  ('Early Adopter',       'One of the first 1,000 players on Confess',     '⭐',  'rare',        'Only granted to the first 1,000 players',            50)
ON CONFLICT (name) DO NOTHING;

-- ── Backfill: grant Early Adopter to first 1000 users ────────────────────────
-- Run after achievement rows are inserted so the FK resolves
WITH ea AS (SELECT id FROM achievements WHERE name = 'Early Adopter' LIMIT 1),
     first_1k AS (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1000)
INSERT INTO user_achievements (user_id, achievement_id)
SELECT f.id, ea.id FROM first_1k f, ea
ON CONFLICT (user_id, achievement_id) DO NOTHING;

-- ── leaderboard_history: index for period+user lookups ───────────────────────
CREATE INDEX IF NOT EXISTS leaderboard_history_user_period_idx
  ON leaderboard_history(user_id, period_type);
