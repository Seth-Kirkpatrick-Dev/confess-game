'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function SignupPage() {
  const { signup } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const { user } = await signup(email, password);
      if (user?.identities?.length === 0) {
        setError('An account with this email already exists');
        return;
      }
      setDone(true);
    } catch (err) {
      console.error('[Signup] Full error:', err);
      setError(err.message || String(err) || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="text-4xl mb-4">📬</div>
          <h1 className="text-2xl font-bold text-textPrimary mb-2">Check your email</h1>
          <p className="text-textSecondary text-sm mb-6">
            We sent a confirmation link to <strong className="text-textPrimary">{email}</strong>.
            Click it to activate your account, then sign in.
          </p>
          <Link href="/login" className="btn-primary inline-flex">
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🤫</div>
          <h1 className="text-2xl font-bold text-textPrimary">Join Confess</h1>
          <p className="text-textSecondary text-sm mt-1">Post confessions. Fool others. Earn points.</p>
        </div>

        <div className="card">
          {error && (
            <div className="mb-4 p-3 bg-red-500/15 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-textSecondary text-xs mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input"
                placeholder="you@example.com"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-textSecondary text-xs mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input"
                placeholder="6+ characters"
                required
                minLength={6}
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <div className="mt-4 p-3 bg-violet-500/10 border border-violet-500/20 rounded-lg">
            <p className="text-violet-300 text-xs text-center">
              🎮 Free: 3 confessions/day · Unlimited with Premium ($2.99/mo)
            </p>
          </div>

          <p className="text-center text-textSecondary text-sm mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-violet-400 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
