import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { checkAdmin } from '@/lib/api-helpers';

export async function DELETE(request, { params }) {
  const adminError = checkAdmin(request);
  if (adminError) return adminError;

  try {
    const { error } = await supabaseServer
      .from('confessions')
      .update({ is_deleted: true })
      .eq('id', params.id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/admin/confessions/:id:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
