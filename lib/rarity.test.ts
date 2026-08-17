import { describe, it, expect } from 'vitest';
import { getRarityTier } from './rarity';

describe('getRarityTier', () => {
  it('classifies >= 40% as common', () => {
    expect(getRarityTier(0.5)).toBe('common');
    expect(getRarityTier(0.4)).toBe('common');
  });

  it('classifies 20-40% as uncommon', () => {
    expect(getRarityTier(0.39)).toBe('uncommon');
    expect(getRarityTier(0.2)).toBe('uncommon');
  });

  it('classifies 8-20% as rare', () => {
    expect(getRarityTier(0.19)).toBe('rare');
    expect(getRarityTier(0.08)).toBe('rare');
  });

  it('classifies 2-8% as epic', () => {
    expect(getRarityTier(0.079)).toBe('epic');
    expect(getRarityTier(0.02)).toBe('epic');
  });

  it('classifies < 2% as legend', () => {
    expect(getRarityTier(0.019)).toBe('legend');
    expect(getRarityTier(0.001)).toBe('legend');
  });
});
