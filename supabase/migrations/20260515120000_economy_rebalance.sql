-- Economy rebalance: shop prices + achievement rewards
-- Goals:
--   • Basic name colors: ~3 days of casual play
--   • Mid cosmetics (accessories): 2-3 weeks
--   • Borders: 2-3 months of active play — rare, visible
--   • Themes: 3+ months — true endgame grind
--   • Easy achievements give minimal leaderboard points
--   • Hard/rare achievements give meaningful rewards

-- ── Shop price updates ────────────────────────────────────────────────────────

-- Name colors (points tier)
UPDATE cosmetics SET points_cost = 250  WHERE name = 'Violet Dream';
UPDATE cosmetics SET points_cost = 250  WHERE name = 'Rose Bloom';
UPDATE cosmetics SET points_cost = 450  WHERE name = 'Emerald';
UPDATE cosmetics SET points_cost = 450  WHERE name = 'Ocean Blue';
UPDATE cosmetics SET points_cost = 750  WHERE name = 'Amber Glow';
UPDATE cosmetics SET points_cost = 750  WHERE name = 'Hot Pink';
UPDATE cosmetics SET points_cost = 1200 WHERE name = 'Neon Lime';
UPDATE cosmetics SET points_cost = 1200 WHERE name = 'Deep Orange';

-- Avatar accessories
UPDATE cosmetics SET points_cost = 800  WHERE name = 'Star Crown';
UPDATE cosmetics SET points_cost = 1200 WHERE name = 'Ghost Frame';

-- Borders — genuinely rare
UPDATE cosmetics SET points_cost = 4000 WHERE name = 'Violet Pulse';
UPDATE cosmetics SET points_cost = 5000 WHERE name = 'Golden Halo';
UPDATE cosmetics SET points_cost = 6000 WHERE name = 'Crimson Ring';

-- Themes — endgame grind
UPDATE cosmetics SET points_cost = 6000 WHERE name = 'Midnight Void';
UPDATE cosmetics SET points_cost = 6000 WHERE name = 'Forest Dark';

-- ── Achievement reward updates ────────────────────────────────────────────────

-- Trivial (first actions) — minimal leaderboard impact
UPDATE achievements SET reward_points = 5   WHERE name = 'First Vote';
UPDATE achievements SET reward_points = 5   WHERE name = 'First Confession';
UPDATE achievements SET reward_points = 5   WHERE name = 'Daily Devotee';
UPDATE achievements SET reward_points = 25  WHERE name = 'Early Adopter';

-- Activity — scaled to real effort
UPDATE achievements SET reward_points = 20  WHERE name = 'Prolific Confessor';
UPDATE achievements SET reward_points = 150 WHERE name = 'Confession Machine';
UPDATE achievements SET reward_points = 150 WHERE name = 'Vote Enthusiast';

-- Streaks — harder = bigger
UPDATE achievements SET reward_points = 30  WHERE name = 'Week Streak';
UPDATE achievements SET reward_points = 120 WHERE name = 'Month Streak';
UPDATE achievements SET reward_points = 800 WHERE name = 'Century Streak';

-- Accuracy
UPDATE achievements SET reward_points = 150 WHERE name = 'Oracle';
UPDATE achievements SET reward_points = 150 WHERE name = 'Sharp Eye';
UPDATE achievements SET reward_points = 700 WHERE name = 'Perfect Sense';

-- Fooling
UPDATE achievements SET reward_points = 20  WHERE name = 'Deceiver';
UPDATE achievements SET reward_points = 120 WHERE name = 'Master Deceiver';
UPDATE achievements SET reward_points = 35  WHERE name = 'Perfect Fool';

-- Leaderboard
UPDATE achievements SET reward_points = 30  WHERE name = 'Top 100 (Weekly)';
UPDATE achievements SET reward_points = 75  WHERE name = 'Top 10 (Weekly)';
UPDATE achievements SET reward_points = 300 WHERE name = 'Weekly Champion';
UPDATE achievements SET reward_points = 200 WHERE name = 'Top 10 (Monthly)';
UPDATE achievements SET reward_points = 600 WHERE name = 'Monthly Champion';
