'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getConfessions, postConfession } from '@/lib/api';
import { getTodayPrompt } from '@/lib/daily-prompt';
import { useAuth } from '@/context/AuthContext';
import { ConfessionCard } from '@/components/ConfessionCard';
import { AdPlaceholder } from '@/components/AdPlaceholder';
import { OnboardingModal } from '@/components/OnboardingModal';
import { ConfessionCardSkeleton } from '@/components/Skeletons';
import { useToast } from '@/components/Toast';

export default function HomePage() {
  const { user, profile, setProfile, loading: authLoading } = useAuth();
  const { showToast, ToastContainer } = useToast();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Show onboarding once when we first know the user hasn't completed it
  useEffect(() => {
    if (!authLoading && user && profile && profile.onboarding_completed === false) {
      setShowOnboarding(true);
    }
  }, [authLoading, user, profile?.onboarding_completed]);

  const [confessions, setConfessions] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingFeed, setLoadingFeed] = useState(true);

  const [content, setContent] = useState('');
  const [isTrue, setIsTrue] = useState(null); // null = not picked yet
  const [tagPrompt, setTagPrompt] = useState(false);
  const [posting, setPosting] = useState(false);

  const todayPrompt = getTodayPrompt();

  const fetchFeed = useCallback(async (p = 1) => {
    setLoadingFeed(true);
    try {
      const data = await getConfessions(p, user?.id);
      setConfessions(data.confessions);
      setTotalPages(data.totalPages);
    } catch {
      showToast('Failed to load confessions', 'error');
    } finally {
      setLoadingFeed(false);
    }
  }, [user?.id]);

  useEffect(() => { if (!authLoading) fetchFeed(page); }, [page, fetchFeed, authLoading]);

  const handlePost = async (e) => {
    e.preventDefault();
    if (!user) { showToast('Log in to post a confession', 'info'); return; }
    if (!content.trim()) return;
    if (isTrue === null) { showToast('Select True or False before posting', 'info'); return; }
    setPosting(true);
    try {
      const category = tagPrompt ? todayPrompt.category : null;
      await postConfession(content.trim(), isTrue, category);
      setContent('');
      setIsTrue(null);
      setTagPrompt(false);
      showToast('Confession posted! Results in 48h.', 'success');
      fetchFeed(1);
      setPage(1);
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to post';
      if (err?.response?.data?.limitReached) {
        showToast('Daily limit hit (3/day). Upgrade to Premium!', 'error');
      } else {
        showToast(msg, 'error');
      }
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <ToastContainer />
      {showOnboarding && (
        <OnboardingModal
          onDone={() => {
            setShowOnboarding(false);
            setProfile(prev => prev ? { ...prev, onboarding_completed: true } : prev);
          }}
        />
      )}

      <AdPlaceholder slot="banner" />

      {/* Streak bar (logged-in users) */}
      {user && profile && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-surface border border-border">
          <div className="flex items-center gap-2">
            <span className="text-lg">{profile.current_streak > 0 ? '🔥' : '💤'}</span>
            <span className="text-textPrimary text-sm font-medium">
              {profile.current_streak > 0 ? `${profile.current_streak} day streak` : 'No streak yet'}
            </span>
          </div>
          <Link href={`/u/${profile.username}`} className="text-textSecondary hover:text-textPrimary text-xs transition-colors">
            View profile →
          </Link>
        </div>
      )}

      {/* Daily prompt banner */}
      <div className="card bg-violet-500/10 border-violet-500/20 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-violet-300 font-semibold uppercase tracking-wider mb-0.5">Today's Theme</p>
          <p className="text-textPrimary font-medium">
            {todayPrompt.emoji} {todayPrompt.category}
          </p>
        </div>
        <p className="text-textSecondary text-xs text-right max-w-[180px]">
          Tag your confession to earn a <span className="text-violet-300 font-semibold">1.5× bonus</span> at resolution
        </p>
      </div>

      {/* Post form */}
      <div className="card">
        <h2 className="text-sm font-semibold text-textSecondary uppercase tracking-wider mb-3">
          Post a Confession
        </h2>
        {!profile?.is_premium && user && (
          <p className="text-xs text-textSecondary mb-3">
            Free: 3 confessions/day ·{' '}
            <Link href="/premium" className="text-violet-400 hover:underline">
              Upgrade for unlimited
            </Link>
          </p>
        )}
        <form onSubmit={handlePost} className="space-y-3">
          <div className="relative">
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              maxLength={300}
              rows={3}
              placeholder={user ? 'Confess something... you decide if it\'s real or fake. 🤫' : 'Sign in to post a confession...'}
              className="input resize-none"
              disabled={!user}
            />
            <span className={`absolute bottom-2 right-3 text-xs ${content.length > 270 ? 'text-orange-400' : 'text-textSecondary'}`}>
              {content.length}/300
            </span>
          </div>

          {/* True / False toggle */}
          {user && (
            <div className="space-y-1">
              <p className="text-xs text-textSecondary">Is this confession actually true?</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsTrue(true)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    isTrue === true
                      ? 'bg-green-500/20 text-green-400 border-green-500/50'
                      : 'bg-surface text-textSecondary border-border hover:border-green-500/30'
                  }`}
                >
                  ✅ True
                </button>
                <button
                  type="button"
                  onClick={() => setIsTrue(false)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    isTrue === false
                      ? 'bg-red-500/20 text-red-400 border-red-500/50'
                      : 'bg-surface text-textSecondary border-border hover:border-red-500/30'
                  }`}
                >
                  ❌ False
                </button>
              </div>
              <p className="text-xs text-textSecondary italic">Only you know. The community guesses.</p>
            </div>
          )}

          {/* Daily prompt tag toggle */}
          {user && (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={tagPrompt}
                onChange={e => setTagPrompt(e.target.checked)}
                className="w-4 h-4 rounded accent-violet-500"
              />
              <span className="text-xs text-textSecondary">
                Tag as today's theme: <span className="text-violet-300">{todayPrompt.emoji} {todayPrompt.category}</span>
                <span className="text-violet-400 ml-1">(+1.5× bonus)</span>
              </span>
            </label>
          )}

          <button
            type="submit"
            disabled={posting || !user || !content.trim() || isTrue === null}
            className="btn-primary w-full sm:w-auto"
          >
            {posting ? 'Posting...' : '🤫 Post Confession'}
          </button>
        </form>
      </div>

      {/* Feed */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-textSecondary uppercase tracking-wider">
          Latest Confessions
        </h2>

        {loadingFeed ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <ConfessionCardSkeleton key={i} />)}
          </div>
        ) : confessions.length === 0 ? (
          <div className="card text-center py-12 space-y-3">
            <p className="text-4xl">🤫</p>
            <p className="text-textPrimary font-semibold">No confessions in the feed yet</p>
            <p className="text-textSecondary text-sm">Be the first — post something true (or not) and let the community decide.</p>
          </div>
        ) : (
          confessions.map(c => (
            <ConfessionCard
              key={c.id}
              confession={c}
              onVoted={() => fetchFeed(page)}
              onDeleted={(id) => setConfessions(prev => prev.filter(x => x.id !== id))}
              showToast={showToast}
            />
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-ghost"
          >
            ← Prev
          </button>
          <span className="flex items-center text-textSecondary text-sm">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-ghost"
          >
            Next →
          </button>
        </div>
      )}

      <AdPlaceholder slot="rectangle" />
    </div>
  );
}
