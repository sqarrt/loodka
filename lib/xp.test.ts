import { describe, it, expect } from 'vitest';
import {
  levelForSpend,
  thresholdForLevel,
  cumulativeSpendForLevel,
  progressForSpend,
  dailyBonusForLevel,
} from './xp';

describe('thresholdForLevel', () => {
  it('level 2 costs 100', () => {
    expect(thresholdForLevel(2)).toBe(100);
  });
  it('each level costs 30% more than the last', () => {
    expect(thresholdForLevel(3)).toBe(130);
    expect(thresholdForLevel(4)).toBeCloseTo(169, 5);
  });
});

describe('cumulativeSpendForLevel', () => {
  it('level 1 needs 0 cumulative spend', () => {
    expect(cumulativeSpendForLevel(1)).toBe(0);
  });
  it('level 2 needs 100', () => {
    expect(cumulativeSpendForLevel(2)).toBe(100);
  });
  it('level 3 needs 100 + 130 = 230', () => {
    expect(cumulativeSpendForLevel(3)).toBeCloseTo(230, 5);
  });
});

describe('levelForSpend', () => {
  it('starts at level 1 with 0 spend', () => {
    expect(levelForSpend(0)).toBe(1);
  });
  it('stays at level 1 just under the level-2 threshold', () => {
    expect(levelForSpend(99)).toBe(1);
  });
  it('reaches level 2 exactly at 100', () => {
    expect(levelForSpend(100)).toBe(2);
  });
  it('reaches level 3 exactly at 230', () => {
    expect(levelForSpend(230)).toBe(3);
  });
});

describe('progressForSpend', () => {
  it('reports progress within the current level', () => {
    const result = progressForSpend(150);
    expect(result.level).toBe(2);
    expect(result.intoLevel).toBe(50); // 150 - 100
    expect(result.forLevel).toBeCloseTo(130, 5); // threshold for level 3
    expect(result.fraction).toBeCloseTo(50 / 130, 5);
  });
});

describe('dailyBonusForLevel', () => {
  it('level 1 gets the base amount', () => {
    expect(dailyBonusForLevel(1, 10)).toBe(10);
  });
  it('level 2 gets +30%', () => {
    expect(dailyBonusForLevel(2, 10)).toBe(13);
  });
  it('level 3 gets +30% compounding, floored', () => {
    expect(dailyBonusForLevel(3, 10)).toBe(Math.floor(10 * 1.3 * 1.3));
  });
});
