export const DAILY_BONUS_AMOUNT = 10;

export function shouldGrantDailyBonus(lastClaimDate: string | null, today: string): boolean {
  return lastClaimDate !== today;
}
