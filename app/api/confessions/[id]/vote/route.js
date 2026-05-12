import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { getAuthUser } from '@/lib/api-helpers';

export async function POST(request, { params }) {
  const auth = await getAuthUser(request);
  if (auth.error) return auth.error;
  const { user } = auth;

  try {
    const { id } = params;
    const { vote } = await request.json();

    if (!['real', 'fake'].includes(vote)) {
      return NextResponse.json({ error: 'Vote must be "real" or "fake"' }, { status: 400 });
    }

    const { data: confession, error: confErr } = await supabaseServer
      .from('confessions')
      .select('*')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (confErr || !confession) return NextResponse.json({ error: 'Confession not found' }, { status: 404 });
    if (confession.user_id === user.id) {
      return NextResponse.json({ error: 'You cannot vote on your own confession' }, { status: 400 });
    }

    const { data: existing } = await supabaseServer
      .from('votes')
      .select('id')
      .eq('user_id', user.id)
      .eq('confession_id', id)
      .single();

    if (existing) return NextResponse.json({ error: 'You already voted on this confession' }, { status: 400 });

    const { error: voteErr } = await supabaseServer
      .from('votes')
      .insert({ user_id: user.id, confession_id: id, vote_type: vote });
    if (voteErr) throw voteErr;

    const newReal = vote === 'real' ? confession.real_votes + 1 : confession.real_votes;
    const newFake = vote === 'fake' ? confession.fake_votes + 1 : confession.fake_votes;
    const total = newReal + newFake;

    await supabaseServer
      .from('confessions')
      .update({ real_votes: newReal, fake_votes: newFake })
      .eq('id', id);

    const majority = newReal >= newFake ? 'real' : 'fake';
    let pointsEarned = 0;

    if (vote === majority) {
      pointsEarned = 5;
      await supabaseServer.rpc('add_detection_points', {
        user_id_param: user.id,
        points_param: 5,
      });
    }

    const RESOLVE_THRESHOLD = 10;
    if (total >= RESOLVE_THRESHOLD && !confession.is_resolved) {
      await supabaseServer
        .from('confessions')
        .update({ is_resolved: true })
        .eq('id', id);

      if (confession.user_id) {
        const posterPts = majority === 'real' ? 10 : -2;
        await supabaseServer.rpc('add_confession_points', {
          user_id_param: confession.user_id,
          points_param: posterPts,
        });
      }
    }

    return NextResponse.json({
      success: true,
      real_votes: newReal,
      fake_votes: newFake,
      total_votes: total,
      pointsEarned,
      userVote: vote,
    });
  } catch (err) {
    console.error('POST /api/confessions/:id/vote:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
