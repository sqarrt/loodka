import { describe, it, expect } from 'vitest';
import { mapInventoryToDisplayItems, type InventoryRowWithItem } from './inventory';

describe('mapInventoryToDisplayItems', () => {
  it('resolves each row to its item name and image path', () => {
    const rows: InventoryRowWithItem[] = [
      {
        id: 'inv-1',
        cashback_value: 5,
        obtained_at: '2026-08-16T00:00:00Z',
        case_items: { name: 'Beta', image_path: 'b.png', description: 'A shiny beta thing', weight: 3, case_id: 'case-1' },
      },
    ];
    const result = mapInventoryToDisplayItems(rows);
    expect(result).toEqual([
      {
        inventoryId: 'inv-1',
        name: 'Beta',
        image_path: 'b.png',
        description: 'A shiny beta thing',
        weight: 3,
        caseId: 'case-1',
        cashbackValue: 5,
        obtainedAt: '2026-08-16T00:00:00Z',
      },
    ]);
  });

  it('preserves a fractional cashback value', () => {
    const rows: InventoryRowWithItem[] = [
      {
        id: 'inv-3',
        cashback_value: 0.56,
        obtained_at: '2026-08-16T00:00:00Z',
        case_items: { name: 'Gamma', image_path: 'g.png', description: null, weight: 1, case_id: 'case-1' },
      },
    ];
    const result = mapInventoryToDisplayItems(rows);
    expect(result[0].cashbackValue).toBe(0.56);
  });

  it('falls back gracefully when the joined item is missing', () => {
    const rows: InventoryRowWithItem[] = [
      {
        id: 'inv-2',
        cashback_value: 3,
        obtained_at: '2026-08-16T00:00:00Z',
        case_items: null,
      },
    ];
    const result = mapInventoryToDisplayItems(rows);
    expect(result[0].name).toBe('Неизвестный предмет');
  });
});
