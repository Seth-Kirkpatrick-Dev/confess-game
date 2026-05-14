import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { getAuthUser } from '@/lib/api-helpers';
import { updateStreak } from '@/lib/streak';
import { checkAchievements } from '@/lib/achievements';

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
      .select('id, user_id, real_votes, fake_votes, is_resolved, is_deleted')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (confErr || !confession) {
      return NextResponse.json({ error: 'Confession not found' }, { status: 404 });
    }
    if (confession.is_resolved) {
      return NextResponse.json({ error: 'This confession has already resolved' }, { status: 400 });
    }
    if (confession.user_id === user.id) {
      return NextResponse.json({ error: 'You cannot vote on your own confession' }, { status: 400 });
    }

    const { data: existing } = await supabaseServer
      .from('votes')
      .select('id')
      .eq('user_id', user.id)
      .eq('confession_id', id)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'You already voted on this confession' }, { status: 400 });
    }

    const { error: voteErr } = await supabaseServer
      .from('votes')
      .insert({ user_id: user.id, confession_id: id, vote_type: vote });
    if (voteErr) throw voteErr;

    const newReal = vote === 'real' ? confession.real_votes + 1 : confession.real_votes;
    const newFake = vote === 'fake' ? confession.fake_votes + 1 : confession.fake_votes;

    await supabaseServer
      .from('confessions')
      .update({ real_votes: newReal, fake_votes: newFake })
      .eq('id', id);

    // Non-blocking: streak + achievement check
    Promise.all([
      updateStreak(user.id),
      checkAchievements(user.id, { totalVotes: null }), // totalVotes fetched inside checker
    ]).catch(err => console.error('Post-vote side effects failed:', err.message));

    return NextResponse.json({
      success: true,
      real_votes: newReal,
      fake_votes: newFake,
      total_votes: newReal + newFake,
      userVote: vote,
    });
  } catch (err) {
    console.error('POST /api/confessions/:id/vote:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
