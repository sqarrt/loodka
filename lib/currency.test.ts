import { describe, it, expect } from 'vitest';
import { formatLudki } from './currency';

describe('formatLudki', () => {
  it('prints whole amounts bare', () => {
    expect(formatLudki(10)).toBe('10');
    expect(formatLudki(0)).toBe('0');
  });

  it('prints fractional amounts fixed to 2 decimals', () => {
    expect(formatLudki(10.5)).toBe('10.50');
    expect(formatLudki(0.56)).toBe('0.56');
  });

  it('rounds noisy floats to 2 decimals', () => {
    expect(formatLudki(1.9999999999998)).toBe('2.00');
  });
});
