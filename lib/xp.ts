const BASE_LEVEL_2_THRESHOLD = 100;
const GROWTH = 1.3;

export function thresholdForLevel(level: number): number {
  if (level < 2) return 0;
  return BASE_LEVEL_2_THRESHOLD * GROWTH ** (level - 2);
}

export function cumulativeSpendForLevel(level: number): number {
  let total = 0;
  for (let l = 2; l <= level; l++) total += thresholdForLevel(l);
  return total;
}

export function levelForSpend(totalSpent: number): number {
  let level = 1;
  while (totalSpent >= cumulativeSpendForLevel(level + 1)) level++;
  return level;
}

export function progressForSpend(totalSpent: number): {
  level: number;
  intoLevel: number;
  forLevel: number;
  fraction: number;
} {
  const level = levelForSpend(totalSpent);
  const floor = cumulativeSpendForLevel(level);
  const forLevel = thresholdForLevel(level + 1);
  const intoLevel = totalSpent - floor;
  return { level, intoLevel, forLevel, fraction: forLevel > 0 ? intoLevel / forLevel : 0 };
}

export function dailyBonusForLevel(level: number, baseAmount: number): number {
  return Math.round(baseAmount * GROWTH ** (level - 1) * 100) / 100;
}
