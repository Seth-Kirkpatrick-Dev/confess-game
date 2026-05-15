import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { getAuthUser } from '@/lib/api-helpers';
import { updateStreak } from '@/lib/streak';
import { checkAchievements } from '@/lib/achievements';

export async function GET(request) {
  try {
    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const userId = searchParams.get('userId');
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabaseServer
      .from('confessions')
      .select('*, profiles(username, tier, avatar_config, featured_badge_icon, equipped_name_color_class, equipped_border_class)', { count: 'exact' })
      .eq('is_deleted', false)
      .eq('is_hidden_pending_review', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const confessionIds = data.map(c => c.id);

    // Parallel: user votes + all reactions for this page (single batch each)
    const [votesResult, reactionsResult] = await Promise.all([
      userId && confessionIds.length
        ? supabaseServer
            .from('votes')
            .select('confession_id, vote_type')
            .eq('user_id', userId)
            .in('confession_id', confessionIds)
        : Promise.resolve({ data: [] }),
      confessionIds.length
        ? supabaseServer
            .from('reactions')
            .select('confession_id, emoji, user_id')
            .in('confession_id', confessionIds)
        : Promise.resolve({ data: [] }),
    ]);

    const userVotes = (votesResult.data || []).reduce(
      (acc, v) => ({ ...acc, [v.confession_id]: v.vote_type }),
      {}
    );

    // Group reactions: counts per confession+emoji, and current user's reactions
    const reactionCounts = {};
    const userReactionSet = {};
    for (const r of (reactionsResult.data || [])) {
      if (!reactionCounts[r.confession_id]) reactionCounts[r.confession_id] = {};
      reactionCounts[r.confession_id][r.emoji] = (reactionCounts[r.confession_id][r.emoji] || 0) + 1;
      if (userId && r.user_id === userId) {
        if (!userReactionSet[r.confession_id]) userReactionSet[r.confession_id] = [];
        userReactionSet[r.confession_id].push(r.emoji);
      }
    }

    return NextResponse.json({
      confessions: data.map(c => {
        const userVote = userVotes[c.id] || null;
        const canSeeVotes = c.is_resolved || userVote !== null;
        return {
          ...c,
          userVote,
          real_votes: canSeeVotes ? c.real_votes : null,
          fake_votes: canSeeVotes ? c.fake_votes : null,
          is_true: c.is_resolved ? c.is_true : undefined,
          reactions: reactionCounts[c.id] || {},
          userReactions: userReactionSet[c.id] || [],
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

    if (!content?.trim() || content.trim().length < 10) {
      return NextResponse.json({ error: 'Confession must be at least 10 characters' }, { status: 400 });
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

    // Streak is fire-and-forget; achievements are blocking so we can return them
    updateStreak(user.id).catch(err => console.error('updateStreak failed:', err.message));
    const newAchievements = await checkAchievements(user.id).catch(err => {
      console.error('checkAchievements failed:', err.message);
      return [];
    });

    return NextResponse.json({ confession: data, newAchievements }, { status: 201 });
  } catch (err) {
    console.error('POST /api/confessions:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
