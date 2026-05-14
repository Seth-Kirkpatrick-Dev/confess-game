const TIERS = {
  Newbie:        { color: 'text-textSecondary', icon: '👤' },
  Skeptic:       { color: 'text-blue-400',      icon: '🤔' },
  'Truth Hunter':{ color: 'text-green-400',     icon: '🔎' },
  'Lie Detector':{ color: 'text-violet-400',    icon: '🕵️' },
  Oracle:        { color: 'text-yellow-400',    icon: '🔮' },
};

// icon-only by default; set showLabel for full "🔎 Truth Hunter" form
export function TierBadge({ tier, showLabel = false, className = '' }) {
  const t = TIERS[tier] || TIERS.Newbie;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs ${t.color} ${className}`} title={tier || 'Newbie'}>
      <span>{t.icon}</span>
      {showLabel && <span>{tier || 'Newbie'}</span>}
    </span>
  );
}
