import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { checkAdmin } from '@/lib/api-helpers';

// GET /api/admin/reports?type=confessions|users
export async function GET(request) {
  const adminError = checkAdmin(request);
  if (adminError) return adminError;

  try {
    const { searchParams } = request.nextUrl;
    const type = searchParams.get('type') || 'confessions';

    if (type === 'confessions') {
      // Flagged confessions with report details
      const { data: confessions, error: cErr } = await supabaseServer
        .from('confessions')
        .select('id, content, is_true, is_resolved, created_at, user_id, profiles(username, email)')
        .eq('is_hidden_pending_review', true)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (cErr) throw cErr;

      // For each confession, fetch its pending reports
      const withReports = await Promise.all(
        (confessions || []).map(async (c) => {
          const { data: reports } = await supabaseServer
            .from('reports')
            .select('id, reason, notes, created_at, reporter_id, profiles(username)')
            .eq('confession_id', c.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });
          return { ...c, reports: reports || [] };
        })
      );

      return NextResponse.json({ confessions: withReports });
    }

    if (type === 'users') {
      const { data: users, error: uErr } = await supabaseServer
        .from('profiles')
        .select('id, username, email, is_banned, created_at, confession_points, detection_points')
        .eq('is_flagged_pending_review', true)
        .eq('is_banned', false)
        .order('created_at', { ascending: false });

      if (uErr) throw uErr;

      const withReports = await Promise.all(
        (users || []).map(async (u) => {
          const { data: reports } = await supabaseServer
            .from('reports')
            .select('id, reason, notes, created_at, reporter_id, profiles(username)')
            .eq('reported_user_id', u.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });
          return { ...u, reports: reports || [] };
        })
      );

      return NextResponse.json({ users: withReports });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (err) {
    console.error('GET /api/admin/reports:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
