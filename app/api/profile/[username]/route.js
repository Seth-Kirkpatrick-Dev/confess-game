import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(request, { params }) {
  try {
    const { username } = params;

    const { data: profile, error } = await supabaseServer
      .from('profiles')
      .select('id, username, confession_points, detection_points, tier, current_streak, longest_streak, correct_votes, total_resolved_votes, created_at')
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
    ]);

    const accuracy = profile.total_resolved_votes > 0
      ? Math.round((profile.correct_votes / profile.total_resolved_votes) * 100)
      : null;

    return NextResponse.json({
      profile: {
        ...profile,
        total_confessions: totalConfessions || 0,
        total_votes_cast: totalVotesCast || 0,
        accuracy_pct: accuracy,
        recent_votes: recentActivity || [],
      },
    });
  } catch (err) {
    console.error('GET /api/profile/[username]:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
