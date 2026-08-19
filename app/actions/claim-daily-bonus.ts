'use server';

import { createClient } from '@/lib/supabase/server';
import { shouldGrantDailyBonus, DAILY_BONUS_AMOUNT } from '@/lib/daily-bonus';
import { levelForSpend, dailyBonusForLevel } from '@/lib/xp';

export async function claimDailyBonus() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('balance, last_daily_claim_at, total_spent')
    .eq('user_id', user.id)
    .maybeSingle();

  // The profile is created at login time (see app/auth/callback/route.ts),
  // so it should always exist by the time this runs. If it's somehow
  // missing, there's nothing to grant a bonus to.
  if (!profile) return null;

  const today = new Date().toISOString().slice(0, 10);

  if (shouldGrantDailyBonus(profile.last_daily_claim_at, today)) {
    const amount = dailyBonusForLevel(levelForSpend(profile.total_spent), DAILY_BONUS_AMOUNT);
    const { data: updated } = await supabase
      .from('profiles')
      .update({ balance: profile.balance + amount, last_daily_claim_at: today })
      .eq('user_id', user.id)
      .select('balance, last_daily_claim_at, total_spent')
      .single();
    return updated ? { ...updated, bonusGranted: true as const, bonusAmount: amount } : null;
  }

  return { ...profile, bonusGranted: false as const, bonusAmount: 0 };
}
