import { useState } from 'react';
import {
  adminGetConfessions,
  adminDeleteConfession,
  adminGetUsers,
  adminBanUser,
  adminUnbanUser,
} from '../lib/api';

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function Admin() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState('');

  const [tab, setTab] = useState('confessions');
  const [confessions, setConfessions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  const flash = (msg) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(''), 3000);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await adminGetConfessions(password, 1);
      setAuthed(true);
      loadConfessions();
    } catch (err) {
      if (err?.response?.status === 401) {
        setError('Wrong password');
      } else {
        setError('Connection failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadConfessions = async () => {
    setLoading(true);
    try {
      const data = await adminGetConfessions(password);
      setConfessions(data.confessions || []);
    } catch { }
    setLoading(false);
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await adminGetUsers(password);
      setUsers(data.users || []);
    } catch { }
    setLoading(false);
  };

  const handleTabChange = (t) => {
    setTab(t);
    if (t === 'confessions') loadConfessions();
    if (t === 'users') loadUsers();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this confession?')) return;
    try {
      await adminDeleteConfession(password, id);
      setConfessions(prev => prev.filter(c => c.id !== id));
      flash('Confession deleted');
    } catch {
      flash('Failed to delete');
    }
  };

  const handleBan = async (id, isBanned) => {
    try {
      if (isBanned) {
        await adminUnbanUser(password, id);
        flash('User unbanned');
      } else {
        await adminBanUser(password, id);
        flash('User banned');
      }
      loadUsers();
    } catch {
      flash('Action failed');
    }
  };

  if (!authed) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">🔒</div>
            <h1 className="text-2xl font-bold text-textPrimary">Admin Access</h1>
          </div>
          <div className="card">
            {error && (
              <div className="mb-4 p-3 bg-red-500/15 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input"
                placeholder="Admin password"
                required
                autoFocus
              />
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Verifying...' : 'Enter Admin Panel'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-textPrimary">🔒 Admin Panel</h1>
        {actionMsg && (
          <span className="text-sm text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-lg">
            {actionMsg}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-3">
        <button
          onClick={() => handleTabChange('confessions')}
          className={`text-sm px-4 py-2 rounded-lg transition-colors ${tab === 'confessions' ? 'bg-violet-600 text-white' : 'text-textSecondary hover:text-textPrimary hover:bg-white/5'}`}
        >
          Confessions ({confessions.length})
        </button>
        <button
          onClick={() => handleTabChange('users')}
          className={`text-sm px-4 py-2 rounded-lg transition-colors ${tab === 'users' ? 'bg-violet-600 text-white' : 'text-textSecondary hover:text-textPrimary hover:bg-white/5'}`}
        >
          Users ({users.length})
        </button>
      </div>

      {loading && (
        <div className="text-textSecondary text-sm text-center py-4 animate-pulse">Loading...</div>
      )}

      {/* Confessions tab */}
      {tab === 'confessions' && !loading && (
        <div className="space-y-3">
          {confessions.length === 0 && (
            <p className="text-textSecondary text-sm text-center py-8">No confessions</p>
          )}
          {confessions.map(c => (
            <div key={c.id} className={`card ${c.is_deleted ? 'opacity-50 border-red-500/20' : ''}`}>
              <div className="flex justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${c.is_deleted ? 'line-through text-textSecondary' : 'text-textPrimary'}`}>
                    "{c.content}"
                  </p>
                  <p className="text-textSecondary text-xs mt-1">
                    @{c.profiles?.username || 'deleted'} · {formatDate(c.created_at)} · ✅{c.real_votes} ❌{c.fake_votes}
                    {c.is_deleted && ' · [deleted]'}
                  </p>
                </div>
                {!c.is_deleted && (
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="flex-shrink-0 text-red-400 hover:text-red-300 text-xs px-3 py-1.5 rounded-lg border border-red-500/30 hover:bg-red-500/10 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Users tab */}
      {tab === 'users' && !loading && (
        <div className="space-y-3">
          {users.length === 0 && (
            <p className="text-textSecondary text-sm text-center py-8">No users</p>
          )}
          {users.map(u => (
            <div key={u.id} className={`card ${u.is_banned ? 'border-red-500/20 bg-red-500/5' : ''}`}>
              <div className="flex justify-between gap-4 items-center">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-textPrimary text-sm font-medium">@{u.username}</span>
                    {u.is_premium && <span className="badge bg-yellow-500/20 text-yellow-400">⭐ Premium</span>}
                    {u.is_banned && <span className="badge bg-red-500/20 text-red-400">Banned</span>}
                  </div>
                  <p className="text-textSecondary text-xs mt-0.5">
                    {u.email} · Joined {formatDate(u.created_at)} · 🎭{u.confession_points}pts 🔍{u.detection_points}pts
                  </p>
                </div>
                <button
                  onClick={() => handleBan(u.id, u.is_banned)}
                  className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    u.is_banned
                      ? 'text-green-400 border-green-500/30 hover:bg-green-500/10'
                      : 'text-red-400 border-red-500/30 hover:bg-red-500/10'
                  }`}
                >
                  {u.is_banned ? 'Unban' : 'Ban'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
