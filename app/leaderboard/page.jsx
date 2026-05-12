'use client';

import { useEffect, useState } from 'react';
import { getLeaderboard } from '@/lib/api';
import { AdPlaceholder } from '@/components/AdPlaceholder';

function LeaderTable({ title, emoji, data, pointsKey, label }) {
  return (
    <div className="card">
      <h2 className="text-sm font-semibold text-textSecondary uppercase tracking-wider mb-4">
        {emoji} {title}
      </h2>
      {data.length === 0 ? (
        <p className="text-textSecondary text-sm text-center py-4">No data yet</p>
      ) : (
        <div className="space-y-2">
          {data.map((row, i) => (
            <div
              key={row.id}
              className={`flex items-center justify-between p-3 rounded-lg ${i === 0 ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-surfaceHover'}`}
            >
              <div className="flex items-center gap-3">
                <span className={`text-lg w-7 text-center ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-textSecondary'}`}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </span>
                <span className="text-textPrimary text-sm font-medium">
                  @{row.username}
                </span>
              </div>
              <div className="text-right">
                <span className="text-violet-400 font-bold text-sm">{row[pointsKey]}</span>
                <span className="text-textSecondary text-xs ml-1">{label}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LeaderboardPage() {
  const [data, setData] = useState({ confessors: [], detectors: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeaderboard()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
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

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-textPrimary">Leaderboard</h1>
        <p className="text-textSecondary text-sm mt-1">Top players this season</p>
      </div>

      <AdPlaceholder slot="banner" />

      <LeaderTable
        title="Top Confessors"
        emoji="🎭"
        data={data.confessors}
        pointsKey="confession_points"
        label="pts"
      />

      <LeaderTable
        title="Top Detectors"
        emoji="🔍"
        data={data.detectors}
        pointsKey="detection_points"
        label="pts"
      />

      <div className="card bg-violet-500/10 border-violet-500/20">
        <h3 className="text-sm font-semibold text-violet-300 mb-2">How points work</h3>
        <ul className="text-xs text-textSecondary space-y-1.5">
          <li>🎭 <span className="text-textPrimary">+10 pts</span> — Your confession fools the majority (10+ votes, majority says Real)</li>
          <li>❌ <span className="text-textPrimary">-2 pts</span> — Majority catches your confession as Fake</li>
          <li>🔍 <span className="text-textPrimary">+5 pts</span> — You vote with the majority on a confession</li>
        </ul>
      </div>
    </div>
  );
}
