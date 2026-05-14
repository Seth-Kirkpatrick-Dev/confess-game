import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(request, { params }) {
  try {
    const { id } = params;

    // Try to get the requesting user's vote (optional — no auth required to view)
    let userId = null;
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const { data: { user } } = await supabaseServer.auth.getUser(authHeader.slice(7));
      if (user) userId = user.id;
    }

    const { data: confession, error } = await supabaseServer
      .from('confessions')
      .select('*, profiles(username, tier)')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (error || !confession) {
      return NextResponse.json({ error: 'Confession not found' }, { status: 404 });
    }

    let userVote = null;
    if (userId) {
      const { data: vote } = await supabaseServer
        .from('votes')
        .select('vote_type')
        .eq('user_id', userId)
        .eq('confession_id', id)
        .maybeSingle();
      if (vote) userVote = vote.vote_type;
    }

    const canSeeVotes = confession.is_resolved || userVote !== null;

    return NextResponse.json({
      confession: {
        ...confession,
        userVote,
        real_votes: canSeeVotes ? confession.real_votes : null,
        fake_votes: canSeeVotes ? confession.fake_votes : null,
        is_true: confession.is_resolved ? confession.is_true : undefined,
      },
    });
  } catch (err) {
    console.error('GET /api/confessions/[id]:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
