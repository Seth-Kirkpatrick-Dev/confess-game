import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { getAuthUser } from '@/lib/api-helpers';
import { MIN_REPORTS_TO_HIDE, MIN_VOTES_TO_REPORT } from '@/lib/config';

const VALID_REASONS = ['spam', 'harassment', 'explicit', 'misinformation', 'other'];

export async function POST(request) {
  const auth = await getAuthUser(request);
  if (auth.error) return auth.error;
  const { user, profile } = auth;

  try {
    const { confession_id, reported_user_id, reason, notes } = await request.json();

    if (!confession_id && !reported_user_id) {
      return NextResponse.json({ error: 'Must report a confession or a user' }, { status: 400 });
    }
    if (!VALID_REASONS.includes(reason)) {
      return NextResponse.json({ error: 'Invalid reason' }, { status: 400 });
    }

    // Gate: reporter must have 10+ resolved votes
    if ((profile.total_resolved_votes || 0) < MIN_VOTES_TO_REPORT) {
      return NextResponse.json(
        { error: `You need ${MIN_VOTES_TO_REPORT} resolved votes to report content. Keep voting!` },
        { status: 403 }
      );
    }

    // Can't report yourself
    if (reported_user_id && reported_user_id === user.id) {
      return NextResponse.json({ error: 'Cannot report yourself' }, { status: 400 });
    }

    // Insert report (unique constraint on reporter_id + confession_id handles duplicates)
    const { error: insertErr } = await supabaseServer
      .from('reports')
      .insert({
        reporter_id: user.id,
        confession_id: confession_id || null,
        reported_user_id: reported_user_id || null,
        reason,
        notes: notes?.trim() || null,
      });

    if (insertErr) {
      if (insertErr.code === '23505') {
        return NextResponse.json({ error: 'You have already reported this confession' }, { status: 409 });
      }
      throw insertErr;
    }

    // Auto-hide confession if it hits the threshold
    if (confession_id) {
      const { count } = await supabaseServer
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('confession_id', confession_id)
        .eq('status', 'pending');

      if ((count || 0) >= MIN_REPORTS_TO_HIDE) {
        await supabaseServer
          .from('confessions')
          .update({ is_hidden_pending_review: true })
          .eq('id', confession_id)
          .eq('is_hidden_pending_review', false); // idempotent
      }
    }

    // Flag user if they hit the threshold
    if (reported_user_id) {
      const { count } = await supabaseServer
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('reported_user_id', reported_user_id)
        .eq('status', 'pending');

      if ((count || 0) >= MIN_REPORTS_TO_HIDE) {
        await supabaseServer
          .from('profiles')
          .update({ is_flagged_pending_review: true })
          .eq('id', reported_user_id)
          .eq('is_flagged_pending_review', false); // idempotent
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('POST /api/reports:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
