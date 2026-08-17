export type RarityTier = 'common' | 'uncommon' | 'rare' | 'epic' | 'legend';

export const RARITY_INFO: Record<RarityTier, { name: string; colorVar: string }> = {
  common: { name: 'Обычный', colorVar: 'var(--color-rarity-common)' },
  uncommon: { name: 'Необычный', colorVar: 'var(--color-rarity-uncommon)' },
  rare: { name: 'Редкий', colorVar: 'var(--color-rarity-rare)' },
  epic: { name: 'Эпический', colorVar: 'var(--color-rarity-epic)' },
  legend: { name: 'Легендарный', colorVar: 'var(--color-rarity-legend)' },
};

export function getRarityTier(probability: number): RarityTier {
  if (probability >= 0.4) return 'common';
  if (probability >= 0.2) return 'uncommon';
  if (probability >= 0.08) return 'rare';
  if (probability >= 0.02) return 'epic';
  return 'legend';
}
