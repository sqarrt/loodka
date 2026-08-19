export type InventoryRowWithItem = {
  id: string;
  cashback_value: number;
  obtained_at: string;
  case_items: {
    name: string;
    image_path: string;
    description: string | null;
    weight: number;
    case_id: string;
  } | null;
};

export type InventoryDisplayItem = {
  inventoryId: string;
  name: string;
  image_path: string;
  description: string | null;
  weight: number | null;
  caseId: string | null;
  cashbackValue: number;
  obtainedAt: string;
};

export function mapInventoryToDisplayItems(rows: InventoryRowWithItem[]): InventoryDisplayItem[] {
  return rows.map((row) => ({
    inventoryId: row.id,
    name: row.case_items?.name ?? 'Неизвестный предмет',
    image_path: row.case_items?.image_path ?? '',
    description: row.case_items?.description ?? null,
    weight: row.case_items?.weight ?? null,
    caseId: row.case_items?.case_id ?? null,
    cashbackValue: row.cashback_value,
    obtainedAt: row.obtained_at,
  }));
}
