import { describe, it, expect } from 'vitest';
import { mapInventoryToDisplayItems, type InventoryRow, type CaseItemsById } from './inventory';

const casesById: CaseItemsById = {
  'case-1': [
    { id: 'item-a', name: 'Alpha', image_path: 'a.png', weight: 1 },
    { id: 'item-b', name: 'Beta', image_path: 'b.png', weight: 1 },
  ],
};

describe('mapInventoryToDisplayItems', () => {
  it('resolves each row to its item name and image path', () => {
    const rows: InventoryRow[] = [
      { id: 'inv-1', case_id: 'case-1', item_id: 'item-b', cashback_value: 5, obtained_at: '2026-08-16T00:00:00Z' },
    ];
    const result = mapInventoryToDisplayItems(rows, casesById);
    expect(result).toEqual([
      {
        inventoryId: 'inv-1',
        name: 'Beta',
        image_path: 'b.png',
        cashbackValue: 5,
        obtainedAt: '2026-08-16T00:00:00Z',
      },
    ]);
  });

  it('falls back gracefully when the item is missing from the case', () => {
    const rows: InventoryRow[] = [
      { id: 'inv-2', case_id: 'case-1', item_id: 'gone', cashback_value: 3, obtained_at: '2026-08-16T00:00:00Z' },
    ];
    const result = mapInventoryToDisplayItems(rows, casesById);
    expect(result[0].name).toBe('Неизвестный предмет');
  });
});
