-- More cosmetics + price corrections
-- Adds ~25 new items across all categories and rebalances existing prices.
-- Economy target:
--   Basic colors  : 300-600 pts  (~1 week casual)
--   Mid tier      : 600-1200 pts (~2-3 weeks casual)
--   Premium grind : 1400-2500 pts (~1-2 months casual)
--   Top tier      : 2500+ pts    (~3+ months casual)

-- ── Price corrections ─────────────────────────────────────────────────────────
-- Override economy_rebalance.sql values that are too high

UPDATE cosmetics SET points_cost = 600  WHERE name = 'Amber Glow';
UPDATE cosmetics SET points_cost = 600  WHERE name = 'Hot Pink';
UPDATE cosmetics SET points_cost = 500  WHERE name = 'Star Crown';
UPDATE cosmetics SET points_cost = 900  WHERE name = 'Ghost Frame';
-- Borders: bring down from 4000-6000
UPDATE cosmetics SET points_cost = 1500 WHERE name = 'Violet Pulse';
UPDATE cosmetics SET points_cost = 2000 WHERE name = 'Golden Halo';
UPDATE cosmetics SET points_cost = 2500 WHERE name = 'Crimson Ring';
-- Themes: bring down from 6000
UPDATE cosmetics SET points_cost = 2000 WHERE name = 'Midnight Void';
UPDATE cosmetics SET points_cost = 2000 WHERE name = 'Forest Dark';

-- ── New free cosmetics (achievement-linked) ───────────────────────────────────

INSERT INTO cosmetics (name, description, category, economy_tier, preview_class, config_json)
VALUES
  ('Inkwell',          'Earned by the prolific confessor',      'name_color',       'free', 'text-indigo-400',                           '{"color":"#818cf8"}'),
  ('Blood Rank',       'You have confessed more than most',     'name_color',       'free', 'text-red-400',                              '{"color":"#f87171"}'),
  ('Tidal Wave',       'The relentless vote caster',            'name_color',       'free', 'text-teal-400',                             '{"color":"#2dd4bf"}'),
  ('Undying Ring',     'One hundred days, unbroken',            'border',           'free', 'ring-2 ring-cyan-400/70',                   '{"ring":"cyan"}'),
  ('Laserbeam',        'Eyes that never miss',                  'name_color',       'free', 'text-white',                                '{"color":"#ffffff"}'),
  ('Founder''s Seal',  'You were here from the start',         'badge_frame',      'free', 'bg-blue-500/10 ring-2 ring-blue-400/50',    '{"bg":"blue"}'),
  ('Daily Pin',        'Not a day missed',                      'avatar_accessory', 'free', '',                                          '{"emoji":"📌"}'),
  ('Mind Melt',        'You can read minds',                    'avatar_accessory', 'free', '',                                          '{"emoji":"🧠"}')
ON CONFLICT (name) DO NOTHING;

UPDATE cosmetics SET unlock_achievement_id = (SELECT id FROM achievements WHERE name = 'Prolific Confessor' LIMIT 1) WHERE name = 'Inkwell';
UPDATE cosmetics SET unlock_achievement_id = (SELECT id FROM achievements WHERE name = 'Confession Machine'  LIMIT 1) WHERE name = 'Blood Rank';
UPDATE cosmetics SET unlock_achievement_id = (SELECT id FROM achievements WHERE name = 'Vote Enthusiast'     LIMIT 1) WHERE name = 'Tidal Wave';
UPDATE cosmetics SET unlock_achievement_id = (SELECT id FROM achievements WHERE name = 'Century Streak'      LIMIT 1) WHERE name = 'Undying Ring';
UPDATE cosmetics SET unlock_achievement_id = (SELECT id FROM achievements WHERE name = 'Sharp Eye'           LIMIT 1) WHERE name = 'Laserbeam';
UPDATE cosmetics SET unlock_achievement_id = (SELECT id FROM achievements WHERE name = 'Early Adopter'       LIMIT 1) WHERE name = 'Founder''s Seal';
UPDATE cosmetics SET unlock_achievement_id = (SELECT id FROM achievements WHERE name = 'Daily Devotee'       LIMIT 1) WHERE name = 'Daily Pin';
UPDATE cosmetics SET unlock_achievement_id = (SELECT id FROM achievements WHERE name = 'Perfect Sense'       LIMIT 1) WHERE name = 'Mind Melt';

-- ── New points-tier cosmetics ─────────────────────────────────────────────────

