import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { getAuthUser } from '@/lib/api-helpers';

const VALID_STYLES = new Set([
  'adventurer', 'bottts', 'fun-emoji', 'lorelei', 'pixel-art', 'open-peeps',
]);

export async function POST(request) {
  const auth = await getAuthUser(request);
  if (auth.error) return auth.error;
  const { user } = auth;

  try {
    const { style, seed } = await request.json();

    if (!VALID_STYLES.has(style)) {
      return NextResponse.json({ error: 'Invalid avatar style' }, { status: 400 });
    }
    if (!seed || typeof seed !== 'string' || seed.length > 100) {
      return NextResponse.json({ error: 'Invalid seed' }, { status: 400 });
    }

    const { error } = await supabaseServer
      .from('profiles')
      .update({ avatar_config: { style, seed } })
      .eq('id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true, avatar_config: { style, seed } });
  } catch (err) {
    console.error('POST /api/profile/avatar:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
