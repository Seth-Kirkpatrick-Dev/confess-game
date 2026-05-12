import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { checkAdmin } from '@/lib/api-helpers';

export async function POST(request, { params }) {
  const adminError = checkAdmin(request);
  if (adminError) return adminError;

  try {
    const { error } = await supabaseServer
      .from('profiles')
      .update({ is_banned: true })
      .eq('id', params.id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