INSERT INTO cosmetics (name, description, category, economy_tier, points_cost, preview_class, config_json)
VALUES
  -- Name colors — low tier (300-600)
  ('Purple Haze',     'Deep rich purple',                     'name_color',       'points', 300,  'text-purple-400',  '{"color":"#c084fc"}'),
  ('Sky Blue',        'Clear open-sky blue',                  'name_color',       'points', 300,  'text-sky-400',     '{"color":"#38bdf8"}'),
  ('Golden Hour',     'Warm evening gold',                    'name_color',       'points', 450,  'text-yellow-500',  '{"color":"#eab308"}'),
  ('Jade',            'Rich deep green',                      'name_color',       'points', 500,  'text-green-400',   '{"color":"#4ade80"}'),
  ('Fuchsia Flash',   'Vivid electric fuchsia',               'name_color',       'points', 550,  'text-fuchsia-400', '{"color":"#e879f9"}'),
  -- Name colors — glow tier (1500)
  ('Poison Glow',     'Toxic green that cuts through dark',   'name_color',       'points', 1500, 'text-emerald-400 drop-shadow-[0_0_8px_rgba(134,239,172,0.7)]', '{"color":"#34d399","glow":"rgba(134,239,172,0.7)"}'),
  ('Blood Glow',      'Crimson glow of a seasoned deceiver',  'name_color',       'points', 1500, 'text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.7)]',     '{"color":"#f43f5e","glow":"rgba(244,63,94,0.7)"}'),
  -- Avatar accessories (400-1200)
  ('Fire',            'Eternally burning',                    'avatar_accessory', 'points', 400,  '',                 '{"emoji":"🔥"}'),
  ('Lightning',       'Speed incarnate',                      'avatar_accessory', 'points', 450,  '',                 '{"emoji":"⚡"}'),
  ('Skull',           'Edgy and unapologetic',                'avatar_accessory', 'points', 600,  '',                 '{"emoji":"💀"}'),
  ('Crown',           'For those who truly earned it',        'avatar_accessory', 'points', 750,  '',                 '{"emoji":"👑"}'),
  ('Dragon',          'Rare and ancient power',               'avatar_accessory', 'points', 1200, '',                 '{"emoji":"🐉"}'),
  -- Badge frames (700-1400)
  ('Emerald Frame',   'Glowing emerald badge border',         'badge_frame',      'points', 700,  'bg-emerald-500/15 ring-1 ring-emerald-400/40', '{"bg":"emerald"}'),
  ('Crimson Frame',   'Bold red badge frame',                 'badge_frame',      'points', 900,  'bg-red-500/15 ring-1 ring-red-400/40',         '{"bg":"red"}'),
  ('Sapphire Frame',  'Cool deep blue frame',                 'badge_frame',      'points', 1100, 'bg-sky-500/15 ring-1 ring-sky-400/40',         '{"bg":"sky"}'),
  ('Fuchsia Frame',   'Vivid fuchsia badge border',           'badge_frame',      'points', 1400, 'bg-fuchsia-500/15 ring-1 ring-fuchsia-400/40', '{"bg":"fuchsia"}'),
  -- Borders (1800-2200)
  ('Frost Ring',      'Icy blue avatar ring',                 'border',           'points', 1800, 'ring-2 ring-sky-400/70',     '{"ring":"sky"}'),
  ('Fuchsia Ring',    'Vivid fuchsia avatar ring',            'border',           'points', 2200, 'ring-2 ring-fuchsia-500/60', '{"ring":"fuchsia"}'),
  -- Themes (2000)
  ('Ocean Depths',    'Deep ocean blues',                     'theme',            'points', 2000, 'bg-blue-950/50',  '{"accent":"#0c4a6e","theme":"ocean"}'),
  ('Ember Forge',     'Smoldering dark reds',                 'theme',            'points', 2000, 'bg-red-950/50',   '{"accent":"#7c2d12","theme":"ember"}')
ON CONFLICT (name) DO NOTHING;

-- ── New premium cosmetics ─────────────────────────────────────────────────────

INSERT INTO cosmetics (name, description, category, economy_tier, preview_class, config_json)
VALUES
  ('Inferno',     'Blazing fire gradient name',         'name_color',       'premium', 'bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent', '{"inferno":true}'),
  ('Void Eye',    'Dark matter floats beside you',      'avatar_accessory', 'premium', '',                              '{"emoji":"🌑"}'),
  ('Gold Frame',  'Luxurious premium badge frame',      'badge_frame',      'premium', 'bg-yellow-500/20 ring-2 ring-yellow-400/60', '{"bg":"gold"}'),
  ('Ice Ring',    'Crystal clear ice avatar border',    'border',           'premium', 'ring-2 ring-white/50',          '{"ring":"ice"}'),
  ('Galaxy',      'Deep cosmic purple theme',           'theme',            'premium', 'bg-purple-950/50',              '{"accent":"#3b0764","theme":"galaxy"}')
ON CONFLICT (name) DO NOTHING;
