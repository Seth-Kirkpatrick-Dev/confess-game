import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { getAuthUser } from '@/lib/api-helpers';

export async function POST(request) {
  const auth = await getAuthUser(request);
  if (auth.error) return auth.error;
  const { user } = auth;

  try {
    const { cosmetic_id } = await request.json();
    if (!cosmetic_id) return NextResponse.json({ error: 'cosmetic_id required' }, { status: 400 });

    // Fetch cosmetic to check tier
    const { data: cosmetic, error: cosErr } = await supabaseServer
      .from('cosmetics')
      .select('id, economy_tier, points_cost, unlock_achievement_id, is_active')
      .eq('id', cosmetic_id)
      .single();

    if (cosErr || !cosmetic || !cosmetic.is_active) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Check already owned
    const { count: owned } = await supabaseServer
      .from('user_cosmetics')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('cosmetic_id', cosmetic_id);

    if ((owned || 0) > 0) {
      return NextResponse.json({ error: 'You already own this item' }, { status: 409 });
    }

    // --- Free tier: must have the required achievement ---
    if (cosmetic.economy_tier === 'free') {
      if (cosmetic.unlock_achievement_id) {
        const { count: hasAchievement } = await supabaseServer
          .from('user_achievements')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('achievement_id', cosmetic.unlock_achievement_id);

        if ((hasAchievement || 0) === 0) {
          return NextResponse.json({ error: 'You have not unlocked the required achievement' }, { status: 403 });
        }
      }

      await supabaseServer
        .from('user_cosmetics')
        .insert({ user_id: user.id, cosmetic_id, acquired_via: 'achievement' })
        .throwOnError();

      return NextResponse.json({ success: true });
    }

    // --- Premium tier: must be premium subscriber ---
    if (cosmetic.economy_tier === 'premium') {
      const { data: profile } = await supabaseServer
        .from('profiles')
        .select('is_premium, spendable_points')
        .eq('id', user.id)
        .single();

      if (!profile?.is_premium) {
        return NextResponse.json({ error: 'Premium subscription required' }, { status: 403 });
      }

      await supabaseServer
        .from('user_cosmetics')
        .insert({ user_id: user.id, cosmetic_id, acquired_via: 'premium' })
        .throwOnError();

      return NextResponse.json({ success: true, spendable_points: profile.spendable_points });
    }

    // --- Points tier: use the atomic RPC ---
    const { data: result, error } = await supabaseServer.rpc('purchase_cosmetic', {
      user_id_param: user.id,
      cosmetic_id_param: cosmetic_id,
    });

    if (error) throw error;

    if (result === 'ok') {
      const { data: profile } = await supabaseServer
        .from('profiles')
        .select('spendable_points')
        .eq('id', user.id)
        .single();
      return NextResponse.json({ success: true, spendable_points: profile?.spendable_points });
    }

    const messages = {
      already_owned:       'You already own this item',
      insufficient_points: 'Not enough points',
      not_purchasable:     'This item cannot be purchased with points',
      not_found:           'Item not found',
    };

    return NextResponse.json(
      { error: messages[result] || 'Purchase failed' },
      { status: result === 'already_owned' ? 409 : result === 'insufficient_points' ? 402 : 400 }
    );
  } catch (err) {
    console.error('POST /api/shop/purchase:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
