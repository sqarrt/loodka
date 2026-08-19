export type CaseItem = {
  id: string;
  name: string;
  image_path: string;
  weight: number;
  description: string | null;
};

export type CaseItemWithOdds = CaseItem & { probability: number };

export function computeOdds(items: CaseItem[]): CaseItemWithOdds[] {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  return items.map((item) => ({ ...item, probability: item.weight / total }));
}

export function pickWeightedRandom<T extends { weight: number }>(
  items: T[],
  random: () => number = Math.random
): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let r = random() * total;
  for (const item of items) {
    if (r < item.weight) return item;
    r -= item.weight;
  }
  return items[items.length - 1];
}

export const REEL_LENGTH = 60;
export const REEL_WINNER_INDEX = 52;
export const CARD_WIDTH_PX = 120;
export const CARD_PITCH_PX = 132; // 120px card + 12px gap

export function buildReelStrip<T>(
  items: T[],
  winner: T,
  random: () => number = Math.random,
  length: number = REEL_LENGTH,
  winnerIndex: number = REEL_WINNER_INDEX
): T[] {
  const strip: T[] = [];
  for (let i = 0; i < length; i++) {
    strip.push(i === winnerIndex ? winner : items[Math.floor(random() * items.length)]);
  }
  return strip;
}

// Deterministic (no Math.random) so the resting reel — rendered on both the
// server and the client during hydration — produces byte-identical output.
// buildReelStrip's own randomness is fine once mounted, since it only ever
// runs client-side from a click handler after that point.
export function buildIdleStrip<T>(items: T[], length: number = REEL_LENGTH): T[] {
  return Array.from({ length }, (_, i) => items[i % items.length]);
}
