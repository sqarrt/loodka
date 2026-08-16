'use server';

import { createClient } from '@/lib/supabase/server';
import { shouldGrantDailyBonus, DAILY_BONUS_AMOUNT } from '@/lib/daily-bonus';

export async function claimDailyBonus() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('balance, last_daily_claim_at')
    .eq('user_id', user.id)
    .maybeSingle();

  const today = new Date().toISOString().slice(0, 10);

  if (!profile) {
    const { data: created } = await supabase
      .from('profiles')
      .insert({ user_id: user.id, balance: DAILY_BONUS_AMOUNT, last_daily_claim_at: today })
      .select('balance, last_daily_claim_at')
      .single();
    return created;
  }

  if (shouldGrantDailyBonus(profile.last_daily_claim_at, today)) {
    const { data: updated } = await supabase
      .from('profiles')
      .update({ balance: profile.balance + DAILY_BONUS_AMOUNT, last_daily_claim_at: today })
      .eq('user_id', user.id)
      .select('balance, last_daily_claim_at')
      .single();
    return updated;
  }

  return profile;
}
