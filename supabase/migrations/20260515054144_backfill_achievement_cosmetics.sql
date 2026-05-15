-- Backfill user_cosmetics for all users who earned an achievement that unlocks a cosmetic
-- but never received the cosmetic (because auto-grant didn't exist yet).
INSERT INTO user_cosmetics (user_id, cosmetic_id, acquired_via)
SELECT
  ua.user_id,
  c.id AS cosmetic_id,
  'achievement' AS acquired_via
FROM user_achievements ua
JOIN cosmetics c ON c.unlock_achievement_id = ua.achievement_id
WHERE c.is_active = true
ON CONFLICT (user_id, cosmetic_id) DO NOTHING;