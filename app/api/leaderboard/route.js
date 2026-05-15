import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

const PROFILE_FIELDS = 'id, username, tier, avatar_config, featured_badge_icon, equipped_name_color_class, equipped_border_class, equipped_avatar_emoji, equipped_badge_frame_class, equipped_accent_color';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period'); // 'weekly' | 'monthly' | null (all-time)

    if (period === 'history') {
      // Last completed weekly and monthly periods
      const [{ data: weeklyHistory }, { data: monthlyHistory }] = await Promise.all([
        supabaseServer
          .from('leaderboard_history')
          .select(`rank, points, period_start, period_end, profiles(${PROFILE_FIELDS})`)
          .eq('period_type', 'weekly')
          .order('period_start', { ascending: false })
          .order('rank', { ascending: true })
          .limit(10),
        supabaseServer
          .from('leaderboard_history')
          .select(`rank, points, period_start, period_end, profiles(${PROFILE_FIELDS})`)
          .eq('period_type', 'monthly')
          .order('period_start', { ascending: false })
          .order('rank', { ascending: true })
          .limit(10),
      ]);
      return NextResponse.json({ weekly: weeklyHistory || [], monthly: monthlyHistory || [] });
    }

    if (period === 'weekly' || period === 'monthly') {
      const pointsCol = period === 'weekly' ? 'weekly_points' : 'monthly_points';
      const { data, error } = await supabaseServer
        .from('profiles')
        .select(`${PROFILE_FIELDS}, ${pointsCol}`)
        .eq('is_banned', false)
        .gt(pointsCol, 0)
        .order(pointsCol, { ascending: false })
        .limit(10);

      if (error) throw error;
      return NextResponse.json({ leaders: (data || []).map(r => ({ ...r, points: r[pointsCol] })) });
    }

    // All-time default
    const [{ data: confessors, error: e1 }, { data: detectors, error: e2 }] = await Promise.all([
      supabaseServer
        .from('profiles')
        .select(`${PROFILE_FIELDS}, confession_points, detection_points`)
        .eq('is_banned', false)
        .order('confession_points', { ascending: false })
        .limit(10),
      supabaseServer
        .from('profiles')
        .select(`${PROFILE_FIELDS}, confession_points, detection_points`)
        .eq('is_banned', false)
        .order('detection_points', { ascending: false })
        .limit(10),
    ]);

    if (e1 || e2) throw e1 || e2;
    return NextResponse.json({ confessors, detectors });
  } catch (err) {
    console.error('GET /api/leaderboard:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
