import { describe, it, expect } from 'vitest';
import { getRarityTier, formatProbabilityPercent } from './rarity';

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

describe('formatProbabilityPercent', () => {
  it('keeps large probabilities terse with no decimals', () => {
    expect(formatProbabilityPercent(0.5)).toBe('50%');
    expect(formatProbabilityPercent(0.453)).toBe('45%');
  });

  it('adds decimals only as needed to avoid a misleading 0%', () => {
    expect(formatProbabilityPercent(0.004)).toBe('0.4%');
    expect(formatProbabilityPercent(0.0003)).toBe('0.03%');
    expect(formatProbabilityPercent(0.00004)).toBe('0.004%');
  });

  it('caps precision at 3 decimals for vanishingly small odds', () => {
    expect(formatProbabilityPercent(0.0000004)).toBe('0.000%');
  });

  it('shows a bare 0% for exactly zero', () => {
    expect(formatProbabilityPercent(0)).toBe('0%');
  });
});
