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

    // Return limited payload for confessions under review
    if (confession.is_hidden_pending_review) {
      return NextResponse.json({
        confession: { id: confession.id, is_hidden_pending_review: true },
      });
    }

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
