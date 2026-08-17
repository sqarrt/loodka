export type InventoryRowWithItem = {
  id: string;
  cashback_value: number;
  obtained_at: string;
  case_items: { name: string; image_path: string } | null;
};

export type InventoryDisplayItem = {
  inventoryId: string;
  name: string;
  image_path: string;
  cashbackValue: number;
  obtainedAt: string;
};

export function mapInventoryToDisplayItems(rows: InventoryRowWithItem[]): InventoryDisplayItem[] {
  return rows.map((row) => ({
    inventoryId: row.id,
    name: row.case_items?.name ?? 'Неизвестный предмет',
    image_path: row.case_items?.image_path ?? '',
    cashbackValue: row.cashback_value,
    obtainedAt: row.obtained_at,
  }));
}
