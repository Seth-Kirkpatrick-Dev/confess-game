'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getShop, purchaseCosmetic } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { ConfirmModal } from '@/components/ConfirmModal';
import { SkeletonBlock, SkeletonLine } from '@/components/Skeletons';

const CATEGORIES = [
  { id: 'all',             label: 'All' },
  { id: 'name_color',      label: 'Name Colors' },
  { id: 'border',          label: 'Borders' },
  { id: 'theme',           label: 'Themes' },
  { id: 'avatar_accessory',label: 'Avatar' },
  { id: 'badge_frame',     label: 'Badge Frames' },
];

const TIER_SORT = { free: 0, points: 1, premium: 2 };

function TierChip({ tier, pointsCost }) {
  if (tier === 'free')    return <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">Free</span>;
  if (tier === 'premium') return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/20">⭐ Premium</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/20">{pointsCost} pts</span>;
}

function CosmeticCard({ item, spendablePoints, isPremium, onBuy, equippedMap }) {
  const [buying, setBuying] = useState(false);
  const isEquipped = Object.values(equippedMap).includes(item.id);

  const handleBuy = async () => {
    setBuying(true);
    await onBuy(item);
    setBuying(false);
  };

  const actionButton = () => {
    if (item.owned && isEquipped) {
      return <span className="text-xs text-violet-400 font-medium">Equipped ✓</span>;
    }
    if (item.owned) {
      return <span className="text-xs text-green-400 font-medium">Owned</span>;
    }
    if (item.economy_tier === 'free') {
      return (
        <div className="text-xs text-textSecondary">
          Unlock: <span className="text-textPrimary">{item.unlock_achievement_name || 'achievement'}</span>
        </div>
      );
    }
    if (item.economy_tier === 'premium') {
      if (isPremium) {
        return (
          <button
            onClick={handleBuy}
            disabled={buying}
            className="text-xs px-3 py-1.5 rounded-lg bg-yellow-500/15 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/25 transition-colors disabled:opacity-50"
          >
            {buying ? '…' : 'Claim Free'}
          </button>
        );
      }
      return (
        <Link href="/premium" className="text-xs px-3 py-1.5 rounded-lg bg-yellow-500/10 text-yellow-500/70 border border-yellow-500/20 hover:bg-yellow-500/15 transition-colors">
          Premium required →
        </Link>
      );
    }
    // Points tier
    const canAfford = (spendablePoints ?? 0) >= (item.points_cost || 0);
    return (
      <button
        onClick={handleBuy}
        disabled={buying || !canAfford}
        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
          canAfford
            ? 'bg-violet-500/15 text-violet-400 border-violet-500/30 hover:bg-violet-500/25'
            : 'bg-surface text-textSecondary border-border cursor-not-allowed'
        }`}
        title={!canAfford ? `Need ${item.points_cost - (spendablePoints ?? 0)} more points` : ''}
      >
        {buying ? '…' : canAfford ? `Buy · ${item.points_cost} pts` : `Need ${item.points_cost} pts`}
      </button>
    );
  };

  return (
    <div className={`card flex flex-col gap-3 transition-colors ${item.owned ? 'border-border' : 'border-border/60 opacity-80'}`}>
      {/* Preview swatch */}
      <div className="h-10 rounded-lg bg-surfaceHover flex items-center justify-center overflow-hidden">
        {item.category === 'name_color' ? (
          <span className={`text-sm font-semibold ${item.preview_class}`}>@username</span>
        ) : item.category === 'border' ? (
          <div className={`w-8 h-8 rounded-full bg-surface ${item.preview_class}`} />
        ) : item.category === 'badge_frame' ? (
          <div className={`px-2 py-1 rounded-lg text-sm ${item.preview_class}`}>🏅</div>
        ) : item.category === 'avatar_accessory' ? (
          <span className="text-2xl">{item.preview_class}</span>
        ) : (
          <div className={`w-full h-full rounded-lg ${item.preview_class}`} />
        )}
      </div>

      <div className="flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-textPrimary leading-tight">{item.name}</p>
          <TierChip tier={item.economy_tier} pointsCost={item.points_cost} />
        </div>
        <p className="text-xs text-textSecondary mt-0.5 line-clamp-2">{item.description}</p>
      </div>

      <div className="flex items-center justify-between">
        {actionButton()}
      </div>
    </div>
  );
}

export default function ShopPage() {
  const { user, profile } = useAuth();
  const { showToast, ToastContainer } = useToast();
  const [catalog, setCatalog] = useState([]);
  const [equippedMap, setEquippedMap] = useState({});
  const [spendablePoints, setSpendablePoints] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [catTab, setCatTab] = useState('all');
  const [purchaseConfirm, setPurchaseConfirm] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getShop();
      setCatalog(data.catalog || []);
      setEquippedMap(data.equipped || {});
      setSpendablePoints(data.spendable_points);
      setIsPremium(data.is_premium || false);
    } catch {
      showToast('Failed to load shop', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleBuy = async (item) => {
    if (item.economy_tier === 'premium' && !isPremium) return;
    if (item.economy_tier === 'points') {
      // Show confirm modal for points purchase
      setPurchaseConfirm(item);
      return;
    }
    await doPurchase(item);
  };

  const doPurchase = async (item) => {
    try {
      const result = await purchaseCosmetic(item.id);
      setCatalog(prev => prev.map(c => c.id === item.id ? { ...c, owned: true } : c));
      if (result.spendable_points !== undefined) setSpendablePoints(result.spendable_points);
      showToast(`${item.name} unlocked!`, 'success');
    } catch (err) {
      showToast(err?.response?.data?.error || 'Purchase failed', 'error');
    }
  };

  const filtered = catalog
    .filter(c => catTab === 'all' || c.category === catTab)
    .sort((a, b) => TIER_SORT[a.economy_tier] - TIER_SORT[b.economy_tier] || (a.points_cost || 0) - (b.points_cost || 0));

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <ToastContainer />
      {purchaseConfirm && (
        <ConfirmModal
          title={`Buy "${purchaseConfirm.name}"?`}
          message={`This costs ${purchaseConfirm.points_cost} pts from your spendable balance (${spendablePoints ?? 0} pts available).`}
          confirmLabel={`Buy for ${purchaseConfirm.points_cost} pts`}
          onConfirm={() => { const item = purchaseConfirm; setPurchaseConfirm(null); doPurchase(item); }}
          onCancel={() => setPurchaseConfirm(null)}
        />
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-textPrimary">Shop</h1>
        <p className="text-textSecondary text-sm mt-1">
          {user ? (
            <>
              Spendable balance:{' '}
              <span className="text-violet-400 font-semibold">{spendablePoints ?? '—'} pts</span>
              {!isPremium && (
                <> · <Link href="/premium" className="text-yellow-400 hover:underline">⭐ Upgrade to Premium</Link></>
              )}
            </>
          ) : (
            <Link href="/login" className="text-violet-400 hover:underline">Log in to purchase items →</Link>
          )}
        </p>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 overflow-x-auto scrollbar-none">
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            onClick={() => setCatTab(c.id)}
            className={`text-xs px-3 py-1.5 rounded-lg whitespace-nowrap flex-shrink-0 transition-colors ${
              catTab === c.id
                ? 'bg-violet-600 text-white'
                : 'text-textSecondary hover:text-textPrimary hover:bg-white/5 border border-border'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Economy lane banners */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="card py-3 bg-green-500/5 border-green-500/20">
          <p className="font-semibold text-green-400">Free</p>
          <p className="text-textSecondary mt-0.5">Earn by unlocking achievements</p>
        </div>
        <div className="card py-3 bg-violet-500/5 border-violet-500/20">
          <p className="font-semibold text-violet-400">Points</p>
          <p className="text-textSecondary mt-0.5">Buy with earned points</p>
        </div>
        <div className="card py-3 bg-yellow-500/5 border-yellow-500/20">
          <p className="font-semibold text-yellow-400">Premium</p>
          <p className="text-textSecondary mt-0.5">Exclusive to subscribers</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="card space-y-3 animate-pulse">
              <SkeletonBlock className="h-10" />
              <SkeletonLine className="w-3/4" />
              <SkeletonLine className="w-1/2" />
              <SkeletonLine className="w-20" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12 space-y-2">
          <p className="text-3xl">🛍️</p>
          <p className="text-textPrimary font-medium">Nothing here yet</p>
          <p className="text-textSecondary text-sm">Check back as more cosmetics are added.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map(item => (
            <CosmeticCard
              key={item.id}
              item={item}
              spendablePoints={spendablePoints}
              isPremium={isPremium}
              equippedMap={equippedMap}
              onBuy={handleBuy}
            />
          ))}
        </div>
      )}
    </div>
  );
}
