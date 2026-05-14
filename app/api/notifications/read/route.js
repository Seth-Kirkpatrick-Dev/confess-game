import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { getAuthUser } from '@/lib/api-helpers';

export async function POST(request) {
  const auth = await getAuthUser(request);
  if (auth.error) return auth.error;
  const { user } = auth;

  try {
    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      // Mark all as read
      await supabaseServer
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
    } else {
      await supabaseServer
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .in('id', ids);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('POST /api/notifications/read:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
