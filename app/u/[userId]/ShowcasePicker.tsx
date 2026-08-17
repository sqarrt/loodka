'use client';

import { useRouter } from 'next/navigation';
import { setShowcaseSlot } from '@/app/actions/set-showcase-slot';

type DisplayItem = {
  inventoryId: string;
  name: string;
  imageUrl: string;
};

export function ShowcasePicker({
  slotIndex,
  allItems,
  currentItemId,
  onClose,
}: {
  slotIndex: number;
  allItems: DisplayItem[];
  currentItemId: string | null;
  onClose: () => void;
}) {
  const router = useRouter();

  const pick = async (inventoryId: string | null) => {
    await setShowcaseSlot(inventoryId ?? currentItemId!, inventoryId === null ? null : slotIndex);
    router.refresh();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-10 flex items-center justify-center bg-bg/80 p-7"
      onClick={onClose}
    >
      <div
        className="flex max-h-[70vh] w-full max-w-[480px] flex-col overflow-hidden rounded-lg border border-line-strong bg-surface-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line p-4">
          <span className="font-display text-label uppercase">
            Что поставить в слот {String(slotIndex + 1).padStart(2, '0')}
          </span>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-line text-text-secondary hover:border-line-strong hover:text-text-primary"
          >
            ×
          </button>
        </div>
        <div className="flex flex-col gap-2 overflow-auto p-3.5">
          {allItems.map((item) => (
            <button
              key={item.inventoryId}
              onClick={() => pick(item.inventoryId)}
              className="flex items-center gap-3 rounded-md border border-line bg-inset p-2.5 text-left hover:border-line-strong hover:bg-surface-raised"
            >
              {item.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt={item.name} className="h-11 w-14 rounded object-cover" />
              )}
              <span className="text-label font-semibold">{item.name}</span>
              {item.inventoryId === currentItemId && (
                <span className="ml-auto rounded-full border border-line px-2 py-1 font-mono text-[9px] uppercase text-text-muted">
                  уже в витрине
                </span>
              )}
            </button>
          ))}
        </div>
        {currentItemId && (
          <button
            onClick={() => pick(null)}
            className="border-t border-line p-3.5 text-center text-label text-text-secondary hover:text-danger"
          >
            Освободить слот
          </button>
        )}
      </div>
    </div>
  );
}
