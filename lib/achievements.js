import { supabaseServer } from './supabase-server';

// Achievement criteria keyed by name. Each receives the full profile row + live aggregate stats.
// Return true if the user qualifies. Already-granted achievements are pre-filtered before calling.
const CRITERIA = {
  'First Vote':         (p, s) => s.totalVotes >= 1,
  'First Confession':   (p, s) => s.totalConfessions >= 1,
  'Prolific Confessor': (p, s) => s.totalConfessions >= 10,
  'Confession Machine': (p, s) => s.totalConfessions >= 100,
  'Vote Enthusiast':    (p, s) => s.totalVotes >= 1000,
  'Week Streak':        (p)    => (p.longest_streak || 0) >= 7,
  'Month Streak':       (p)    => (p.longest_streak || 0) >= 30,
  'Century Streak':     (p)    => (p.longest_streak || 0) >= 100,
  'Oracle':             (p)    => p.tier === 'Oracle',
  'Sharp Eye':          (p)    => (p.total_resolved_votes || 0) >= 50 &&
                                  (p.correct_votes / p.total_resolved_votes) >= 0.90,
  'Perfect Sense':      (p)    => (p.consecutive_correct_votes || 0) >= 100,
  'Deceiver':           (p)    => (p.total_fooled_voters || 0) >= 10,
  'Master Deceiver':    (p)    => (p.total_fooled_voters || 0) >= 100,
  // Perfect Fool is granted per-resolution, not here — see cron/resolve
  'Daily Devotee':      (p, s) => s.hasTaggedPrompt,
  // Leaderboard achievements granted by rollover cron — not checked here
};

// Fetch all achievement rows (id, name) once and cache in module scope.
let _catalog = null;
async function getCatalog() {
  if (_catalog) return _catalog;
  const { data } = await supabaseServer
    .from('achievements')
    .select('id, name, icon, reward_points');
  _catalog = data || [];
  return _catalog;
}

/**
 * Check all applicable achievements for a user, grant any newly earned ones,
 * insert achievement notifications, and return the list of newly unlocked achievements.
 *
 * @param {string} userId
 * @param {object} overrides  Optional pre-fetched values to avoid redundant DB calls.
 *   { totalVotes, totalConfessions, hasTaggedPrompt }
 */
export async function checkAchievements(userId, overrides = {}) {
  const catalog = await getCatalog();

  // Fetch profile + already-granted achievement IDs in parallel
  const [profileResult, grantedResult] = await Promise.all([
    supabaseServer
      .from('profiles')
      .select('tier, longest_streak, current_streak, correct_votes, total_resolved_votes, total_fooled_voters, consecutive_correct_votes')
      .eq('id', userId)
      .single(),
    supabaseServer
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId),
  ]);

  const profile = profileResult.data;
  if (!profile) return [];

  const grantedIds = new Set((grantedResult.data || []).map(r => r.achievement_id));

  // Build aggregate stats — use overrides when caller has them to avoid extra queries
  const stats = {
    totalVotes:       overrides.totalVotes        ?? null,
    totalConfessions: overrides.totalConfessions  ?? null,
    hasTaggedPrompt:  overrides.hasTaggedPrompt   ?? false,
  };

  // Only fetch counts from DB if they weren't passed in
  const needsVotes        = stats.totalVotes === null;
  const needsConfessions  = stats.totalConfessions === null;
  const needsPrompt       = !stats.hasTaggedPrompt;

  const fetches = await Promise.all([
    needsVotes
      ? supabaseServer.from('votes').select('*', { count: 'exact', head: true }).eq('user_id', userId)
      : Promise.resolve({ count: stats.totalVotes }),
    needsConfessions
      ? supabaseServer.from('confessions').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('is_deleted', false)
      : Promise.resolve({ count: stats.totalConfessions }),
    needsPrompt
      ? supabaseServer.from('confessions').select('*', { count: 'exact', head: true }).eq('user_id', userId).not('prompt_category', 'is', null)
      : Promise.resolve({ count: 1 }),
  ]);

  stats.totalVotes        = fetches[0].count || 0;
  stats.totalConfessions  = fetches[1].count || 0;
  stats.hasTaggedPrompt   = (fetches[2].count || 0) > 0;

  // Evaluate criteria for ungrated achievements that have a criteria function
  const newlyGranted = [];
  for (const achievement of catalog) {
    if (grantedIds.has(achievement.id)) continue;
    const fn = CRITERIA[achievement.name];
    if (!fn) continue; // no client-side criteria (e.g. leaderboard badges) — skip
    if (!fn(profile, stats)) continue;
    newlyGranted.push(achievement);
  }

  if (newlyGranted.length === 0) return [];

  // Insert user_achievements rows
  await supabaseServer
    .from('user_achievements')
    .insert(newlyGranted.map(a => ({ user_id: userId, achievement_id: a.id })))
    .throwOnError();

  // Auto-grant any cosmetics linked to these achievements
  const { data: linkedCosmetics } = await supabaseServer
    .from('cosmetics')
    .select('id')
    .in('unlock_achievement_id', newlyGranted.map(a => a.id))
    .eq('is_active', true);

  if (linkedCosmetics?.length > 0) {
    await supabaseServer
      .from('user_cosmetics')
      .upsert(
        linkedCosmetics.map(c => ({ user_id: userId, cosmetic_id: c.id, acquired_via: 'achievement' })),
        { onConflict: 'user_id,cosmetic_id', ignoreDuplicates: true }
      );
  }

  // Insert achievement notifications
  await supabaseServer
    .from('notifications')
    .insert(newlyGranted.map(a => ({
      user_id:        userId,
      type:           'achievement',
      is_read:        false,
      achievement_id: a.id,
      message:        `You unlocked: ${a.icon} ${a.name}!`,
    })))
    .throwOnError();

  // Award points if any
  const pointsTotal = newlyGranted.reduce((sum, a) => sum + (a.reward_points || 0), 0);
  if (pointsTotal > 0) {
    await supabaseServer.rpc('add_detection_points', {
      user_id_param: userId,
      points_param: pointsTotal,
    });
  }

  // Invalidate module cache so next call gets fresh achievement rows (important for new deployments)
  _catalog = null;

  return newlyGranted;
}

/**
 * Grant a specific achievement by name (used for per-event achievements like Perfect Fool
 * or leaderboard badges that aren't checked via the general criteria loop).
 */
export async function grantAchievement(userId, achievementName) {
  const catalog = await getCatalog();
  const achievement = catalog.find(a => a.name === achievementName);
  if (!achievement) return null;

  // Check not already granted
  const { count } = await supabaseServer
    .from('user_achievements')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('achievement_id', achievement.id);

  if ((count || 0) > 0) return null; // already have it

  await supabaseServer
    .from('user_achievements')
    .insert({ user_id: userId, achievement_id: achievement.id });

  await supabaseServer
    .from('notifications')
    .insert({
      user_id:        userId,
      type:           'achievement',
      is_read:        false,
      achievement_id: achievement.id,
      message:        `You unlocked: ${achievement.icon} ${achievement.name}!`,
    });

  if (achievement.reward_points > 0) {
    await supabaseServer.rpc('add_detection_points', {
      user_id_param: userId,
      points_param: achievement.reward_points,
    });
  }

  _catalog = null;
  return achievement;
}
