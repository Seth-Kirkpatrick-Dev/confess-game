'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getConfessions, postConfession } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { ConfessionCard } from '@/components/ConfessionCard';
import { AdPlaceholder } from '@/components/AdPlaceholder';
import { useToast } from '@/components/Toast';

export default function HomePage() {
  const { user, profile } = useAuth();
  const { showToast, ToastContainer } = useToast();

  const [confessions, setConfessions] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingFeed, setLoadingFeed] = useState(true);

  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);

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

  useEffect(() => { fetchFeed(page); }, [page, fetchFeed]);

  const handlePost = async (e) => {
    e.preventDefault();
    if (!user) { showToast('Log in to post a confession', 'info'); return; }
    if (!content.trim()) return;
    setPosting(true);
    try {
      await postConfession(content.trim());
      setContent('');
      showToast('Confession posted!', 'success');
      fetchFeed(1);
      setPage(1);
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to post';
      const isLimit = err?.response?.data?.limitReached;
      if (isLimit) {
        showToast('Daily limit hit (3/day). Upgrade to Premium!', 'error');
      } else {
        showToast(msg, 'error');
      }
    } finally {
      setPosting(false);
    }
  };

  const remaining = content.length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <ToastContainer />

      <AdPlaceholder slot="banner" />

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
              placeholder={user ? 'Confess something... real or fake, you decide. 🤫' : 'Sign in to post a confession...'}
              className="input resize-none"
              disabled={!user}
            />
            <span className={`absolute bottom-2 right-3 text-xs ${remaining > 270 ? 'text-orange-400' : 'text-textSecondary'}`}>
              {remaining}/300
            </span>
          </div>
          <button
            type="submit"
            disabled={posting || !user || !content.trim()}
            className="btn-primary w-full sm:w-auto"
          >
            {posting ? 'Posting...' : '🤫 Post Confession'}
          </button>
        </form>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-textSecondary uppercase tracking-wider">
          Latest Confessions
        </h2>

        {loadingFeed ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="card animate-pulse">
                <div className="h-4 bg-surfaceHover rounded w-3/4 mb-2" />
                <div className="h-4 bg-surfaceHover rounded w-1/2 mb-4" />
                <div className="h-10 bg-surfaceHover rounded" />
              </div>
            ))}
          </div>
        ) : confessions.length === 0 ? (
          <div className="card text-center py-12 text-textSecondary">
            No confessions yet. Be the first to post! 🤫
          </div>
        ) : (
          confessions.map(c => (
            <ConfessionCard
              key={c.id}
              confession={c}
              onVoted={() => fetchFeed(page)}
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
