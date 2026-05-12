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

  const { data: profile } = await supabaseServer
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

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
