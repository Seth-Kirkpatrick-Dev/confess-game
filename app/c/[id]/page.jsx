'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getConfession, voteOnConfession, deleteConfession } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { TierBadge } from '@/components/TierBadge';
import { Avatar } from '@/components/Avatar';
import { ReportModal } from '@/components/ReportModal';
import { ReactionBar } from '@/components/ReactionBar';

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function ConfessionPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, profile } = useAuth();
  const [reportOpen, setReportOpen] = useState(false);
  const { showToast, ToastContainer } = useToast();

  const [confession, setConfession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const fetchConfession = async () => {
    try {
      const data = await getConfession(id);
      // API returns limited payload when under review
      if (data.confession?.is_hidden_pending_review) {
        setConfession({ id, is_hidden_pending_review: true });
      } else {
        setConfession(data.confession);
      }
    } catch (err) {
      if (err?.response?.status === 404) setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this confession? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await deleteConfession(id);
      showToast('Confession deleted', 'success');
      router.push('/');
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to delete', 'error');
      setDeleting(false);
    }
  };

  useEffect(() => { fetchConfession(); }, [id]);

  const handleVote = async (vote) => {
    if (!user) { showToast('Log in to vote', 'info'); return; }
    if (voting) return;
    setVoting(true);
    try {
      const result = await voteOnConfession(id, vote);
      setConfession(prev => ({ ...prev, ...result, userVote: vote }));
      showToast('Vote locked in — results revealed at resolution', 'info');
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to vote', 'error');
    } finally {
      setVoting(false);
    }
  };

  const handleShare = async (platform) => {
    const url = `${window.location.origin}/c/${id}`;
    const text = confession ? `"${confession.content}" — can you tell if this is real or fake?` : '';
    if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
    } else {
      await navigator.clipboard.writeText(url);
      showToast('Link copied!', 'success');
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="card animate-pulse space-y-4">
          <div className="h-4 bg-surfaceHover rounded w-3/4" />
          <div className="h-4 bg-surfaceHover rounded w-1/2" />
          <div className="h-24 bg-surfaceHover rounded" />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 text-center">
        <p className="text-textSecondary text-lg">Confession not found.</p>
        <Link href="/" className="text-violet-400 text-sm hover:underline mt-2 inline-block">← Back to feed</Link>
      </div>
    );
  }

  if (confession?.is_hidden_pending_review) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <Link href="/" className="text-textSecondary hover:text-textPrimary text-sm flex items-center gap-1 w-fit">← Feed</Link>
        <div className="card text-center py-12 space-y-3">
          <p className="text-3xl">🔍</p>
          <p className="text-textPrimary font-semibold">This confession is under review</p>
          <p className="text-textSecondary text-sm">It has been temporarily hidden while our moderation team investigates community reports.</p>
        </div>
      </div>
    );
  }

  const c = confession;
  const hasVoted = c.userVote !== null && c.userVote !== undefined;
  const isResolved = c.is_resolved;
  const totalVotes = (c.real_votes ?? 0) + (c.fake_votes ?? 0);
  const realPct = totalVotes > 0 ? Math.round(((c.real_votes ?? 0) / totalVotes) * 100) : 50;
  const isCorrect = isResolved && hasVoted ? (c.userVote === 'real') === c.is_true : null;
  const truthLabel = c.is_true === true ? 'Real' : c.is_true === false ? 'Fake' : null;
  const isAuthor = user?.id === c.user_id;

  const resolvedAt = c.resolved_at
    ? new Date(new Date(c.resolved_at).getTime())
    : new Date(new Date(c.created_at).getTime() + 48 * 60 * 60 * 1000);

  return (
    <>
    {reportOpen && (
      <ReportModal
        confessionId={id}
        resolvedVotes={profile?.total_resolved_votes}
        onClose={() => setReportOpen(false)}
        showToast={showToast}
      />
    )}
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <ToastContainer />

      <Link href="/" className="text-textSecondary hover:text-textPrimary text-sm flex items-center gap-1 w-fit">
        ← Feed
      </Link>

      <div className="card space-y-4">
        {/* Prompt badge */}
        {c.prompt_category && (
          <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/20">
            📌 {c.prompt_category}
          </span>
        )}

        {/* Content */}
        <p className="text-textPrimary text-lg leading-relaxed">"{c.content}"</p>

        {/* Author + meta */}
        <div className="flex items-center gap-2 text-xs text-textSecondary flex-wrap">
          <Avatar username={c.profiles?.username} config={c.profiles?.avatar_config} size={20} />
          <Link href={`/u/${c.profiles?.username}`} className="hover:text-textPrimary transition-colors">
            @{c.profiles?.username || 'anonymous'}
          </Link>
          {c.profiles?.featured_badge_icon && (
            <span className="text-xs" title="Featured badge">{c.profiles.featured_badge_icon}</span>
          )}
          <TierBadge tier={c.profiles?.tier} showLabel />
          <span>·</span>
          <span>{formatDate(c.created_at)}</span>
          {isResolved ? (
            <span className="badge bg-violet-500/20 text-violet-400">resolved</span>
          ) : (
            <span className="text-textSecondary">
              Resolves ~{formatDate(resolvedAt.toISOString())}
            </span>
          )}
        </div>

        {/* Truth reveal */}
        {isResolved && truthLabel && (
          <div className={`flex items-center justify-between p-3 rounded-lg border ${c.is_true ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
            <div>
              <p className="text-xs text-textSecondary mb-0.5">The truth</p>
              <p className={`font-bold text-lg ${c.is_true ? 'text-green-400' : 'text-red-400'}`}>
                {c.is_true ? '✅ Real' : '❌ Fake'}
              </p>
            </div>
            {isCorrect !== null && (
              <div className="text-right">
                <p className="text-xs text-textSecondary mb-0.5">Your result</p>
                <p className={`font-bold ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                  {isCorrect ? '+5 pts ✓' : '-2 pts ✗'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Vote split */}
        {(hasVoted || isResolved) && totalVotes > 0 && (
          <div>
            <div className="flex justify-between text-xs text-textSecondary mb-1">
              <span className="text-green-400">Real {realPct}%</span>
              <span className="text-red-400">{100 - realPct}% Fake</span>
            </div>
            <div className="h-2.5 bg-surfaceHover rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-700"
                style={{ width: `${realPct}%` }}
              />
            </div>
            <p className="text-textSecondary text-xs mt-1 text-center">{totalVotes} votes</p>
          </div>
        )}

        {/* Voting buttons */}
        {!isResolved && !hasVoted && (
          <div className="flex gap-2">
            <button
              onClick={() => handleVote('real')}
              disabled={voting || c.user_id === user?.id}
              className="vote-btn flex-1 bg-green-500/15 hover:bg-green-500/25 text-green-400 border border-green-500/30 hover:border-green-500/60"
            >
              ✅ Real
            </button>
            <button
              onClick={() => handleVote('fake')}
              disabled={voting || c.user_id === user?.id}
              className="vote-btn flex-1 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 hover:border-red-500/60"
            >
              ❌ Fake
            </button>
          </div>
        )}

        {!isResolved && hasVoted && (
          <div className="flex gap-2">
            <div className={`vote-btn flex-1 cursor-default ${c.userVote === 'real' ? 'bg-green-500/20 text-green-400 border border-green-500/40' : 'bg-surface text-textSecondary border border-border'}`}>
              ✅ Real {c.userVote === 'real' ? '← your vote' : ''}
            </div>
            <div className={`vote-btn flex-1 cursor-default ${c.userVote === 'fake' ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-surface text-textSecondary border border-border'}`}>
              ❌ Fake {c.userVote === 'fake' ? '← your vote' : ''}
            </div>
          </div>
        )}

        {/* Reactions */}
        <ReactionBar
          confessionId={c.id}
          reactions={c.reactions}
          userReactions={c.userReactions}
          user={user}
          showToast={showToast}
        />

        {/* Share + author actions */}
        <div className="flex gap-2 pt-1 flex-wrap">
          <button
            onClick={() => handleShare('twitter')}
            className="flex-1 py-2 rounded-lg text-sm border border-border text-textSecondary hover:text-textPrimary hover:border-border/80 hover:bg-surfaceHover transition-colors"
          >
            𝕏 Share on X
          </button>
          <button
            onClick={() => handleShare('copy')}
            className="flex-1 py-2 rounded-lg text-sm border border-border text-textSecondary hover:text-textPrimary hover:border-border/80 hover:bg-surfaceHover transition-colors"
          >
            🔗 Copy link
          </button>
          {isAuthor && (
            isResolved ? (
              <span
                title="Cannot delete after resolution"
                className="py-2 px-4 rounded-lg text-sm border border-border text-textSecondary/40 cursor-not-allowed select-none"
              >
                🗑 Delete
              </span>
            ) : (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="py-2 px-4 rounded-lg text-sm border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
              >
                {deleting ? 'Deleting…' : '🗑 Delete'}
              </button>
            )
          )}
          {user && !isAuthor && (
            <button
              onClick={() => setReportOpen(true)}
              className="py-2 px-3 rounded-lg text-sm border border-border text-textSecondary/50 hover:text-red-400/70 hover:border-red-500/20 hover:bg-red-500/5 transition-colors"
              title="Report this confession"
            >
              🚩 Report
            </button>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
