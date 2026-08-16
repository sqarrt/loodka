'use client';

import { useState } from 'react';
import { ShowcasePicker } from './ShowcasePicker';
import { CurrencyIcon } from '@/components/CurrencyIcon';

type DisplayItem = {
  inventoryId: string;
  name: string;
  imageUrl: string;
};

type CaseSummary = {
  id: string;
  title: string;
  price: number;
  itemCount: number;
};

export function ProfileTabs({
  slots,
  allItems,
  cases,
  viewerIsOwner,
}: {
  slots: (string | null)[];
  allItems: DisplayItem[];
  cases: CaseSummary[];
  viewerIsOwner: boolean;
}) {
  const [tab, setTab] = useState<'showcase' | 'inventory' | 'cases'>('showcase');
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);
  const itemsById = new Map(allItems.map((item) => [item.inventoryId, item]));

  const TAB_LABELS = { showcase: 'Витрина', inventory: 'Инвентарь', cases: 'Кейсы' } as const;

  return (
    <div className="flex flex-col gap-5">
      <nav className="flex gap-6 border-b border-line-soft">
        {(['showcase', 'inventory', 'cases'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-3 font-display text-label uppercase ${
              tab === t
                ? 'border-b-2 border-gold text-text-primary'
                : 'text-text-muted'
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </nav>

      {tab === 'showcase' && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {slots.map((inventoryId, i) => {
            const item = inventoryId ? itemsById.get(inventoryId) : null;
            return (
              <div
                key={i}
                onClick={viewerIsOwner ? () => setPickerSlot(i) : undefined}
                className={`flex flex-col overflow-hidden rounded-md border ${
                  item ? 'border-line bg-surface-card' : 'border-dashed border-line-strong bg-inset'
                } ${viewerIsOwner ? 'cursor-pointer hover:border-gold' : ''}`}
              >
                {item ? (
                  <>
                    <div className="flex aspect-square w-full items-center justify-center bg-surface-raised">
                      {item.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-full w-full object-contain p-2"
                        />
                      )}
                    </div>
                    <div className="px-2.5 py-2">
                      <span className="truncate text-caps font-semibold">{item.name}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex aspect-square w-full flex-col items-center justify-center gap-2">
                    <span className="h-3.5 w-3.5 rotate-45 rounded-[2px] border border-line-strong" />
                    <span className="font-mono text-caps text-text-dim">
                      слот {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'inventory' && (
        <div className="flex flex-col gap-2.5">
          {allItems.map((item) => (
            <div
              key={item.inventoryId}
              className="flex items-center gap-4 rounded-lg border border-line bg-surface-card p-3"
            >
              {item.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt={item.name} className="h-16 w-22 rounded-md object-cover" />
              )}
              <span className="text-label font-semibold">{item.name}</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'cases' && (
        <div className="flex flex-col gap-2.5">
          {cases.map((c) => (
            <div
              key={c.id}
              className="flex flex-col gap-3 rounded-lg border border-line bg-surface-card p-4 sm:grid sm:grid-cols-[1fr_110px_90px_auto] sm:items-center"
            >
              <span className="font-display text-label uppercase">{c.title}</span>
              <span className="font-mono text-mono-num text-text-secondary">
                {c.itemCount} предметов
              </span>
              <span className="flex items-center gap-2 font-mono text-label font-bold">
                <CurrencyIcon size={12} /> {c.price}
              </span>
              <a
                href={`/case/${c.id}`}
                className="flex h-9 items-center justify-center rounded-md border border-gold px-3 font-mono text-caps uppercase text-gold sm:justify-self-end"
              >
                открыть
              </a>
            </div>
          ))}
          {cases.length === 0 && (
            <p className="font-mono text-caps text-text-muted">Кейсов пока нет.</p>
          )}
        </div>
      )}

      {pickerSlot !== null && (
        <ShowcasePicker
          slotIndex={pickerSlot}
          allItems={allItems}
          currentItemId={slots[pickerSlot]}
          onClose={() => setPickerSlot(null)}
        />
      )}
    </div>
  );
}
