export function assignItemToSlot(
  currentSlots: (string | null)[],
  inventoryId: string,
  targetSlotIndex: number | null
): (string | null)[] {
  const cleared = currentSlots.map((id) => (id === inventoryId ? null : id));
  if (targetSlotIndex !== null) {
    cleared[targetSlotIndex] = inventoryId;
  }
  return cleared;
}
