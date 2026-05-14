'use client';

import { useState } from 'react';
import {
  adminGetConfessions,
  adminDeleteConfession,
  adminGetUsers,
  adminBanUser,
  adminUnbanUser,
  adminGetReports,
  adminRestoreConfession,
  adminClearUserFlag,
} from '@/lib/api';

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState('');

  const [tab, setTab] = useState('confessions');
  const [confessions, setConfessions] = useState([]);
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState({ confessions: [], users: [] });
  const [reportsSubTab, setReportsSubTab] = useState('confessions');
  const [expandedReport, setExpandedReport] = useState(null);
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

  const loadReports = async () => {
    setLoading(true);
    try {
      const [cData, uData] = await Promise.all([
        adminGetReports(password, 'confessions'),
        adminGetReports(password, 'users'),
      ]);
      setReports({ confessions: cData.confessions || [], users: uData.users || [] });
    } catch { }
    setLoading(false);
  };

  const handleTabChange = (t) => {
    setTab(t);
    if (t === 'confessions') loadConfessions();
    if (t === 'users') loadUsers();
    if (t === 'reports') loadReports();
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

  const handleRestore = async (confessionId) => {
    try {
      await adminRestoreConfession(password, confessionId);
      flash('Confession restored');
      setExpandedReport(null);
      loadReports();
    } catch { flash('Action failed'); }
  };

  const handleDeleteFromQueue = async (confessionId) => {
    if (!confirm('Delete this confession?')) return;
    try {
      await adminDeleteConfession(password, confessionId);
      flash('Confession deleted');
      setExpandedReport(null);
      loadReports();
    } catch { flash('Action failed'); }
  };

  const handleBanFromQueue = async (userId, confessionId) => {
    if (!confirm('Ban this user and delete their confession?')) return;
    try {
      await adminBanUser(password, userId);
      if (confessionId) await adminDeleteConfession(password, confessionId);
      flash('User banned');
      setExpandedReport(null);
      loadReports();
    } catch { flash('Action failed'); }
  };

  const handleClearUserFlag = async (userId) => {
    try {
      await adminClearUserFlag(password, userId);
      flash('Flag cleared');
      setExpandedReport(null);
      loadReports();
    } catch { flash('Action failed'); }
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

      <div className="flex gap-2 border-b border-border pb-3 flex-wrap">
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
        <button
          onClick={() => handleTabChange('reports')}
          className={`text-sm px-4 py-2 rounded-lg transition-colors ${tab === 'reports' ? 'bg-red-600 text-white' : 'text-textSecondary hover:text-textPrimary hover:bg-white/5'}`}
        >
          🚩 Reports ({reports.confessions.length + reports.users.length})
        </button>
      </div>

      {loading && (
        <div className="text-textSecondary text-sm text-center py-4 animate-pulse">Loading...</div>
      )}

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

      {tab === 'reports' && !loading && (
        <div className="space-y-4">
          {/* Sub-tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setReportsSubTab('confessions')}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${reportsSubTab === 'confessions' ? 'bg-surface border border-border text-textPrimary' : 'text-textSecondary hover:text-textPrimary'}`}
            >
              Flagged Confessions ({reports.confessions.length})
            </button>
            <button
              onClick={() => setReportsSubTab('users')}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${reportsSubTab === 'users' ? 'bg-surface border border-border text-textPrimary' : 'text-textSecondary hover:text-textPrimary'}`}
            >
              Flagged Users ({reports.users.length})
            </button>
          </div>

          {reportsSubTab === 'confessions' && (
            <div className="space-y-3">
              {reports.confessions.length === 0 && (
                <p className="text-textSecondary text-sm text-center py-8">No flagged confessions 🎉</p>
              )}
              {reports.confessions.map(c => (
                <div key={c.id} className="card border-red-500/20 space-y-3">
                  <div className="flex justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-textPrimary">"{c.content}"</p>
                      <p className="text-textSecondary text-xs mt-1">
                        @{c.profiles?.username} · {formatDate(c.created_at)}
                        · {c.reports.length} report{c.reports.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => setExpandedReport(expandedReport === c.id ? null : c.id)}
                      className="flex-shrink-0 text-xs text-textSecondary hover:text-textPrimary px-2 py-1 rounded hover:bg-white/5"
                    >
                      {expandedReport === c.id ? '▲' : '▼'} Details
                    </button>
                  </div>

                  {expandedReport === c.id && (
                    <div className="space-y-3 border-t border-border pt-3">
                      <div className="space-y-2">
                        {c.reports.map(r => (
                          <div key={r.id} className="p-2.5 rounded-lg bg-surfaceHover text-xs space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-red-400 font-medium capitalize">{r.reason}</span>
                              <span className="text-textSecondary">· @{r.profiles?.username} · {formatDate(r.created_at)}</span>
                            </div>
                            {r.notes && <p className="text-textSecondary italic">"{r.notes}"</p>}
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <button onClick={() => handleRestore(c.id)} className="text-xs px-3 py-1.5 rounded-lg border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-colors">
                          ✓ Restore
                        </button>
                        <button onClick={() => handleDeleteFromQueue(c.id)} className="text-xs px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors">
                          🗑 Delete
                        </button>
                        <button onClick={() => handleBanFromQueue(c.user_id, c.id)} className="text-xs px-3 py-1.5 rounded-lg border border-red-500/50 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                          🚫 Ban Poster + Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {reportsSubTab === 'users' && (
            <div className="space-y-3">
              {reports.users.length === 0 && (
                <p className="text-textSecondary text-sm text-center py-8">No flagged users 🎉</p>
              )}
              {reports.users.map(u => (
                <div key={u.id} className="card border-orange-500/20 space-y-3">
                  <div className="flex justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-textPrimary">@{u.username}</p>
                      <p className="text-textSecondary text-xs mt-0.5">
                        {u.email} · {u.reports.length} report{u.reports.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => setExpandedReport(expandedReport === u.id ? null : u.id)}
                      className="flex-shrink-0 text-xs text-textSecondary hover:text-textPrimary px-2 py-1 rounded hover:bg-white/5"
                    >
                      {expandedReport === u.id ? '▲' : '▼'} Details
                    </button>
                  </div>

                  {expandedReport === u.id && (
                    <div className="space-y-3 border-t border-border pt-3">
                      <div className="space-y-2">
                        {u.reports.map(r => (
                          <div key={r.id} className="p-2.5 rounded-lg bg-surfaceHover text-xs space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-orange-400 font-medium capitalize">{r.reason}</span>
                              <span className="text-textSecondary">· @{r.profiles?.username} · {formatDate(r.created_at)}</span>
                            </div>
                            {r.notes && <p className="text-textSecondary italic">"{r.notes}"</p>}
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleClearUserFlag(u.id)} className="text-xs px-3 py-1.5 rounded-lg border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-colors">
                          ✓ Clear Flag
                        </button>
                        <button onClick={() => handleBanFromQueue(u.id, null)} className="text-xs px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors">
                          🚫 Ban User
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
