'use client';

import { useState } from 'react';
import Link from 'next/link';
import { voteOnConfession, deleteConfession } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { ReportModal } from '@/components/ReportModal';
import { ReactionBar } from '@/components/ReactionBar';
import { ConfirmModal } from '@/components/ConfirmModal';
import { UserDisplay } from '@/components/UserDisplay';

function formatTime(ts) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function ConfessionCard({ confession, onVoted, showToast, onDeleted }) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [localData, setLocalData] = useState(null);

  const data = localData || confession;
  const hasVoted = data.userVote !== null && data.userVote !== undefined;
  const isResolved = data.is_resolved;

  const totalVotes = (data.real_votes ?? 0) + (data.fake_votes ?? 0);
  const realPct = totalVotes > 0 ? Math.round(((data.real_votes ?? 0) / totalVotes) * 100) : 50;

  // Only computable after resolution (API strips is_true until then)
  const isCorrect = isResolved && hasVoted
    ? (data.userVote === 'real') === data.is_true
    : null;

  const truthLabel = data.is_true === true ? 'Real' : data.is_true === false ? 'Fake' : null;
  const truthColor = data.is_true === true ? 'text-green-400' : 'text-red-400';

  const handleVote = async (vote) => {
    if (!user) { showToast('Log in to vote', 'info'); return; }
    if (hasVoted || loading || isResolved) return;
    setLoading(true);
    try {
      const result = await voteOnConfession(confession.id, vote);
      setLocalData({ ...data, ...result, userVote: vote });
      showToast('Vote locked in — results revealed at resolution', 'info');
      onVoted?.();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to vote', 'error');
    } finally {
      setLoading(false);
    }
  };

  const isAuthor = user?.id === data.user_id;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteConfession(confession.id);
      showToast('Confession deleted', 'success');
      onDeleted?.(confession.id);
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to delete', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/c/${confession.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ text: `"${confession.content}"`, url });
      } else {
        await navigator.clipboard.writeText(url);
        showToast('Link copied!', 'info');
      }
    } catch {
      showToast('Could not share', 'error');
    }
  };

  return (
    <>
    {reportOpen && (
      <ReportModal
        confessionId={confession.id}
        resolvedVotes={profile?.total_resolved_votes}
        onClose={() => setReportOpen(false)}
        showToast={showToast}
      />
    )}
    {confirmDelete && (
      <ConfirmModal
        title="Delete confession?"
        message="This cannot be undone. The confession will be permanently removed."
        confirmLabel="Delete"
        danger
        onConfirm={() => { setConfirmDelete(false); handleDelete(); }}
        onCancel={() => setConfirmDelete(false)}
      />
    )}
    <div className="card relative overflow-hidden hover:border-border/80 transition-colors">
      {/* Daily prompt badge */}
      {data.prompt_category && (
        <span className="inline-block mb-2 text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/20">
          📌 {data.prompt_category}
        </span>
      )}

      <p className="text-textPrimary text-base leading-relaxed mb-4">
        "{data.content}"
      </p>

      {/* Truth reveal — only shown after resolution */}
      {isResolved && truthLabel && (
        <div className={`flex items-center gap-2 mb-3 text-sm font-semibold ${truthColor}`}>
          {data.is_true ? '✅' : '❌'} This was <span className="uppercase">{truthLabel}</span>
          {isCorrect !== null && (
            <span className={`ml-auto text-xs font-normal ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
              {isCorrect ? '+5 pts ✓' : '-2 pts ✗'}
            </span>
          )}
        </div>
      )}

      {/* Vote split — only shown after voting or resolution */}
      {(hasVoted || isResolved) && totalVotes > 0 && (
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

      {/* Voting buttons */}
      {!isResolved && !hasVoted ? (
        <div className="flex gap-2">
          <button
            onClick={() => handleVote('real')}
            disabled={loading || confession.user_id === user?.id}
            className="vote-btn bg-green-500/15 hover:bg-green-500/25 text-green-400 border border-green-500/30 hover:border-green-500/60"
          >
            ✅ Real
          </button>
          <button
            onClick={() => handleVote('fake')}
            disabled={loading || confession.user_id === user?.id}
            className="vote-btn bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 hover:border-red-500/60"
          >
            ❌ Fake
          </button>
        </div>
      ) : !isResolved && hasVoted ? (
        <div className="flex gap-2">
          <div className={`vote-btn cursor-default ${data.userVote === 'real' ? 'bg-green-500/20 text-green-400 border border-green-500/40' : 'bg-surface text-textSecondary border border-border'}`}>
            ✅ Real {data.userVote === 'real' ? '← your vote' : ''}
          </div>
          <div className={`vote-btn cursor-default ${data.userVote === 'fake' ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-surface text-textSecondary border border-border'}`}>
            ❌ Fake {data.userVote === 'fake' ? '← your vote' : ''}
          </div>
        </div>
      ) : null}

      {/* Reactions */}
      <div className="mt-3">
        <ReactionBar
          confessionId={data.id}
          reactions={data.reactions}
          userReactions={data.userReactions}
          user={user}
          showToast={showToast}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <div className="flex items-center gap-2 flex-wrap">
          <UserDisplay user={data.profiles} avatarSize={18} />
          <span className="text-border text-xs">·</span>
          <span className="text-textSecondary text-xs">{formatTime(data.created_at)}</span>
          {isResolved && (
            <>
              <span className="text-border text-xs">·</span>
              <span className="badge bg-violet-500/20 text-violet-400">resolved</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isAuthor && (
            isResolved ? (
              <span
                title="Cannot delete after resolution"
                className="text-textSecondary/40 text-xs px-2 py-1 cursor-not-allowed select-none"
              >
                🗑
              </span>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                disabled={deleting}
                className="text-textSecondary hover:text-red-400 text-xs px-2 py-1 rounded hover:bg-red-500/5 transition-colors"
                title="Delete confession"
              >
                {deleting ? '…' : '🗑'}
              </button>
            )
          )}
          {user && !isAuthor && (
            <button
              onClick={() => setReportOpen(true)}
              className="text-textSecondary/50 hover:text-red-400/70 text-xs px-2 py-1 rounded hover:bg-red-500/5 transition-colors"
              title="Report"
            >
              🚩
            </button>
          )}
          <button
            onClick={handleShare}
            className="text-textSecondary hover:text-textPrimary text-xs px-2 py-1 rounded hover:bg-white/5 transition-colors"
            title="Share"
          >
            ↗ share
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
