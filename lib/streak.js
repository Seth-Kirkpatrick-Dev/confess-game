import { supabaseServer } from './supabase-server';

export async function updateStreak(userId) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD UTC

  const { data: profile } = await supabaseServer
    .from('profiles')
    .select('current_streak, longest_streak, last_activity_date')
    .eq('id', userId)
    .single();

  if (!profile || profile.last_activity_date === today) return;

  let newStreak;
  if (!profile.last_activity_date) {
    newStreak = 1;
  } else {
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    newStreak = profile.last_activity_date === yesterdayStr ? profile.current_streak + 1 : 1;
  }

  await supabaseServer
    .from('profiles')
    .update({
      current_streak: newStreak,
      longest_streak: Math.max(profile.longest_streak, newStreak),
      last_activity_date: today,
    })
    .eq('id', userId);
}
