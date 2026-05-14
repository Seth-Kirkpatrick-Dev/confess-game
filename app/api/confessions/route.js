import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { getAuthUser } from '@/lib/api-helpers';
import { updateStreak } from '@/lib/streak';

export async function GET(request) {
  try {
    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const userId = searchParams.get('userId');
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabaseServer
      .from('confessions')
      .select('*, profiles(username, tier)', { count: 'exact' })
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    let userVotes = {};
    if (userId && data.length) {
      const { data: votes } = await supabaseServer
        .from('votes')
        .select('confession_id, vote_type')
        .eq('user_id', userId)
        .in('confession_id', data.map(c => c.id));
      if (votes) {
        userVotes = votes.reduce((acc, v) => ({ ...acc, [v.confession_id]: v.vote_type }), {});
      }
    }

    return NextResponse.json({
      confessions: data.map(c => {
        const userVote = userVotes[c.id] || null;
        const canSeeVotes = c.is_resolved || userVote !== null;
        return {
          ...c,
          userVote,
          // Hide split until user votes or confession resolves (anti-cheat)
          real_votes: canSeeVotes ? c.real_votes : null,
          fake_votes: canSeeVotes ? c.fake_votes : null,
          // Never expose poster's truth until resolved
          is_true: c.is_resolved ? c.is_true : undefined,
        };
      }),
      total: count,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (err) {
    console.error('GET /api/confessions:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  const auth = await getAuthUser(request);
  if (auth.error) return auth.error;
  const { user, profile } = auth;

  try {
    const { content, is_true, prompt_category } = await request.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Confession cannot be empty' }, { status: 400 });
    }
    if (content.length > 300) {
      return NextResponse.json({ error: 'Max 300 characters' }, { status: 400 });
    }
    if (typeof is_true !== 'boolean') {
      return NextResponse.json({ error: 'You must declare your confession True or False' }, { status: 400 });
    }

    if (!profile?.is_premium) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count } = await supabaseServer
        .from('confessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString());
      if ((count || 0) >= 3) {
        return NextResponse.json({
          error: 'Daily limit reached (3/day). Upgrade to Premium for unlimited confessions.',
          limitReached: true,
        }, { status: 429 });
      }
    }

    const { data, error } = await supabaseServer
      .from('confessions')
      .insert({ user_id: user.id, content: content.trim(), is_true, prompt_category: prompt_category || null })
      .select()
      .single();

    if (error) throw error;

    // Streak update — non-blocking
    updateStreak(user.id).catch(err => console.error('Streak update failed:', err.message));

    return NextResponse.json({ confession: data }, { status: 201 });
  } catch (err) {
    console.error('POST /api/confessions:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
