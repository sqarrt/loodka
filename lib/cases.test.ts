import { describe, it, expect } from 'vitest';
import {
  computeOdds,
  pickWeightedRandom,
  buildReelStrip,
  buildIdleStrip,
  REEL_LENGTH,
  REEL_WINNER_INDEX,
} from './cases';

const items = [
  { id: 'a', name: 'A', image_path: 'a.png', weight: 1, description: null },
  { id: 'b', name: 'B', image_path: 'b.png', weight: 1, description: null },
  { id: 'c', name: 'C', image_path: 'c.png', weight: 2, description: null },
];

describe('computeOdds', () => {
  it('computes probability proportional to weight', () => {
    const result = computeOdds(items);
    expect(result[0].probability).toBeCloseTo(0.25);
    expect(result[1].probability).toBeCloseTo(0.25);
    expect(result[2].probability).toBeCloseTo(0.5);
  });
});

describe('pickWeightedRandom', () => {
  it('picks the first item when random() returns 0', () => {
    expect(pickWeightedRandom(items, () => 0).id).toBe('a');
  });

  it('picks the second item for a value in its range', () => {
    // total weight 4; random()=0.3 -> r=1.2, which falls in item b's [1,2) slice
    expect(pickWeightedRandom(items, () => 0.3).id).toBe('b');
  });

  it('picks the third item for a value in its (larger) range', () => {
    // random()=0.9 -> r=3.6, which falls in item c's [2,4) slice
    expect(pickWeightedRandom(items, () => 0.9).id).toBe('c');
  });
});

describe('buildReelStrip', () => {
  it('defaults to REEL_LENGTH items with the winner at REEL_WINNER_INDEX', () => {
    const strip = buildReelStrip(items, items[2], () => 0);
    expect(strip).toHaveLength(REEL_LENGTH);
    expect(strip[REEL_WINNER_INDEX]).toBe(items[2]);
  });

  it('fills non-winner slots by sampling from the item pool', () => {
    const strip = buildReelStrip(items, items[2], () => 0, 5, 2);
    expect(strip).toEqual([items[0], items[0], items[2], items[0], items[0]]);
  });
});

describe('buildIdleStrip', () => {
  it('cycles through items deterministically, with no randomness involved', () => {
    const strip = buildIdleStrip(items, 7);
    expect(strip).toEqual([
      items[0],
      items[1],
      items[2],
      items[0],
      items[1],
      items[2],
      items[0],
    ]);
  });

  it('defaults to REEL_LENGTH items', () => {
    expect(buildIdleStrip(items)).toHaveLength(REEL_LENGTH);
  });

  it('produces identical output across repeated calls (SSR/CSR must match)', () => {
    expect(buildIdleStrip(items)).toEqual(buildIdleStrip(items));
  });
});
