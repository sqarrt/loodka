import { describe, it, expect } from 'vitest';
import { assignItemToSlot } from './showcase';

const empty12 = () => Array(12).fill(null) as (string | null)[];

describe('assignItemToSlot', () => {
  it('places an item into an empty target slot', () => {
    const result = assignItemToSlot(empty12(), 'item-1', 3);
    expect(result[3]).toBe('item-1');
    expect(result.filter((x) => x !== null)).toHaveLength(1);
  });

  it('moves an item from its old slot when reassigned to a new one', () => {
    const slots = empty12();
    slots[5] = 'item-1';
    const result = assignItemToSlot(slots, 'item-1', 2);
    expect(result[5]).toBeNull();
    expect(result[2]).toBe('item-1');
  });

  it('removes an item from the showcase when the target is null', () => {
    const slots = empty12();
    slots[5] = 'item-1';
    const result = assignItemToSlot(slots, 'item-1', null);
    expect(result.every((x) => x === null)).toBe(true);
  });

  it('displaces whatever previously occupied the target slot', () => {
    const slots = empty12();
    slots[2] = 'old-item';
    const result = assignItemToSlot(slots, 'new-item', 2);
    expect(result[2]).toBe('new-item');
    expect(result).not.toContain('old-item');
  });
});
