'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { createCheckoutSession } from '@/lib/api';

const PERKS = [
  { icon: '∞', title: 'Unlimited confessions', desc: 'Post as many as you want, no daily cap' },
  { icon: '⭐', title: 'Premium badge', desc: 'Stand out with a premium label on your profile' },
  { icon: '🚀', title: 'Early access', desc: 'First to get new features as we ship them' },
  { icon: '❤️', title: 'Support the game', desc: 'Keep Confess free and ad-supported for others' },
];

function PremiumContent() {
  const { user, profile, refreshProfile } = useAuth();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const success = searchParams.get('success') === 'true';
  const cancelled = searchParams.get('cancelled') === 'true';

  useEffect(() => {
    if (success) refreshProfile();
  }, [success]);

  const handleUpgrade = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const { url } = await createCheckoutSession();
      window.location.href = url;
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to start checkout. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {success && (
        <div className="card border-green-500/30 bg-green-500/10 text-center">
          <div className="text-3xl mb-2">🎉</div>
          <h2 className="text-green-400 font-bold text-lg">Welcome to Premium!</h2>
          <p className="text-textSecondary text-sm mt-1">Unlimited confessions unlocked. Go wild. 🤫</p>
        </div>
      )}

      {cancelled && (
        <div className="card border-orange-500/30 bg-orange-500/10 text-center">
          <p className="text-orange-400 text-sm">Checkout cancelled — no charge was made.</p>
        </div>
      )}

      <div className="text-center">
        <div className="text-5xl mb-4">⭐</div>
        <h1 className="text-3xl font-bold text-textPrimary">Go Premium</h1>
        <p className="text-textSecondary mt-2">Unlock unlimited confessions for just</p>
        <p className="text-4xl font-bold text-violet-400 mt-2">
          $2.99<span className="text-lg text-textSecondary font-normal">/month</span>
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {PERKS.map(p => (
          <div key={p.title} className="card flex gap-3">
            <span className="text-2xl flex-shrink-0">{p.icon}</span>
            <div>
              <h3 className="text-textPrimary text-sm font-semibold">{p.title}</h3>
              <p className="text-textSecondary text-xs mt-0.5">{p.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">
          {error}
        </div>
      )}

      {profile?.is_premium ? (
        <div className="card border-yellow-500/30 bg-yellow-500/10 text-center">
          <p className="text-yellow-400 font-semibold">⭐ You're already Premium!</p>
          <p className="text-textSecondary text-sm mt-1">Enjoy your unlimited confessions.</p>
        </div>
      ) : user ? (
        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="btn-primary w-full text-base py-3"
        >
          {loading ? 'Redirecting to checkout...' : '⭐ Upgrade to Premium — $2.99/mo'}
        </button>
      ) : (
        <div className="text-center">
          <p className="text-textSecondary text-sm mb-3">Create an account to upgrade</p>
          <Link href="/signup" className="btn-primary inline-flex">
            Sign up free
          </Link>
        </div>
      )}

      <p className="text-center text-textSecondary text-xs">
        Secure payment via Stripe · Cancel anytime from your Stripe customer portal
      </p>
    </div>
  );
}

export default function PremiumPage() {
  return (
    <Suspense>
      <PremiumContent />
    </Suspense>
  );
}
