'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getUserProfile } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const TIER_CONFIG = {
  Newbie:        { color: 'text-textSecondary', bg: 'bg-surface border-border',               icon: '👤', desc: 'Not enough data yet' },
  Skeptic:       { color: 'text-blue-400',      bg: 'bg-blue-500/10 border-blue-500/20',      icon: '🤔', desc: '50-60% accuracy' },
  'Truth Hunter':{ color: 'text-green-400',     bg: 'bg-green-500/10 border-green-500/20',    icon: '🔎', desc: '60-70% accuracy' },
  'Lie Detector':{ color: 'text-violet-400',    bg: 'bg-violet-500/10 border-violet-500/20',  icon: '🕵️', desc: '70-80% accuracy' },
  Oracle:        { color: 'text-yellow-400',    bg: 'bg-yellow-500/10 border-yellow-500/20',  icon: '🔮', desc: '80%+ accuracy' },
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

export default function ProfilePage() {
  const { username } = useParams();
  const { profile: myProfile } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    getUserProfile(username)
      .then(data => setProfile(data.profile))
      .catch(err => { if (err?.response?.status === 404) setNotFound(true); })
      .finally(() => setLoading(false));
  }, [username]);

  const handleShare = async () => {
    const url = window.location.href;
    await navigator.clipboard.writeText(url);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="card animate-pulse h-32" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <div key={i} className="card animate-pulse h-20" />)}
        </div>
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
  const isOwnProfile = myProfile?.username === profile.username;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <Link href="/" className="text-textSecondary hover:text-textPrimary text-sm">← Feed</Link>

      {/* Header card */}
      <div className="card space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-textPrimary">@{profile.username}</h1>
            {isOwnProfile && <p className="text-xs text-textSecondary mt-0.5">Your profile</p>}
          </div>
          <button
            onClick={handleShare}
            className="text-textSecondary hover:text-textPrimary text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-surfaceHover transition-colors"
          >
            🔗 Share
          </button>
        </div>

        {/* Tier badge */}
        <div className={`flex items-center gap-3 p-3 rounded-lg border ${tier.bg}`}>
          <span className="text-2xl">{tier.icon}</span>
          <div>
            <p className={`font-bold ${tier.color}`}>{profile.tier}</p>
            <p className="text-xs text-textSecondary">{tier.desc}</p>
          </div>
          {profile.accuracy_pct !== null && (
            <div className="ml-auto text-right">
              <p className={`font-bold text-lg ${tier.color}`}>{profile.accuracy_pct}%</p>
              <p className="text-xs text-textSecondary">accuracy</p>
            </div>
          )}
        </div>

        {/* Streak */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔥</span>
            <div>
              <p className="text-textPrimary font-bold">{profile.current_streak} day streak</p>
              <p className="text-xs text-textSecondary">Longest: {profile.longest_streak} days</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBox label="Total Points" value={totalPoints} />
        <StatBox label="Confessions" value={profile.total_confessions} sub="posted" />
        <StatBox label="Votes Cast" value={profile.total_votes_cast} />
        <StatBox
          label="Resolved Votes"
          value={profile.total_resolved_votes}
          sub={profile.correct_votes > 0 ? `${profile.correct_votes} correct` : undefined}
        />
      </div>

      {/* Points breakdown */}
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

      {/* Recent activity */}
      {profile.recent_votes?.length > 0 && (
        <div className="card">
          <p className="text-xs text-textSecondary uppercase tracking-wider mb-3 font-semibold">Recent Resolved Votes</p>
          <div className="space-y-2">
            {profile.recent_votes.map((v, i) => (
              <Link
                key={i}
                href={`/c/${v.confessions?.id}`}
                className="block p-3 rounded-lg bg-surfaceHover hover:bg-surface transition-colors"
              >
                <p className="text-sm text-textPrimary line-clamp-1 mb-1">
                  "{v.confessions?.content}"
                </p>
                <div className="flex items-center gap-2 text-xs text-textSecondary">
                  <span>
                    Voted <span className="font-medium text-textPrimary capitalize">{v.vote_type}</span>
                    {' · '}Truth: <span className={`font-medium capitalize ${v.confessions?.is_true ? 'text-green-400' : 'text-red-400'}`}>
                      {v.confessions?.is_true ? 'Real' : 'Fake'}
                    </span>
                  </span>
                  <span className={`ml-auto font-bold ${v.is_correct ? 'text-green-400' : 'text-red-400'}`}>
                    {v.points_awarded > 0 ? `+${v.points_awarded}` : v.points_awarded} pts
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
