'use client';

import { useState } from 'react';
import { voteOnConfession } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

function formatTime(ts) {
  const d = new Date(ts);
  const now = Date.now();
  const diff = (now - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function ConfessionCard({ confession, onVoted, showToast }) {
  const { user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [localData, setLocalData] = useState(null);
  const [pointsPopup, setPointsPopup] = useState(null);

  const data = localData || confession;
  const hasVoted = data.userVote !== null && data.userVote !== undefined;
  const totalVotes = (data.real_votes || 0) + (data.fake_votes || 0);
  const realPct = totalVotes > 0 ? Math.round((data.real_votes / totalVotes) * 100) : 50;

  const handleVote = async (vote) => {
    if (!user) {
      showToast('Log in to vote', 'info');
      return;
    }
    if (hasVoted || loading) return;
    setLoading(true);
    try {
      const result = await voteOnConfession(confession.id, vote);
      setLocalData({ ...data, ...result, userVote: vote });
      if (result.pointsEarned > 0) {
        setPointsPopup(`+${result.pointsEarned} pts`);
        setTimeout(() => setPointsPopup(null), 2000);
        refreshProfile();
      }
      onVoted?.();
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to vote';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    const text = `"${confession.content}" — Vote on Confess! ${window.location.origin}/confession/${confession.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ text, url: window.location.origin });
      } else {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard!', 'info');
      }
    } catch {
      showToast('Could not share', 'error');
    }
  };

  return (
    <div className="card relative overflow-hidden group hover:border-border/80 transition-colors">
      {pointsPopup && (
        <div className="absolute top-4 right-4 bg-green-500 text-white text-sm font-bold px-3 py-1 rounded-full animate-slide-up z-10">
          {pointsPopup}
        </div>
      )}

      <p className="text-textPrimary text-base leading-relaxed mb-4 pr-8">
        "{data.content}"
      </p>

      {hasVoted && totalVotes > 0 && (
        <div className="mb-4 animate-fade-in">
          <div className="flex justify-between text-xs text-textSecondary mb-1">
            <span className="text-green-400">Real {realPct}%</span>
            <span className="text-red-400">{100 - realPct}% Fake</span>
          </div>
          <div className="h-2 bg-surfaceHover rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-700"
              style={{ width: `${realPct}%` }}
            />
          </div>
          <p className="text-textSecondary text-xs mt-1 text-center">{totalVotes} votes</p>
        </div>
      )}

      {!hasVoted ? (
        <div className="flex gap-2">
          <button
            onClick={() => handleVote('real')}
            disabled={loading || !!data.userVote || confession.user_id === user?.id}
            className="vote-btn bg-green-500/15 hover:bg-green-500/25 text-green-400 border border-green-500/30 hover:border-green-500/60"
          >
            ✅ Real
          </button>
          <button
            onClick={() => handleVote('fake')}
            disabled={loading || !!data.userVote || confession.user_id === user?.id}
            className="vote-btn bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 hover:border-red-500/60"
          >
            ❌ Fake
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <div className={`vote-btn cursor-default ${data.userVote === 'real' ? 'bg-green-500/20 text-green-400 border border-green-500/40' : 'bg-surface text-textSecondary border border-border'}`}>
            ✅ Real {data.userVote === 'real' ? '← your vote' : ''}
          </div>
          <div className={`vote-btn cursor-default ${data.userVote === 'fake' ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-surface text-textSecondary border border-border'}`}>
            ❌ Fake {data.userVote === 'fake' ? '← your vote' : ''}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <div className="flex items-center gap-2">
          <span className="text-textSecondary text-xs">
            @{data.profiles?.username || 'anonymous'}
          </span>
          <span className="text-border text-xs">·</span>
          <span className="text-textSecondary text-xs">{formatTime(data.created_at)}</span>
          {data.is_resolved && (
            <>
              <span className="text-border text-xs">·</span>
              <span className="badge bg-violet-500/20 text-violet-400">resolved</span>
            </>
          )}
        </div>
        <button
          onClick={handleShare}
          className="text-textSecondary hover:text-textPrimary text-xs px-2 py-1 rounded hover:bg-white/5 transition-colors"
          title="Share"
        >
          ↗ share
        </button>
      </div>
    </div>
  );
}
