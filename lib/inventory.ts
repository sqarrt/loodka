import type { CaseItem } from './cases';

export type InventoryRow = {
  id: string;
  case_id: string;
  item_id: string;
  cashback_value: number;
  obtained_at: string;
};

export type CaseItemsById = Record<string, CaseItem[]>;

export type InventoryDisplayItem = {
  inventoryId: string;
  name: string;
  image_path: string;
  cashbackValue: number;
  obtainedAt: string;
};

export function mapInventoryToDisplayItems(
  rows: InventoryRow[],
  casesById: CaseItemsById
): InventoryDisplayItem[] {
  return rows.map((row) => {
    const item = casesById[row.case_id]?.find((i) => i.id === row.item_id);
    return {
      inventoryId: row.id,
      name: item?.name ?? 'Неизвестный предмет',
      image_path: item?.image_path ?? '',
      cashbackValue: row.cashback_value,
      obtainedAt: row.obtained_at,
    };
  });
}
