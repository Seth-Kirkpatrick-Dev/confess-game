import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { getAuthUser } from '@/lib/api-helpers';

export async function GET(request) {
  // Auth is optional — unauthenticated users see catalog but no ownership status
  let userId = null;
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const { data: { user } } = await supabaseServer.auth.getUser(authHeader.slice(7));
    if (user) userId = user.id;
  }

  try {
    const [catalogResult, ownedResult, equippedResult, profileResult, userAchievementsResult] = await Promise.all([
      supabaseServer
        .from('cosmetics')
        .select('id, name, description, category, economy_tier, points_cost, unlock_achievement_id, preview_class, config_json, achievements(name)')
        .eq('is_active', true)
        .order('economy_tier')
        .order('points_cost', { ascending: true, nullsFirst: true })
        .order('name'),

      userId
        ? supabaseServer.from('user_cosmetics').select('cosmetic_id, acquired_via').eq('user_id', userId)
        : Promise.resolve({ data: [] }),

      userId
        ? supabaseServer.from('user_equipped').select('slot, cosmetic_id').eq('user_id', userId)
        : Promise.resolve({ data: [] }),

      userId
        ? supabaseServer.from('profiles').select('spendable_points, is_premium').eq('id', userId).single()
        : Promise.resolve({ data: null }),

      userId
        ? supabaseServer.from('user_achievements').select('achievement_id').eq('user_id', userId)
        : Promise.resolve({ data: [] }),
    ]);

    const ownedSet = new Set((ownedResult.data || []).map(r => r.cosmetic_id));
    const equippedMap = Object.fromEntries((equippedResult.data || []).map(r => [r.slot, r.cosmetic_id]));
    const earnedAchievementIds = new Set((userAchievementsResult.data || []).map(r => r.achievement_id));

    const catalog = (catalogResult.data || []).map(c => ({
      ...c,
      unlock_achievement_name: c.achievements?.name || null,
      achievements: undefined,
      owned: ownedSet.has(c.id),
      equipped: Object.values(equippedMap).includes(c.id),
      achievement_earned: c.unlock_achievement_id ? earnedAchievementIds.has(c.unlock_achievement_id) : false,
    }));

    return NextResponse.json({
      catalog,
      equipped: equippedMap,
      spendable_points: profileResult.data?.spendable_points ?? null,
      is_premium: profileResult.data?.is_premium ?? false,
    });
  } catch (err) {
    console.error('GET /api/shop:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
