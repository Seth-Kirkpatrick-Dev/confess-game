import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { grantAchievement } from '@/lib/achievements';

// Called by GitHub Actions: ?type=weekly (Sunday 23:59 UTC) or ?type=monthly (last day of month 23:59 UTC)
export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  if (type !== 'weekly' && type !== 'monthly') {
    return NextResponse.json({ error: 'type must be weekly or monthly' }, { status: 400 });
  }

  const pointsCol = type === 'weekly' ? 'weekly_points' : 'monthly_points';
  const periodEnd   = new Date();
  const periodStart = type === 'weekly'
    ? new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000)
    : new Date(periodEnd.getFullYear(), periodEnd.getMonth(), 1);

  // Fetch top 100 for the period
  const { data: top, error } = await supabaseServer
    .from('profiles')
    .select(`id, username, ${pointsCol}`)
    .eq('is_banned', false)
    .gt(pointsCol, 0)
    .order(pointsCol, { ascending: false })
    .limit(100);

  if (error) {
    console.error('Rollover fetch:', error.message);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  if (!top || top.length === 0) {
    return NextResponse.json({ snapshotted: 0, type });
  }

  // Snapshot into leaderboard_history
  const rows = top.map((profile, i) => ({
    period_type:  type,
    period_start: periodStart.toISOString(),
    period_end:   periodEnd.toISOString(),
    rank:         i + 1,
    user_id:      profile.id,
    points:       profile[pointsCol],
  }));

  const { error: insertErr } = await supabaseServer
    .from('leaderboard_history')
    .insert(rows)
    .onConflict('period_type, period_start, rank')
    .ignore();

  if (insertErr) {
    console.error('Rollover insert:', insertErr.message);
    return NextResponse.json({ error: 'Insert error' }, { status: 500 });
  }

  // Grant achievements to top finishers (non-blocking)
  const grantPromises = [];

  if (type === 'weekly') {
    if (top[0]) grantPromises.push(grantAchievement(top[0].id, 'Weekly Champion').catch(() => {}));
    const top10 = top.slice(0, 10);
    for (const p of top10) grantPromises.push(grantAchievement(p.id, 'Top 10 (Weekly)').catch(() => {}));
    for (const p of top) grantPromises.push(grantAchievement(p.id, 'Top 100 (Weekly)').catch(() => {}));
  } else {
    if (top[0]) grantPromises.push(grantAchievement(top[0].id, 'Monthly Champion').catch(() => {}));
    const top10 = top.slice(0, 10);
    for (const p of top10) grantPromises.push(grantAchievement(p.id, 'Top 10 (Monthly)').catch(() => {}));
  }

  await Promise.all(grantPromises);

  // Reset period points to 0
  const { error: resetErr } = await supabaseServer
    .from('profiles')
    .update({ [pointsCol]: 0 })
    .neq('id', '00000000-0000-0000-0000-000000000000'); // update all rows

  if (resetErr) {
    console.error('Rollover reset:', resetErr.message);
    // snapshot succeeded — don't fail the whole request
  }

  return NextResponse.json({ snapshotted: top.length, type, period_start: periodStart, period_end: periodEnd });
}
