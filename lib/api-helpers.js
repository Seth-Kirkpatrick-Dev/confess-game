import { NextResponse } from 'next/server';
import { supabaseServer } from './supabase-server';

export async function getAuthUser(request) {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  }
  const token = header.slice(7);
  const { data: { user }, error } = await supabaseServer.auth.getUser(token);
  if (error || !user) {
    return { error: NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 }) };
  }

  let { data: profile } = await supabaseServer
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) {
    const username = user.email.split('@')[0];
    const { error: upsertErr } = await supabaseServer
      .from('profiles')
      .upsert({ id: user.id, email: user.email, username }, { onConflict: 'id' });
    if (upsertErr) {
      console.error('Profile upsert failed:', upsertErr.message);
    }
    const { data: created } = await supabaseServer
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    profile = created;
  }

  if (profile?.is_banned) {
    return { error: NextResponse.json({ error: 'Account is banned' }, { status: 403 }) };
  }

  return { user, profile };
}

export function checkAdmin(request) {
  const pw = request.headers.get('x-admin-password');
  if (!pw || pw !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  }
  return null;
}
