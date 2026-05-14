import { ADS_ENABLED } from '@/lib/config';

export function AdPlaceholder({ slot = 'banner', className = '' }) {
  if (!ADS_ENABLED) return null;

  const sizes = {
    banner: 'h-[90px]',
    rectangle: 'h-[250px]',
    leaderboard: 'h-[90px]',
  };

  return (
    <div
      className={`w-full ${sizes[slot]} flex items-center justify-center rounded-xl border border-dashed border-border bg-surface/50 ${className}`}
      data-ad-slot={slot}
    >
      <span className="text-textSecondary text-xs tracking-widest uppercase">Advertisement</span>
    </div>
  );
}
