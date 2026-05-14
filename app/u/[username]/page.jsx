'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getUserProfile, updateAvatar, updateFeaturedBadge, completeOnboarding } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Avatar, AVATAR_STYLES, avatarUrl } from '@/components/Avatar';
import { TierBadge } from '@/components/TierBadge';
import { OnboardingModal } from '@/components/OnboardingModal';
import { ProfileHeaderSkeleton, SkeletonBlock } from '@/components/Skeletons';

const TIER_CONFIG = {
  Newbie:        { color: 'text-textSecondary', bg: 'bg-surface border-border',               icon: '👤', desc: 'Not enough data yet' },
  Skeptic:       { color: 'text-blue-400',      bg: 'bg-blue-500/10 border-blue-500/20',      icon: '🤔', desc: '50-60% accuracy' },
  'Truth Hunter':{ color: 'text-green-400',     bg: 'bg-green-500/10 border-green-500/20',    icon: '🔎', desc: '60-70% accuracy' },
  'Lie Detector':{ color: 'text-violet-400',    bg: 'bg-violet-500/10 border-violet-500/20',  icon: '🕵️', desc: '70-80% accuracy' },
  Oracle:        { color: 'text-yellow-400',    bg: 'bg-yellow-500/10 border-yellow-500/20',  icon: '🔮', desc: '80%+ accuracy' },
};

const CATEGORY_ORDER = ['activity', 'streak', 'accuracy', 'fooling', 'daily', 'leaderboard', 'rare'];
const CATEGORY_LABELS = {
  activity: '⚡ Activity', streak: '🔥 Streaks', accuracy: '🎯 Accuracy',
  fooling: '🎭 Fooling', daily: '📌 Daily', leaderboard: '🏆 Leaderboard', rare: '⭐ Rare',
};

function StatBox({ label, value, sub }) {
  return (
    <div className="card text-center py-4">
      <p className="text-2xl font-bold text-textPrimary">{value ?? '—'}</p>
      {sub && <p className="text-xs text-textSecondary">{sub}</p>}
      <p className="text-xs text-textSecondary mt-0.5">{label}</p>
    </div>
  );
}

