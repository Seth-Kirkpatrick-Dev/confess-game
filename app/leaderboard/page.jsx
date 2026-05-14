'use client';

import { useEffect, useState } from 'react';
import { TierBadge } from '@/components/TierBadge';
import { Avatar } from '@/components/Avatar';
import { AdPlaceholder } from '@/components/AdPlaceholder';

const TABS = ['All-Time', 'This Week', 'This Month'];

function RankIcon({ i }) {
  if (i === 0) return <span className="text-yellow-400 text-lg w-7 text-center">🥇</span>;
  if (i === 1) return <span className="text-gray-300 text-lg w-7 text-center">🥈</span>;
  if (i === 2) return <span className="text-amber-600 text-lg w-7 text-center">🥉</span>;
  return <span className="text-textSecondary text-sm w-7 text-center">#{i + 1}</span>;
}

function LeaderRow({ profile, i, pointsKey, label }) {
  const pts = pointsKey ? profile[pointsKey] : profile.points;
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg ${i === 0 ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-surfaceHover'}`}>
      <div className="flex items-center gap-2.5">
        <RankIcon i={i} />
        <Avatar username={profile.username} config={profile.avatar_config} size={28} />
        <span className="text-textPrimary text-sm font-medium">@{profile.username}</span>
        {profile.featured_badge_icon && (
          <span className="text-xs">{profile.featured_badge_icon}</span>
        )}
        <TierBadge tier={profile.tier} showLabel />
      </div>
      <div className="text-right">
        <span className="text-violet-400 font-bold text-sm">{pts}</span>
        <span className="text-textSecondary text-xs ml-1">{label}</span>
      </div>
    </div>
  );
}

function LeaderTable({ title, emoji, rows, pointsKey, label }) {
  return (
    <div className="card">
      <h2 className="text-sm font-semibold text-textSecondary uppercase tracking-wider mb-4">
        {emoji} {title}
      </h2>
      {rows.length === 0 ? (
        <p className="text-textSecondary text-sm text-center py-4">No data yet</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row, i) => (
            <LeaderRow key={row.id || row.user_id || i} profile={row.profiles || row} i={i} pointsKey={pointsKey} label={label} />
          ))}
        </div>
      )}
    </div>
  );
}

async function fetchAllTime() {
  const res = await fetch('/api/leaderboard');
  return res.json();
}

async function fetchPeriod(period) {
  const res = await fetch(`/api/leaderboard?period=${period}`);
  return res.json();
}

export default function LeaderboardPage() {
  const [tab, setTab] = useState('All-Time');
  const [allTime, setAllTime] = useState(null);
  const [weekly, setWeekly] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        if (tab === 'All-Time' && !allTime) {
          const data = await fetchAllTime();
          setAllTime(data);
        } else if (tab === 'This Week' && !weekly) {
          const data = await fetchPeriod('weekly');
          setWeekly(data.leaders || []);
        } else if (tab === 'This Month' && !monthly) {
          const data = await fetchPeriod('monthly');
          setMonthly(data.leaders || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tab]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-6">
          {[1, 2].map(i => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-surfaceHover rounded w-48 mb-4" />
              {[1, 2, 3].map(j => (
                <div key={j} className="h-12 bg-surfaceHover rounded mb-2" />
              ))}
            </div>
          ))}
        </div>
      );
    }

    if (tab === 'All-Time' && allTime) {
      return (
        <>
          <LeaderTable title="Top Confessors" emoji="🎭" rows={allTime.confessors || []} pointsKey="confession_points" label="pts" />
          <LeaderTable title="Top Detectors" emoji="🔍" rows={allTime.detectors || []} pointsKey="detection_points" label="pts" />
        </>
      );
    }

    if (tab === 'This Week' && weekly !== null) {
      return (
        <LeaderTable title="This Week's Leaders" emoji="📅" rows={weekly} pointsKey="points" label="pts" />
      );
    }

    if (tab === 'This Month' && monthly !== null) {
      return (
        <LeaderTable title="This Month's Leaders" emoji="📆" rows={monthly} pointsKey="points" label="pts" />
      );
    }

    return null;
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-textPrimary">Leaderboard</h1>
        <p className="text-textSecondary text-sm mt-1">Who's fooling and detecting best?</p>
      </div>

      <AdPlaceholder slot="banner" />

      {/* Tabs */}
      <div className="flex gap-1 bg-surface border border-border rounded-xl p-1">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? 'bg-violet-600 text-white' : 'text-textSecondary hover:text-textPrimary'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {renderContent()}

      <div className="card bg-violet-500/10 border-violet-500/20">
        <h3 className="text-sm font-semibold text-violet-300 mb-2">How points work</h3>
        <ul className="text-xs text-textSecondary space-y-1.5">
          <li>🎭 <span className="text-textPrimary">Up to +30 pts</span> — Poster score at 48h: scaled by how close the vote was to 50/50 (1.5× with daily theme tag)</li>
          <li>🔍 <span className="text-textPrimary">+5 pts</span> — Your vote matched the poster's real truth at resolution</li>
          <li>❌ <span className="text-textPrimary">-2 pts</span> — Your vote was wrong at resolution</li>
          <li>📅 Weekly and monthly points reset each period; all-time never resets</li>
          <li>🏅 Tiers unlock at 10+ resolved votes based on your accuracy</li>
        </ul>
      </div>
    </div>
  );
}
