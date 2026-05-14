import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { checkAdmin } from '@/lib/api-helpers';

export async function POST(request, { params }) {
  const adminError = checkAdmin(request);
  if (adminError) return adminError;

  try {
    const { id } = params;

    // Clear the hidden flag
    const { error: restoreErr } = await supabaseServer
      .from('confessions')
      .update({ is_hidden_pending_review: false })
      .eq('id', id);

    if (restoreErr) throw restoreErr;

    // Dismiss all pending reports for this confession
    await supabaseServer
      .from('reports')
      .update({ status: 'dismissed' })
      .eq('confession_id', id)
      .eq('status', 'pending');

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('POST /api/admin/confessions/[id]/restore:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
