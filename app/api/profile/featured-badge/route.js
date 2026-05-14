import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { getAuthUser } from '@/lib/api-helpers';

export async function POST(request) {
  const auth = await getAuthUser(request);
  if (auth.error) return auth.error;
  const { user } = auth;

  try {
    const { achievement_id } = await request.json();

    if (achievement_id === null) {
      // Clear featured badge
      await supabaseServer
        .from('profiles')
        .update({ featured_badge_id: null, featured_badge_icon: null })
        .eq('id', user.id);
      return NextResponse.json({ success: true });
    }

    // Verify user actually owns this achievement
    const { data: owned, error: ownErr } = await supabaseServer
      .from('user_achievements')
      .select('achievement_id, achievements(icon)')
      .eq('user_id', user.id)
      .eq('achievement_id', achievement_id)
      .maybeSingle();

    if (ownErr) throw ownErr;
    if (!owned) {
      return NextResponse.json({ error: 'You have not unlocked this achievement' }, { status: 403 });
    }

    const icon = owned.achievements?.icon || null;

    await supabaseServer
      .from('profiles')
      .update({ featured_badge_id: achievement_id, featured_badge_icon: icon })
      .eq('id', user.id);

    return NextResponse.json({ success: true, featured_badge_icon: icon });
  } catch (err) {
    console.error('POST /api/profile/featured-badge:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