function AvatarPicker({ username, currentConfig, onSave }) {
  const [style, setStyle]     = useState(currentConfig?.style || 'adventurer');
  const [seed, setSeed]       = useState(currentConfig?.seed  || username);
  const [saving, setSaving]   = useState(false);

  const randomise = () => setSeed(Math.random().toString(36).slice(2, 10));

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(style, seed); } finally { setSaving(false); }
  };

  return (
    <div className="card space-y-4">
      <p className="text-xs text-textSecondary uppercase tracking-wider font-semibold">Avatar</p>

      {/* Preview */}
      <div className="flex justify-center">
        <img
          src={avatarUrl(username, { style, seed })}
          alt="preview"
          width={80}
          height={80}
          className="rounded-full bg-surface border border-border"
        />
      </div>

      {/* Style grid */}
      <div className="grid grid-cols-3 gap-2">
        {AVATAR_STYLES.map(s => (
          <button
            key={s}
            onClick={() => setStyle(s)}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-colors ${
              style === s ? 'border-violet-500/50 bg-violet-500/10' : 'border-border hover:border-border/60 hover:bg-surfaceHover'
            }`}
          >
            <img
              src={avatarUrl(username, { style: s, seed })}
              alt={s}
              width={40}
              height={40}
              className="rounded-full bg-surface"
            />
            <span className="text-xs text-textSecondary capitalize">{s.replace('-', ' ')}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button onClick={randomise} className="flex-1 btn-ghost text-sm">🎲 Randomize</button>
        <button onClick={() => setSeed(username)} className="flex-1 btn-ghost text-sm">↺ Reset</button>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-primary w-full text-sm"
      >
        {saving ? 'Saving…' : 'Save Avatar'}
      </button>
    </div>
  );
}

function BadgePicker({ achievements, currentId, onSave }) {
  const [selected, setSelected] = useState(currentId);
  const [saving, setSaving] = useState(false);
  const unlocked = achievements.filter(a => a.unlocked);

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(selected); } finally { setSaving(false); }
  };

  if (unlocked.length === 0) {
    return (
      <div className="card text-center py-8 space-y-2">
        <p className="text-2xl">🔒</p>
        <p className="text-textSecondary text-sm">Unlock achievements to set a featured badge</p>
      </div>
    );
  }

  return (
    <div className="card space-y-4">
      <p className="text-xs text-textSecondary uppercase tracking-wider font-semibold">Featured Badge</p>
      <p className="text-xs text-textSecondary">Choose one badge to display next to your username everywhere.</p>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setSelected(null)}
          className={`flex items-center gap-2 p-3 rounded-xl border text-sm transition-colors ${
            selected === null ? 'border-violet-500/50 bg-violet-500/10 text-textPrimary' : 'border-border text-textSecondary hover:bg-surfaceHover'
          }`}
        >
          <span>—</span> None
        </button>
        {unlocked.map(a => (
          <button
            key={a.id}
            onClick={() => setSelected(a.id)}
            className={`flex items-center gap-2 p-3 rounded-xl border text-sm transition-colors text-left ${
              selected === a.id ? 'border-violet-500/50 bg-violet-500/10 text-textPrimary' : 'border-border text-textSecondary hover:bg-surfaceHover'
            }`}
          >
            <span className="text-lg">{a.icon}</span>
            <span className="text-xs">{a.name}</span>
          </button>
        ))}
      </div>

      <button onClick={handleSave} disabled={saving} className="btn-primary w-full text-sm">
        {saving ? 'Saving…' : 'Save Featured Badge'}
      </button>
    </div>
  );
}

export default function ProfilePage() {
  const { username } = useParams();
  const { profile: myProfile, setProfile } = useAuth();
  const [profile, setPageProfile] = useState(null);
  const [tab, setTab]   = useState('stats');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const isOwnProfile = myProfile?.username === username;
  const [replayOnboarding, setReplayOnboarding] = useState(false);

  useEffect(() => {
    getUserProfile(username)
      .then(data => setPageProfile(data.profile))
      .catch(err => { if (err?.response?.status === 404) setNotFound(true); })
      .finally(() => setLoading(false));
  }, [username]);

  const flash = (msg) => { setSaveMsg(msg); setTimeout(() => setSaveMsg(''), 3000); };

  const handleSaveAvatar = async (style, seed) => {
    await updateAvatar(style, seed);
    setPageProfile(prev => ({ ...prev, avatar_config: { style, seed } }));
    if (setProfile) setProfile(prev => ({ ...prev, avatar_config: { style, seed } }));
    flash('Avatar saved!');
  };

  const handleSaveBadge = async (achievementId) => {
    const result = await updateFeaturedBadge(achievementId);
    const icon = result?.featured_badge_icon || null;
    setPageProfile(prev => ({ ...prev, featured_badge_id: achievementId, featured_badge_icon: icon }));
    if (setProfile) setProfile(prev => ({ ...prev, featured_badge_id: achievementId, featured_badge_icon: icon }));
    flash('Featured badge updated!');
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <ProfileHeaderSkeleton />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <SkeletonBlock key={i} className="h-20" />)}
        </div>
        <SkeletonBlock className="h-28" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 text-center">
        <p className="text-textSecondary text-lg">User not found.</p>
        <Link href="/" className="text-violet-400 text-sm hover:underline mt-2 inline-block">← Back to feed</Link>
      </div>
    );
  }

  const tier = TIER_CONFIG[profile.tier] || TIER_CONFIG.Newbie;
  const totalPoints = (profile.confession_points || 0) + (profile.detection_points || 0);
  const accuracy = profile.accuracy_pct;

  const achievementsByCategory = CATEGORY_ORDER.map(cat => ({
    cat,
    items: (profile.achievements || []).filter(a => a.category === cat),
  })).filter(g => g.items.length > 0);

  const unlockedCount = (profile.achievements || []).filter(a => a.unlocked).length;
  const totalCount    = (profile.achievements || []).length;

  const TABS = [
    { id: 'stats',        label: 'Stats' },
    { id: 'achievements', label: `Achievements (${unlockedCount}/${totalCount})` },
    ...(isOwnProfile ? [{ id: 'customize', label: 'Customize' }] : []),
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {replayOnboarding && (
        <OnboardingModal onDone={async () => {
          await completeOnboarding().catch(() => {});
          setReplayOnboarding(false);
        }} />
      )}
      <Link href="/" className="text-textSecondary hover:text-textPrimary text-sm">← Feed</Link>

      {/* Header card */}
      <div className="card space-y-4">
        <div className="flex items-start gap-4">
          <Avatar username={profile.username} config={profile.avatar_config} size={64} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-textPrimary">@{profile.username}</h1>
              {profile.featured_badge_icon && (
                <span className="text-lg" title="Featured badge">{profile.featured_badge_icon}</span>
              )}
              {isOwnProfile && <p className="text-xs text-textSecondary">Your profile</p>}
            </div>
            {saveMsg && <p className="text-xs text-green-400 mt-1">{saveMsg}</p>}
          </div>
          <button
            onClick={async () => { await navigator.clipboard.writeText(window.location.href); }}
            className="text-textSecondary hover:text-textPrimary text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-surfaceHover transition-colors flex-shrink-0"
          >
            🔗 Share
          </button>
        </div>

        {/* Tier badge */}
        <div className={`flex items-center gap-3 p-3 rounded-lg border ${tier.bg}`}>
          <span className="text-2xl">{tier.icon}</span>
          <div>
            <div className="flex items-center gap-1.5">
              <p className={`font-bold ${tier.color}`}>{profile.tier}</p>
              <TierBadge tier={profile.tier} />
            </div>
            <p className="text-xs text-textSecondary">{tier.desc}</p>
          </div>
          {accuracy !== null && (
            <div className="ml-auto text-right">
              <p className={`font-bold text-lg ${tier.color}`}>{accuracy}%</p>
              <p className="text-xs text-textSecondary">accuracy</p>
            </div>
          )}
        </div>

        {/* Streak */}
        <div className="flex items-center gap-2">
          <span className="text-xl">🔥</span>
          <div>
            <p className="text-textPrimary font-bold">{profile.current_streak} day streak</p>
            <p className="text-xs text-textSecondary">Longest: {profile.longest_streak} days</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border pb-0">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`text-sm px-4 py-2 border-b-2 transition-colors ${
              tab === t.id
                ? 'border-violet-500 text-textPrimary'
                : 'border-transparent text-textSecondary hover:text-textPrimary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Stats tab */}
      {tab === 'stats' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBox label="Total Points"    value={totalPoints} />
            <StatBox label="Confessions"     value={profile.total_confessions} sub="posted" />
            <StatBox label="Votes Cast"      value={profile.total_votes_cast} />
            <StatBox label="Resolved Votes"  value={profile.total_resolved_votes} sub={profile.correct_votes > 0 ? `${profile.correct_votes} correct` : undefined} />
          </div>

          <div className="card">
            <p className="text-xs text-textSecondary uppercase tracking-wider mb-3 font-semibold">Points Breakdown</p>
            <div className="flex gap-4">
              <div className="flex-1 text-center">
                <p className="text-xl font-bold text-violet-400">{profile.confession_points}</p>
                <p className="text-xs text-textSecondary">🎭 Confessor</p>
              </div>
              <div className="w-px bg-border" />
              <div className="flex-1 text-center">
                <p className="text-xl font-bold text-violet-400">{profile.detection_points}</p>
                <p className="text-xs text-textSecondary">🔍 Detector</p>
              </div>
            </div>
          </div>

          <div className="card">
            <p className="text-xs text-textSecondary uppercase tracking-wider mb-3 font-semibold">Recent Resolved Votes</p>
            {(profile.recent_votes?.length || 0) === 0 ? (
              <div className="text-center py-6 space-y-2">
                <p className="text-textSecondary text-sm">No activity yet.</p>
                <p className="text-textSecondary text-xs">Cast a vote or post a confession to start building your history.</p>
                {isOwnProfile && (
                  <Link href="/" className="inline-block mt-1 text-xs text-violet-400 hover:underline">
                    Go to the feed →
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {profile.recent_votes.map((v, i) => (
                  <Link key={i} href={`/c/${v.confessions?.id}`} className="block p-3 rounded-lg bg-surfaceHover hover:bg-surface transition-colors">
                    <p className="text-sm text-textPrimary line-clamp-1 mb-1">"{v.confessions?.content}"</p>
                    <div className="flex items-center gap-2 text-xs text-textSecondary">
                      <span>
                        Voted <span className="font-medium text-textPrimary capitalize">{v.vote_type}</span>
                        {' · '}Truth: <span className={`font-medium capitalize ${v.confessions?.is_true ? 'text-green-400' : 'text-red-400'}`}>{v.confessions?.is_true ? 'Real' : 'Fake'}</span>
                      </span>
                      <span className={`ml-auto font-bold ${v.is_correct ? 'text-green-400' : 'text-red-400'}`}>
                        {v.points_awarded > 0 ? `+${v.points_awarded}` : v.points_awarded} pts
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {isOwnProfile && profile.total_confessions === 0 && (
            <div className="card text-center py-8 space-y-2">
              <p className="text-3xl">🤫</p>
              <p className="text-textPrimary font-medium">You haven't posted any confessions yet</p>
              <p className="text-textSecondary text-sm">Got a secret? Post your first confession and see if the community can tell if it's real or fake.</p>
              <Link href="/" className="inline-block mt-2 text-sm text-violet-400 hover:underline">
                Post your first confession →
              </Link>
            </div>
          )}
        </>
      )}

      {/* Achievements tab */}
      {tab === 'achievements' && (
        <div className="space-y-6">
          {unlockedCount === 0 && (
            <div className="card text-center py-8 space-y-2">
              <p className="text-3xl">🏅</p>
              <p className="text-textPrimary font-medium">No achievements unlocked yet</p>
              <p className="text-textSecondary text-sm">Vote on confessions and post your own to start earning badges.</p>
              {isOwnProfile && (
                <Link href="/" className="inline-block mt-1 text-xs text-violet-400 hover:underline">
                  Vote or post to unlock your first achievement →
                </Link>
              )}
            </div>
          )}
          {achievementsByCategory.map(({ cat, items }) => (
            <div key={cat}>
              <p className="text-xs text-textSecondary uppercase tracking-wider font-semibold mb-3">
                {CATEGORY_LABELS[cat]}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {items.map(a => (
                  <div
                    key={a.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                      a.unlocked
                        ? 'bg-surface border-border'
                        : 'bg-surface/40 border-border/40 opacity-60'
                    }`}
                  >
                    <span className="text-2xl flex-shrink-0">{a.unlocked ? a.icon : '🔒'}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${a.unlocked ? 'text-textPrimary' : 'text-textSecondary'}`}>
                        {a.name}
                      </p>
                      <p className="text-xs text-textSecondary line-clamp-2">
                        {a.unlocked ? a.description : a.hint_text_when_locked}
                      </p>
                      {a.unlocked && a.unlocked_at && (
                        <p className="text-xs text-textSecondary/60 mt-0.5">
                          Unlocked {new Date(a.unlocked_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      )}
                      {a.reward_points > 0 && !a.unlocked && (
                        <p className="text-xs text-violet-400 mt-0.5">+{a.reward_points} pts on unlock</p>
                      )}
                    </div>
                    {a.unlocked && profile.featured_badge_id === a.id && (
                      <span className="text-xs text-violet-400 flex-shrink-0">Featured</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Customize tab (own profile only) */}
      {tab === 'customize' && isOwnProfile && (
        <div className="space-y-4">
          <AvatarPicker
            username={profile.username}
            currentConfig={profile.avatar_config}
            onSave={handleSaveAvatar}
          />
          <BadgePicker
            achievements={profile.achievements || []}
            currentId={profile.featured_badge_id}
            onSave={handleSaveBadge}
          />
          <div className="card space-y-3">
            <p className="text-xs text-textSecondary uppercase tracking-wider font-semibold">Tutorial</p>
            <p className="text-xs text-textSecondary">Forgot how the game works? Replay the intro.</p>
            <button
              onClick={() => setReplayOnboarding(true)}
              className="btn-ghost text-sm"
            >
              Replay tutorial
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
