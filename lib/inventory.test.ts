import { describe, it, expect } from 'vitest';
import { mapInventoryToDisplayItems, type InventoryRowWithItem } from './inventory';

describe('mapInventoryToDisplayItems', () => {
  it('resolves each row to its item name and image path', () => {
    const rows: InventoryRowWithItem[] = [
      {
        id: 'inv-1',
        cashback_value: 5,
        obtained_at: '2026-08-16T00:00:00Z',
        case_items: { name: 'Beta', image_path: 'b.png', description: 'A shiny beta thing' },
      },
    ];
    const result = mapInventoryToDisplayItems(rows);
    expect(result).toEqual([
      {
        inventoryId: 'inv-1',
        name: 'Beta',
        image_path: 'b.png',
        description: 'A shiny beta thing',
        cashbackValue: 5,
        obtainedAt: '2026-08-16T00:00:00Z',
      },
    ]);
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
