import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { getAuthUser } from '@/lib/api-helpers';

const VALID_EMOJIS = new Set(['😂', '😱', '🤔', '💯', '🔥', '😬']);

export async function POST(request, { params }) {
  const auth = await getAuthUser(request);
  if (auth.error) return auth.error;
  const { user } = auth;

  try {
    const { emoji } = await request.json();
    const { id } = params;

    if (!VALID_EMOJIS.has(emoji)) {
      return NextResponse.json({ error: 'Invalid emoji' }, { status: 400 });
    }

    // Try to insert — if unique violation, the reaction already exists: toggle it off
    const { error: insertErr } = await supabaseServer
      .from('reactions')
      .insert({ user_id: user.id, confession_id: id, emoji });

    if (!insertErr) {
      return NextResponse.json({ added: true });
    }

    if (insertErr.code === '23505') {
      await supabaseServer
        .from('reactions')
        .delete()
        .eq('user_id', user.id)
        .eq('confession_id', id)
        .eq('emoji', emoji);
      return NextResponse.json({ added: false });
    }

    throw insertErr;
  } catch (err) {
    console.error('POST /api/confessions/[id]/react:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
