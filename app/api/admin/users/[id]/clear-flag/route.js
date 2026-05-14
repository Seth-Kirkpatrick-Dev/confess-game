import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { checkAdmin } from '@/lib/api-helpers';

export async function POST(request, { params }) {
  const adminError = checkAdmin(request);
  if (adminError) return adminError;

  try {
    const { id } = params;

    await supabaseServer
      .from('profiles')
      .update({ is_flagged_pending_review: false })
      .eq('id', id);

    await supabaseServer
      .from('reports')
      .update({ status: 'dismissed' })
      .eq('reported_user_id', id)
      .eq('status', 'pending');

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('POST /api/admin/users/[id]/clear-flag:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
