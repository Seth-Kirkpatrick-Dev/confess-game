import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { checkAdmin } from '@/lib/api-helpers';

export async function GET(request) {
  const adminError = checkAdmin(request);
  if (adminError) return adminError;

  try {
    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabaseServer
      .from('confessions')
      .select('*, profiles(username, email)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return NextResponse.json({ confessions: data, total: count });
  } catch (err) {
    console.error('GET /api/admin/confessions:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
