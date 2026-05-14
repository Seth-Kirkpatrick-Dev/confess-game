import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(request, { params }) {
  try {
    const { username } = params;

    const { data: profile, error } = await supabaseServer
      .from('profiles')
      .select('id, username, confession_points, detection_points, tier, current_streak, longest_streak, correct_votes, total_resolved_votes, created_at, avatar_config, featured_badge_id, featured_badge_icon, total_fooled_voters, consecutive_correct_votes')
      .eq('username', username)
      .eq('is_banned', false)
      .maybeSingle();

    if (error) throw error;
    if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Aggregate stats — count directly from tables
    const [
      { count: totalConfessions },
      { count: totalVotesCast },
      { data: recentActivity },
      { data: allAchievements },
      { data: userAchievements },
    ] = await Promise.all([
      supabaseServer
        .from('confessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('is_deleted', false),

      supabaseServer
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id),

      // Last 10 resolved confessions they posted or voted on
      supabaseServer
        .from('votes')
        .select('vote_type, is_correct, points_awarded, created_at, confessions(id, content, is_true, is_resolved, resolved_at, prompt_category)')
        .eq('user_id', profile.id)
        .not('is_correct', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10),

      // Full achievement catalog
      supabaseServer
        .from('achievements')
        .select('id, name, description, icon, category, hint_text_when_locked, reward_points')
        .order('category')
        .order('name'),

      // User's earned achievements
      supabaseServer
        .from('user_achievements')
        .select('achievement_id, unlocked_at')
        .eq('user_id', profile.id),
    ]);

    const accuracy = profile.total_resolved_votes > 0
      ? Math.round((profile.correct_votes / profile.total_resolved_votes) * 100)
      : null;

    // Merge catalog with earned status
    const earnedMap = new Map((userAchievements || []).map(ua => [ua.achievement_id, ua.unlocked_at]));
    const achievements = (allAchievements || []).map(a => ({
      ...a,
      unlocked: earnedMap.has(a.id),
      unlocked_at: earnedMap.get(a.id) || null,
    }));

    return NextResponse.json({
      profile: {
        ...profile,
        total_confessions: totalConfessions || 0,
        total_votes_cast: totalVotesCast || 0,
        accuracy_pct: accuracy,
        recent_votes: recentActivity || [],
        achievements,
      },
    });
  } catch (err) {
    console.error('GET /api/profile/[username]:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
