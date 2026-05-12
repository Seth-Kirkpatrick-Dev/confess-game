import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET() {
  try {
    const [{ data: confessors, error: e1 }, { data: detectors, error: e2 }] = await Promise.all([
      supabaseServer.from('profiles').select('id, username, confession_points, detection_points')
        .eq('is_banned', false).order('confession_points', { ascending: false }).limit(10),
      supabaseServer.from('profiles').select('id, username, confession_points, detection_points')
        .eq('is_banned', false).order('detection_points', { ascending: false }).limit(10),
    ]);

    if (e1 || e2) throw e1 || e2;
    return NextResponse.json({ confessors, detectors });
  } catch (err) {
    console.error('GET /api/leaderboard:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
