-- Add denormalized columns for all cosmetic slots
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS equipped_avatar_emoji     TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS equipped_badge_frame_class TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS equipped_accent_color      TEXT DEFAULT NULL;

-- Backfill from existing user_equipped rows
UPDATE profiles p
SET equipped_avatar_emoji = c.config_json->>'emoji'
FROM user_equipped ue
JOIN cosmetics c ON c.id = ue.cosmetic_id
WHERE ue.user_id = p.id AND ue.slot = 'avatar_accessory' AND c.config_json->>'emoji' IS NOT NULL;

UPDATE profiles p
SET equipped_badge_frame_class = c.preview_class
FROM user_equipped ue
JOIN cosmetics c ON c.id = ue.cosmetic_id
WHERE ue.user_id = p.id AND ue.slot = 'badge_frame';

UPDATE profiles p
SET equipped_accent_color = COALESCE(
  c.config_json->>'accent',
  CASE c.config_json->>'theme'
    WHEN 'midnight'  THEN '#1e3a5f'
    WHEN 'cyberpunk' THEN '#7c2d00'
    ELSE NULL
  END
)
FROM user_equipped ue
JOIN cosmetics c ON c.id = ue.cosmetic_id
WHERE ue.user_id = p.id AND ue.slot = 'theme';

-- Also fix any border equipped but missing equipped_border_class
UPDATE profiles p
SET equipped_border_class = c.preview_class
FROM user_equipped ue
JOIN cosmetics c ON c.id = ue.cosmetic_id
WHERE ue.user_id = p.id AND ue.slot = 'border' AND p.equipped_border_class IS NULL;