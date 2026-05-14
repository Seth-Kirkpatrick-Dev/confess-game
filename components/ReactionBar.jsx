'use client';

import { useState } from 'react';
import { reactToConfession } from '@/lib/api';

const EMOJIS = ['😂', '😱', '🤔', '💯', '🔥', '😬'];

export function ReactionBar({ confessionId, reactions: initialReactions, userReactions: initialUserReactions, user, showToast }) {
  const [counts, setCounts] = useState(initialReactions || {});
  const [mine, setMine] = useState(new Set(initialUserReactions || []));
  const [pending, setPending] = useState(null); // emoji currently in-flight

  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  const topEmoji = total > 0
    ? EMOJIS.reduce((best, e) => ((counts[e] || 0) > (counts[best] || 0) ? e : best), EMOJIS[0])
    : null;

  const handleReact = async (emoji) => {
    if (!user) { showToast?.('Log in to react', 'info'); return; }
    if (pending) return;

    const wasReacted = mine.has(emoji);
    const delta = wasReacted ? -1 : 1;

    // Optimistic update
    setPending(emoji);
    setCounts(prev => ({ ...prev, [emoji]: Math.max(0, (prev[emoji] || 0) + delta) }));
    setMine(prev => {
      const next = new Set(prev);
      wasReacted ? next.delete(emoji) : next.add(emoji);
      return next;
    });

    try {
      await reactToConfession(confessionId, emoji);
    } catch {
      // Rollback
      setCounts(prev => ({ ...prev, [emoji]: Math.max(0, (prev[emoji] || 0) - delta) }));
      setMine(prev => {
        const next = new Set(prev);
        wasReacted ? next.add(emoji) : next.delete(emoji);
        return next;
      });
      showToast?.('Failed to react', 'error');
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {topEmoji && counts[topEmoji] >= 3 && (
        <span className="text-xs font-semibold text-textSecondary mr-1">
          {topEmoji} {counts[topEmoji]}
        </span>
      )}
      {EMOJIS.map(emoji => {
        const count = counts[emoji] || 0;
        const reacted = mine.has(emoji);
        return (
          <button
            key={emoji}
            onClick={() => handleReact(emoji)}
            disabled={pending === emoji}
            title={reacted ? 'Remove reaction' : 'React'}
            className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition-all ${
              reacted
                ? 'bg-violet-500/20 border border-violet-500/40 text-textPrimary scale-105'
                : count > 0
                ? 'bg-surface border border-border text-textSecondary hover:border-violet-500/30 hover:bg-violet-500/10'
                : 'border border-transparent text-textSecondary/30 hover:text-textSecondary hover:border-border hover:bg-surface'
            }`}
          >
            <span>{emoji}</span>
            {count > 0 && <span className="tabular-nums">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
