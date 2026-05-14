import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { getAuthUser } from '@/lib/api-helpers';

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
      .select('*, profiles(username, tier, avatar_config, featured_badge_icon, equipped_name_color_class, equipped_border_class)')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (error || !confession) {
      return NextResponse.json({ error: 'Confession not found' }, { status: 404 });
    }

    if (confession.is_hidden_pending_review) {
      return NextResponse.json({
        confession: { id: confession.id, is_hidden_pending_review: true },
      });
    }

    // Parallel: user's vote + all reactions for this confession
    const [voteResult, reactionsResult] = await Promise.all([
      userId
        ? supabaseServer
            .from('votes')
            .select('vote_type')
            .eq('user_id', userId)
            .eq('confession_id', id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabaseServer
        .from('reactions')
        .select('emoji, user_id')
        .eq('confession_id', id),
    ]);

    const userVote = voteResult.data?.vote_type || null;
    const canSeeVotes = confession.is_resolved || userVote !== null;

    const reactionCounts = {};
    const userReactions = [];
    for (const r of (reactionsResult.data || [])) {
      reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
      if (userId && r.user_id === userId) userReactions.push(r.emoji);
    }

    return NextResponse.json({
      confession: {
        ...confession,
        userVote,
        real_votes: canSeeVotes ? confession.real_votes : null,
        fake_votes: canSeeVotes ? confession.fake_votes : null,
        is_true: confession.is_resolved ? confession.is_true : undefined,
        reactions: reactionCounts,
        userReactions,
      },
    });
  } catch (err) {
    console.error('GET /api/confessions/[id]:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const auth = await getAuthUser(request);
  if (auth.error) return auth.error;
  const { user } = auth;

  try {
    const { id } = params;

    const { data: confession, error: fetchErr } = await supabaseServer
      .from('confessions')
      .select('id, user_id, is_resolved, is_deleted')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !confession) {
      return NextResponse.json({ error: 'Confession not found' }, { status: 404 });
    }
    if (confession.user_id !== user.id) {
      return NextResponse.json({ error: 'Not your confession' }, { status: 403 });
    }
    if (confession.is_deleted) {
      return NextResponse.json({ error: 'Already deleted' }, { status: 409 });
    }
    if (confession.is_resolved) {
      return NextResponse.json(
        { error: 'Cannot delete after resolution. Use the report system if this needs admin review.' },
        { status: 403 }
      );
    }

    const { error: updateErr } = await supabaseServer
      .from('confessions')
      .update({ is_deleted: true })
      .eq('id', id);

    if (updateErr) throw updateErr;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/confessions/[id]:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
