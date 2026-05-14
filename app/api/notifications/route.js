import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { getAuthUser } from '@/lib/api-helpers';

export async function GET(request) {
  const auth = await getAuthUser(request);
  if (auth.error) return auth.error;
  const { user } = auth;

  try {
    const { data, error } = await supabaseServer
      .from('notifications')
      .select('*, confessions(content, is_true, prompt_category)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    const unreadCount = (data || []).filter(n => !n.is_read).length;

    return NextResponse.json({ notifications: data || [], unreadCount });
  } catch (err) {
    console.error('GET /api/notifications:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
