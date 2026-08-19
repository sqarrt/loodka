export type RarityTier = 'common' | 'uncommon' | 'rare' | 'epic' | 'legend';

// glow: intensity of the radial-gradient rarity wash behind an item's
// thumbnail — scales with tier so legendary items read as instantly special.
export const RARITY_INFO: Record<RarityTier, { name: string; colorVar: string; glow: number }> = {
  common: { name: 'Обычный', colorVar: 'var(--color-rarity-common)', glow: 0.05 },
  uncommon: { name: 'Необычный', colorVar: 'var(--color-rarity-uncommon)', glow: 0.11 },
  rare: { name: 'Редкий', colorVar: 'var(--color-rarity-rare)', glow: 0.18 },
  epic: { name: 'Эпический', colorVar: 'var(--color-rarity-epic)', glow: 0.26 },
  legend: { name: 'Легендарный', colorVar: 'var(--color-rarity-legend)', glow: 0.4 },
};

export function getRarityTier(probability: number): RarityTier {
  if (probability >= 0.4) return 'common';
  if (probability >= 0.2) return 'uncommon';
  if (probability >= 0.08) return 'rare';
  if (probability >= 0.02) return 'epic';
  return 'legend';
}
