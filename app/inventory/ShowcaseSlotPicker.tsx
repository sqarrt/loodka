'use client';

import { useRouter } from 'next/navigation';
import { setShowcaseSlot } from '@/app/actions/set-showcase-slot';

export function ShowcaseSlotPicker({
  inventoryId,
  currentSlotIndex,
}: {
  inventoryId: string;
  currentSlotIndex: number | null;
}) {
  const router = useRouter();

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const slotIndex = value === '' ? null : Number(value);
    await setShowcaseSlot(inventoryId, slotIndex);
    router.refresh();
  };

  return (
    <select value={currentSlotIndex ?? ''} onChange={handleChange}>
      <option value="">— не в витрине —</option>
      {Array.from({ length: 12 }, (_, i) => (
        <option key={i} value={i}>
          Слот {i + 1}
        </option>
      ))}
    </select>
  );
}
