import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { checkAdmin } from '@/lib/api-helpers';

export async function GET(request) {
  const adminError = checkAdmin(request);
  if (adminError) return adminError;

  try {
    const { data, error } = await supabaseServer
      .from('profiles')
      .select('id, username, email, is_premium, is_banned, confession_points, detection_points, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return NextResponse.json({ users: data });
  } catch (err) {
    console.error('GET /api/admin/users:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
