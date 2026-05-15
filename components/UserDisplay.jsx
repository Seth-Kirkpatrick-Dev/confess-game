'use client';

import Link from 'next/link';
import { Avatar } from '@/components/Avatar';
import { TierBadge } from '@/components/TierBadge';

/**
 * Renders a user's name with equipped cosmetics applied.
 * Pass the profile/user object — it should include username, tier, avatar_config,
 * featured_badge_icon, equipped_name_color_class, equipped_border_class.
 *
 * Props:
 *  user        — profile object
 *  showAvatar  — (bool) render Avatar prefix
 *  showTier    — (bool) render TierBadge suffix
 *  showBadge   — (bool) render featured_badge_icon
 *  avatarSize  — (number) avatar px size (default 18)
 *  linkToProfile — (bool) wrap username in link (default true)
 *  className   — extra classes on the wrapper
 */
export function UserDisplay({
  user,
  showAvatar = true,
  showTier = true,
  showBadge = true,
  avatarSize = 18,
  linkToProfile = true,
  className = '',
}) {
  if (!user) return null;

  const nameClass = user.equipped_name_color_class || 'text-textSecondary';
  const borderClass = user.equipped_border_class || '';
  const avatarEmoji = user.equipped_avatar_emoji || null;
  const badgeFrameClass = user.equipped_badge_frame_class || '';

  const usernameEl = (
    <span className={`text-xs font-medium transition-colors hover:text-textPrimary ${nameClass}`}>
      @{user.username || 'anonymous'}
    </span>
  );

  return (
    <div className={`flex items-center gap-1.5 flex-shrink-0 min-w-0 ${className}`}>
      {showAvatar && (
        <span className="relative inline-flex flex-shrink-0">
          <Avatar
            username={user.username}
            config={user.avatar_config}
            size={avatarSize}
            className={borderClass}
          />
          {avatarEmoji && (
            <span
              className="absolute -bottom-1 -right-1 leading-none"
              style={{ fontSize: avatarSize * 0.5 }}
            >
              {avatarEmoji}
            </span>
          )}
        </span>
      )}
      {linkToProfile && user.username ? (
        <Link href={`/u/${user.username}`}>{usernameEl}</Link>
      ) : usernameEl}
      {showBadge && user.featured_badge_icon && (
        <span
          className={`text-xs flex-shrink-0 rounded px-0.5 ${badgeFrameClass}`}
          title="Featured badge"
        >
          {user.featured_badge_icon}
        </span>
      )}
      {showTier && <TierBadge tier={user.tier} />}
    </div>
  );
}
