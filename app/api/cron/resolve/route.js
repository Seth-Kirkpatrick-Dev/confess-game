import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { checkAchievements, grantAchievement } from '@/lib/achievements';

function calculateTier(correctVotes, totalResolvedVotes) {
  if (totalResolvedVotes < 10) return 'Newbie';
  const accuracy = correctVotes / totalResolvedVotes;
  if (accuracy >= 0.80) return 'Oracle';
  if (accuracy >= 0.70) return 'Lie Detector';
  if (accuracy >= 0.60) return 'Truth Hunter';
  return 'Skeptic';
}

function calculatePosterPoints(totalVotes, wrongVoteRatio, hasPromptBonus) {
  if (totalVotes === 0) return 0;
  if (totalVotes < 5) return 3;
  const points = Math.floor(wrongVoteRatio * 20);
  return hasPromptBonus ? Math.floor(points * 1.5) : points;
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  // Daily run — process up to 200 at once; next day picks up the rest
  const BATCH_SIZE = 200;

  const { data: confessions, error } = await supabaseServer
    .from('confessions')
    .select('*')
    .eq('is_resolved', false)
    .eq('is_deleted', false)
    .not('is_true', 'is', null)
    .lte('created_at', cutoff)
    .limit(BATCH_SIZE);

  if (error) {
    console.error('Cron resolve fetch:', error.message);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  let resolved = 0;
  const errors = [];

  for (const confession of confessions) {
    try {
      // Mark resolved immediately to prevent double-processing if cron fires twice
      const { error: lockErr } = await supabaseServer
        .from('confessions')
        .update({ is_resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', confession.id)
        .eq('is_resolved', false); // Only succeeds if not already resolved (race guard)

      if (lockErr) {
        console.error(`Failed to lock confession ${confession.id}:`, lockErr.message);
        continue;
      }

      const { data: votes } = await supabaseServer
        .from('votes')
        .select('id, user_id, vote_type')
        .eq('confession_id', confession.id);

      const allVotes = votes || [];
      const totalVotes = confession.real_votes + confession.fake_votes;
      const truthLabel = confession.is_true ? 'real' : 'fake';
      const wrongVotes = confession.is_true ? confession.fake_votes : confession.real_votes;
      const wrongVoteRatio = totalVotes > 0 ? wrongVotes / totalVotes : 0;
      const hasPromptBonus = !!confession.prompt_category;
      const posterPoints = calculatePosterPoints(totalVotes, wrongVoteRatio, hasPromptBonus);

      const notificationRows = [];

      for (const vote of allVotes) {
        const isCorrect = vote.vote_type === truthLabel;
        const pointsAwarded = isCorrect ? 5 : -2;

        await supabaseServer
          .from('votes')
          .update({ is_correct: isCorrect, points_awarded: pointsAwarded })
          .eq('id', vote.id);

        const { data: voterProfile } = await supabaseServer
          .from('profiles')
          .select('detection_points, weekly_points, monthly_points, spendable_points, correct_votes, total_resolved_votes, consecutive_correct_votes')
          .eq('id', vote.user_id)
          .single();

        if (voterProfile) {
          const newCorrect   = voterProfile.correct_votes + (isCorrect ? 1 : 0);
          const newTotal     = voterProfile.total_resolved_votes + 1;
          const newConsec    = isCorrect
            ? (voterProfile.consecutive_correct_votes || 0) + 1
            : 0;
          await supabaseServer
            .from('profiles')
            .update({
              detection_points:          voterProfile.detection_points + pointsAwarded,
              weekly_points:             (voterProfile.weekly_points || 0) + pointsAwarded,
              monthly_points:            (voterProfile.monthly_points || 0) + pointsAwarded,
              spendable_points:          (voterProfile.spendable_points || 0) + Math.max(0, pointsAwarded),
              correct_votes:             newCorrect,
              total_resolved_votes:      newTotal,
              tier:                      calculateTier(newCorrect, newTotal),
              consecutive_correct_votes: newConsec,
            })
            .eq('id', vote.user_id);

          // Non-blocking achievement check per voter (accuracy + streak + vote count)
          checkAchievements(vote.user_id).catch(() => {});
        }

        notificationRows.push({
          user_id: vote.user_id,
          confession_id: confession.id,
          your_vote: vote.vote_type,
          truth: truthLabel,
          is_correct: isCorrect,
          points_awarded: pointsAwarded,
        });
      }

      if (notificationRows.length > 0) {
        await supabaseServer.from('notifications').insert(notificationRows);
      }

      if (confession.user_id && posterPoints !== 0) {
        await supabaseServer.rpc('add_confession_points', {
          user_id_param: confession.user_id,
          points_param: posterPoints,
        });
      }

      // Poster-side achievements
      if (confession.user_id && totalVotes >= 5) {
        const wrongVotes = confession.is_true ? confession.fake_votes : confession.real_votes;

        // Perfect Fool: ≥45% voted wrong at resolution
        if (wrongVotes / totalVotes >= 0.45) {
          grantAchievement(confession.user_id, 'Perfect Fool').catch(() => {});
        }

        // Update total_fooled_voters and check Deceiver / Master Deceiver
        if (wrongVotes > 0) {
          const { data: posterProfile } = await supabaseServer
            .from('profiles')
            .select('total_fooled_voters')
            .eq('id', confession.user_id)
            .single();

          if (posterProfile) {
            await supabaseServer
              .from('profiles')
              .update({ total_fooled_voters: posterProfile.total_fooled_voters + wrongVotes })
              .eq('id', confession.user_id);
            checkAchievements(confession.user_id).catch(() => {});
          }
        }
      }

      resolved++;
    } catch (err) {
      console.error(`Failed to resolve ${confession.id}:`, err.message);
      errors.push(confession.id);
    }
  }

  return NextResponse.json({ resolved, skipped: errors.length, total: confessions.length });
}
