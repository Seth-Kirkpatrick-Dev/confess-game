'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { getNotifications, markNotificationsRead } from '@/lib/api';

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  const fetchNotifications = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // silent — bell is best-effort
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // poll every minute
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = async () => {
    const wasOpen = open;
    setOpen(!wasOpen);
    if (!wasOpen && unreadCount > 0) {
      // Mark all read optimistically
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      try {
        await markNotificationsRead([]);
      } catch {
        // best-effort
      }
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg hover:bg-white/5 text-textSecondary hover:text-textPrimary transition-colors"
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-violet-500 text-white text-[10px] font-bold px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-surface border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-textPrimary">Notifications</p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading && (
              <p className="text-textSecondary text-sm text-center py-6">Loading...</p>
            )}
            {!loading && notifications.length === 0 && (
              <div className="px-4 py-8 text-center space-y-2">
                <p className="text-2xl">🔔</p>
                <p className="text-sm text-textPrimary font-medium">Nothing here yet</p>
                <p className="text-xs text-textSecondary">When confessions you've voted on resolve, you'll see results here.</p>
                <a
                  href="/"
                  onClick={() => setOpen(false)}
                  className="inline-block mt-2 text-xs text-violet-400 hover:underline"
                >
                  Go vote on some confessions →
                </a>
              </div>
            )}
            {notifications.map(n => {
              if (n.type === 'achievement') {
                return (
                  <div
                    key={n.id}
                    className={`px-4 py-3 border-b border-border ${!n.is_read ? 'bg-yellow-500/5' : ''}`}
                  >
                    <p className="text-xs text-textSecondary mb-1">{timeAgo(n.created_at)}</p>
                    <p className="text-sm text-textPrimary font-medium">{n.message}</p>
                  </div>
                );
              }
              return (
                <Link
                  key={n.id}
                  href={`/c/${n.confession_id}`}
                  onClick={() => setOpen(false)}
                  className={`block px-4 py-3 border-b border-border hover:bg-surfaceHover transition-colors ${!n.is_read ? 'bg-violet-500/5' : ''}`}
                >
                  <p className="text-xs text-textSecondary mb-1">{timeAgo(n.created_at)}</p>
                  <p className="text-sm text-textPrimary line-clamp-2 mb-1.5">
                    "{n.confessions?.content}"
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-textSecondary">
                      You voted <span className="font-medium text-textPrimary capitalize">{n.your_vote}</span>
                      {' · '}Truth: <span className={`font-medium capitalize ${n.truth === 'real' ? 'text-green-400' : 'text-red-400'}`}>{n.truth}</span>
                    </span>
                    <span className={`text-xs font-bold ml-auto ${n.is_correct ? 'text-green-400' : 'text-red-400'}`}>
                      {n.points_awarded > 0 ? `+${n.points_awarded}` : n.points_awarded} pts
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
