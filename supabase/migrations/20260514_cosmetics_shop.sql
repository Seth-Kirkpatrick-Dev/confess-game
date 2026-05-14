-- Phase 5: Cosmetics shop — correct schema, catalog seed, purchase RPC.
-- Drops and recreates the cosmetics tables created by polish_identity_progression.sql
-- (those have not been pushed to production yet, so this is safe).

DROP TABLE IF EXISTS user_equipped   CASCADE;
DROP TABLE IF EXISTS user_cosmetics  CASCADE;
DROP TABLE IF EXISTS cosmetics       CASCADE;

-- ── Cosmetics catalog ─────────────────────────────────────────────────────────
CREATE TABLE cosmetics (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name                  TEXT NOT NULL UNIQUE,
  description           TEXT NOT NULL DEFAULT '',
  category              TEXT NOT NULL CHECK (category IN
                          ('name_color','border','theme','avatar_accessory','badge_frame')),
  economy_tier          TEXT NOT NULL CHECK (economy_tier IN ('free','points','premium')),
  points_cost           INTEGER,
  unlock_achievement_id UUID REFERENCES achievements(id) ON DELETE SET NULL,
  preview_class         TEXT NOT NULL DEFAULT '',   -- Tailwind class(es) for live preview
  config_json           JSONB NOT NULL DEFAULT '{}',
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE cosmetics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cosmetics_select" ON cosmetics FOR SELECT USING (true);

-- ── User-owned cosmetics ──────────────────────────────────────────────────────
CREATE TABLE user_cosmetics (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cosmetic_id UUID NOT NULL REFERENCES cosmetics(id) ON DELETE CASCADE,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acquired_via TEXT NOT NULL CHECK (acquired_via IN ('achievement','purchase','premium')),
  UNIQUE(user_id, cosmetic_id)
);
ALTER TABLE user_cosmetics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_cosmetics_select" ON user_cosmetics FOR SELECT USING (auth.uid() = user_id);

-- ── Equipped cosmetics (one row per user per slot) ────────────────────────────
CREATE TABLE user_equipped (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  slot        TEXT NOT NULL CHECK (slot IN
                ('name_color','border','theme','avatar_accessory','badge_frame')),
  cosmetic_id UUID REFERENCES cosmetics(id) ON DELETE SET NULL,
  UNIQUE(user_id, slot)
);
ALTER TABLE user_equipped ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_equipped_select" ON user_equipped FOR SELECT USING (true);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX user_cosmetics_user_idx ON user_cosmetics(user_id);
CREATE INDEX user_equipped_user_idx  ON user_equipped(user_id);

-- ── Spendable points pool (separate from leaderboard points) ──────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS spendable_points INTEGER NOT NULL DEFAULT 0;

-- ── Denormalized equipped display fields (avoids join on every profile fetch) ─
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS equipped_name_color_class TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS equipped_border_class      TEXT;

-- ── Update RPCs to also accumulate spendable_points ───────────────────────────
CREATE OR REPLACE FUNCTION add_detection_points(user_id_param UUID, points_param INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET
    detection_points = detection_points + points_param,
    weekly_points    = weekly_points    + points_param,
    monthly_points   = monthly_points   + points_param,
    spendable_points = spendable_points + GREATEST(0, points_param)
  WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION add_confession_points(user_id_param UUID, points_param INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET
    confession_points = confession_points + points_param,
    weekly_points     = weekly_points     + points_param,
    monthly_points    = monthly_points    + points_param,
    spendable_points  = spendable_points  + GREATEST(0, points_param)
  WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Atomic purchase RPC ───────────────────────────────────────────────────────
-- Validates ownership, checks balance, deducts, inserts user_cosmetics.
-- Returns: 'ok' | 'already_owned' | 'insufficient_points' | 'not_found' | 'not_purchasable'
CREATE OR REPLACE FUNCTION purchase_cosmetic(user_id_param UUID, cosmetic_id_param UUID)
RETURNS TEXT AS $$
DECLARE
  v_cosmetic    cosmetics%ROWTYPE;
  v_balance     INTEGER;
  v_already_own INTEGER;
BEGIN
  -- Lock cosmetic row
  SELECT * INTO v_cosmetic FROM cosmetics WHERE id = cosmetic_id_param FOR SHARE;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  IF v_cosmetic.economy_tier <> 'points' THEN RETURN 'not_purchasable'; END IF;
  IF NOT v_cosmetic.is_active THEN RETURN 'not_found'; END IF;

  -- Check already owned
  SELECT COUNT(*) INTO v_already_own
  FROM user_cosmetics
  WHERE user_id = user_id_param AND cosmetic_id = cosmetic_id_param;
  IF v_already_own > 0 THEN RETURN 'already_owned'; END IF;

  -- Lock user row for update to prevent race condition
  SELECT spendable_points INTO v_balance
  FROM profiles WHERE id = user_id_param FOR UPDATE;

  IF v_balance < v_cosmetic.points_cost THEN RETURN 'insufficient_points'; END IF;

  -- Deduct and insert
  UPDATE profiles
  SET spendable_points = spendable_points - v_cosmetic.points_cost
  WHERE id = user_id_param;

  INSERT INTO user_cosmetics(user_id, cosmetic_id, acquired_via)
  VALUES (user_id_param, cosmetic_id_param, 'purchase');

  RETURN 'ok';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Catalog seed: 33 cosmetics ────────────────────────────────────────────────
-- Free (10) — each tied to a specific achievement
INSERT INTO cosmetics (name, description, category, economy_tier, unlock_achievement_id, preview_class, config_json)
SELECT
  items.name, items.description, items.category, 'free',
  (SELECT id FROM achievements WHERE achievements.name = items.achievement_name LIMIT 1),
  items.preview_class, items.config_json::jsonb
FROM (VALUES
  ('First Step',      'Your first step into the world of confessions', 'name_color', 'First Vote',        'text-slate-300',   '{"color":"#cbd5e1"}'),
  ('Confessor Blue',  'A cool blue for the bold confessor',            'name_color', 'First Confession',  'text-blue-400',    '{"color":"#60a5fa"}'),
  ('Oracle Gold',     'Reserved for the sharpest minds',               'name_color', 'Oracle',            'text-yellow-400',  '{"color":"#facc15"}'),
  ('Flame Trail',     'One week without missing a day',                'border',     'Week Streak',       'ring-2 ring-orange-500/60', '{"ring":"orange"}'),
  ('Eternal Flame',   'A month of unbroken dedication',                'border',     'Month Streak',      'ring-2 ring-red-500/70',    '{"ring":"red"}'),
  ('Fool''s Badge',   'You fooled them — wear it with pride',           'badge_frame','Perfect Fool',      'bg-amber-500/20 ring-1 ring-amber-500/40', '{"bg":"amber"}'),
  ('Deceiver''s Mark','The mark of a skilled liar',                     'name_color', 'Deceiver',          'text-rose-400',    '{"color":"#fb7185"}'),
  ('Shadow Crown',    'For those who deceive at scale',                 'badge_frame','Master Deceiver',   'bg-violet-900/40 ring-1 ring-violet-500/30', '{"bg":"violet"}'),
  ('Champion Gold',   'First on the weekly leaderboard',               'name_color', 'Weekly Champion',   'text-yellow-300',  '{"color":"#fde047"}'),
  ('Legend''s Glow',  'First on the monthly leaderboard',              'badge_frame','Monthly Champion',  'bg-yellow-500/15 ring-2 ring-yellow-400/50', '{"bg":"yellow"}')
) AS items(name, description, category, achievement_name, preview_class, config_json)
ON CONFLICT (name) DO NOTHING;

-- Points tier (15)
INSERT INTO cosmetics (name, description, category, economy_tier, points_cost, preview_class, config_json)
VALUES
  -- Name colors
  ('Violet Dream',    'A rich violet hue',            'name_color', 'points', 200,  'text-violet-400',  '{"color":"#a78bfa"}'),
  ('Rose Bloom',      'Soft rose tones',              'name_color', 'points', 200,  'text-rose-300',    '{"color":"#fda4af"}'),
  ('Emerald',         'Deep emerald green',           'name_color', 'points', 300,  'text-emerald-400', '{"color":"#34d399"}'),
  ('Ocean Blue',      'Deep ocean cyan',              'name_color', 'points', 300,  'text-cyan-400',    '{"color":"#22d3ee"}'),
  ('Amber Glow',      'Warm amber light',             'name_color', 'points', 400,  'text-amber-400',   '{"color":"#fbbf24"}'),
  ('Hot Pink',        'Bold and unapologetic',        'name_color', 'points', 400,  'text-pink-400',    '{"color":"#f472b6"}'),
  ('Neon Lime',       'Bright neon lime',             'name_color', 'points', 500,  'text-lime-400',    '{"color":"#a3e635"}'),
  ('Deep Orange',     'Vibrant burnt orange',         'name_color', 'points', 500,  'text-orange-400',  '{"color":"#fb923c"}'),
  -- Borders
  ('Violet Pulse',    'Glowing violet ring',          'border',     'points', 1000, 'ring-2 ring-violet-500/70', '{"ring":"violet"}'),
  ('Golden Halo',     'Shimmering gold ring',         'border',     'points', 1000, 'ring-2 ring-yellow-500/70', '{"ring":"yellow"}'),
  ('Crimson Ring',    'Bold crimson border',          'border',     'points', 1000, 'ring-2 ring-red-500/70',    '{"ring":"red"}'),
  -- Profile themes
  ('Midnight Void',   'Deep blue-black atmosphere',   'theme',      'points', 1500, 'bg-blue-950/50',   '{"accent":"#1e3a5f"}'),
  ('Forest Dark',     'Dark forest green tones',      'theme',      'points', 1500, 'bg-green-950/50',  '{"accent":"#14532d"}'),
  -- Avatar accessories
  ('Star Crown',      'A star to crown your avatar',  'avatar_accessory','points', 500,  '⭐', '{"emoji":"⭐"}'),
  ('Ghost Frame',     'An ethereal ghost border',     'avatar_accessory','points', 600,  '👻', '{"emoji":"👻"}')
ON CONFLICT (name) DO NOTHING;

-- Premium tier (7)
INSERT INTO cosmetics (name, description, category, economy_tier, preview_class, config_json)
VALUES
  ('Aurora',          'Shifting rainbow gradient name',      'name_color',       'premium', 'bg-gradient-to-r from-pink-400 via-violet-400 to-blue-400 bg-clip-text text-transparent', '{"gradient":true}'),
  ('Cyberpunk Neon',  'Electric neon yellow-green name',    'name_color',       'premium', 'text-yellow-300 drop-shadow-[0_0_8px_rgba(250,204,21,0.7)]', '{"neon":true}'),
  ('Opal Shimmer',    'Opalescent holographic name',        'name_color',       'premium', 'text-pink-300 drop-shadow-[0_0_6px_rgba(249,168,212,0.6)]', '{"holographic":true}'),
  ('Midnight Theme',  'Full dark blue UI overlay',          'theme',            'premium', 'bg-blue-950/30 border-blue-800/30', '{"theme":"midnight"}'),
  ('Cyberpunk Theme', 'Neon purple and yellow accents',     'theme',            'premium', 'bg-yellow-950/20 border-yellow-700/30', '{"theme":"cyberpunk"}'),
  ('Crystal Frame',   'Animated crystal badge frame',       'badge_frame',      'premium', 'bg-cyan-500/10 ring-2 ring-cyan-400/50', '{"animated":true}'),
  ('Phantom Aura',    'Ghost-trail avatar effect',          'avatar_accessory', 'premium', '👁️', '{"emoji":"👁️","animated":true}')
ON CONFLICT (name) DO NOTHING;
