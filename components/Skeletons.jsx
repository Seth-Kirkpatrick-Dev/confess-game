// Skeleton placeholders — bg-surfaceHover + animate-pulse, match real layout dimensions

export function SkeletonLine({ className = '' }) {
  return <div className={`h-3.5 bg-surfaceHover rounded animate-pulse ${className}`} />;
}

export function SkeletonBlock({ className = '' }) {
  return <div className={`bg-surfaceHover rounded-lg animate-pulse ${className}`} />;
}

// Full confession card skeleton
export function ConfessionCardSkeleton() {
  return (
    <div className="card space-y-3">
      {/* Content lines */}
      <SkeletonLine className="w-full" />
      <SkeletonLine className="w-4/5" />
      <SkeletonLine className="w-2/3" />
      {/* Vote buttons */}
      <div className="flex gap-2 pt-1">
        <SkeletonBlock className="flex-1 h-10" />
        <SkeletonBlock className="flex-1 h-10" />
      </div>
      {/* Reaction row */}
      <div className="flex gap-1.5 pt-1">
        {[1, 2, 3, 4, 5, 6].map(i => <SkeletonBlock key={i} className="w-9 h-6 rounded-full" />)}
      </div>
      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex items-center gap-2">
          <SkeletonBlock className="w-[18px] h-[18px] rounded-full" />
          <SkeletonLine className="w-20" />
          <SkeletonLine className="w-12" />
        </div>
        <SkeletonLine className="w-10" />
      </div>
    </div>
  );
}

// Leaderboard row skeleton
export function LeaderRowSkeleton() {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-surfaceHover animate-pulse">
      <div className="flex items-center gap-3">
        <SkeletonBlock className="w-7 h-5 rounded" />
        <SkeletonBlock className="w-7 h-7 rounded-full" />
        <SkeletonLine className="w-24" />
        <SkeletonLine className="w-16" />
      </div>
      <SkeletonLine className="w-12" />
    </div>
  );
}

// Profile page header skeleton
export function ProfileHeaderSkeleton() {
  return (
    <div className="card animate-pulse space-y-4">
      <div className="flex items-start gap-4">
        <SkeletonBlock className="w-16 h-16 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <SkeletonLine className="w-36" />
          <SkeletonLine className="w-24" />
        </div>
      </div>
      <SkeletonBlock className="h-14 rounded-lg" />
      <div className="flex gap-2">
        <SkeletonBlock className="w-6 h-6 rounded-full" />
        <SkeletonLine className="w-32" />
      </div>
    </div>
  );
}

// Notification row skeleton
export function NotificationRowSkeleton() {
  return (
    <div className="px-4 py-3 border-b border-border animate-pulse space-y-1.5">
      <SkeletonLine className="w-16" />
      <SkeletonLine className="w-full" />
      <div className="flex justify-between">
        <SkeletonLine className="w-28" />
        <SkeletonLine className="w-12" />
      </div>
    </div>
  );
}

// Detail page skeleton
export function ConfessionDetailSkeleton() {
  return (
    <div className="card animate-pulse space-y-4">
      <SkeletonLine className="w-full" />
      <SkeletonLine className="w-5/6" />
      <SkeletonLine className="w-3/4" />
      <div className="flex items-center gap-2">
        <SkeletonBlock className="w-5 h-5 rounded-full" />
        <SkeletonLine className="w-24" />
        <SkeletonLine className="w-20" />
      </div>
      <SkeletonBlock className="h-12 rounded-lg" />
      <div className="flex gap-2">
        <SkeletonBlock className="flex-1 h-10" />
        <SkeletonBlock className="flex-1 h-10" />
      </div>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5, 6].map(i => <SkeletonBlock key={i} className="w-9 h-6 rounded-full" />)}
      </div>
    </div>
  );
}
