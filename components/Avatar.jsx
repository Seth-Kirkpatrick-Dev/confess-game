const STYLES = ['adventurer', 'bottts', 'fun-emoji', 'lorelei', 'pixel-art', 'open-peeps'];

export const AVATAR_STYLES = STYLES;

function dicebearUrl(style, seed) {
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed || 'default')}`;
}

export function avatarUrl(username, config) {
  const style = config?.style || 'adventurer';
  const seed  = config?.seed  || username || 'default';
  return dicebearUrl(style, seed);
}

export function Avatar({ username, config, size = 32, className = '' }) {
  const url = avatarUrl(username, config);
  return (
    <img
      src={url}
      alt={username || 'avatar'}
      width={size}
      height={size}
      className={`rounded-full bg-surface flex-shrink-0 ${className}`}
    />
  );
}
