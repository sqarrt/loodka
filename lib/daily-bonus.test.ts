import { describe, it, expect } from 'vitest';
import { shouldGrantDailyBonus, DAILY_BONUS_AMOUNT } from './daily-bonus';

describe('shouldGrantDailyBonus', () => {
  it('returns true when the bonus was never claimed', () => {
    expect(shouldGrantDailyBonus(null, '2026-08-16')).toBe(true);
  });

  it('returns true when the last claim was on an earlier day', () => {
    expect(shouldGrantDailyBonus('2026-08-15', '2026-08-16')).toBe(true);
  });

  it('returns false when already claimed today', () => {
    expect(shouldGrantDailyBonus('2026-08-16', '2026-08-16')).toBe(false);
  });
});

describe('DAILY_BONUS_AMOUNT', () => {
  it('is 10', () => {
    expect(DAILY_BONUS_AMOUNT).toBe(10);
  });
});
