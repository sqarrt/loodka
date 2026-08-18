'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShowcasePicker } from './ShowcasePicker';
import { ItemCard } from '@/components/ItemCard';
import { CaseCard } from '@/components/CaseCard';

type DisplayItem = {
  inventoryId: string;
  name: string;
  imageUrl: string;
  description: string | null;
  probability?: number;
  caseId: string | null;
  caseTitle: string | null;
  authorId: string | null;
  authorName: string | null;
};

type CaseSummary = {
  id: string;
  title: string;
  price: number;
  itemCount: number;
  coverImageUrl: string | null;
};

type ShowcaseSlot = { inventoryId: string | null; caseId: string | null };

type CaseDisplay = { title: string; coverImageUrl: string | null };

export function ProfileTabs({
  slots,
  allItems,
  cases,
  caseDisplayById,
  viewerIsOwner,
}: {
  slots: ShowcaseSlot[];
  allItems: DisplayItem[];
  cases: CaseSummary[];
  caseDisplayById: Record<string, CaseDisplay>;
  viewerIsOwner: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<'showcase' | 'inventory' | 'cases'>('showcase');
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);
  const itemsById = new Map(allItems.map((item) => [item.inventoryId, item]));

  const TAB_LABELS = { showcase: 'Витрина', inventory: 'Инвентарь', cases: 'Кейсы' } as const;

  return (
    <div className="flex items-start gap-5">
      <div className="flex min-w-0 flex-1 flex-col gap-5">
      <nav className="flex gap-6 border-b border-line-soft">
        {(['showcase', 'inventory', 'cases'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-3 font-display text-label uppercase ${
              tab === t
                ? 'border-b-2 border-gold text-text-primary'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </nav>

      {tab === 'showcase' && (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-6">
          {slots.map((slot, i) => {
            const item = slot.inventoryId ? itemsById.get(slot.inventoryId) : null;
            const caseDisplay = slot.caseId ? caseDisplayById[slot.caseId] : null;

            // Owner clicking any slot (filled or empty) opens the picker to
            // change it. A non-owner can only ever navigate — and only a
            // case-slot has somewhere to navigate to.
            const onClick = viewerIsOwner
              ? () => setPickerSlot(i)
              : slot.caseId
                ? () => router.push(`/case/${slot.caseId}`)
                : undefined;

            return (
              <div
                key={i}
                onClick={onClick}
                className={`rounded-md ${onClick ? 'cursor-pointer' : ''} ${
                  pickerSlot === i ? 'ring-2 ring-gold ring-offset-2 ring-offset-bg' : ''
                }`}
              >
                {item ? (
                  <ItemCard
                    name={item.name}
                    imageUrl={item.imageUrl}
                    description={item.description}
                    probability={item.probability}
                    caseId={item.caseId}
                    caseTitle={item.caseTitle}
                    authorId={item.authorId}
                    authorName={item.authorName}
                    size="fill"
                  />
                ) : caseDisplay ? (
                  <CaseCard title={caseDisplay.title} coverImageUrl={caseDisplay.coverImageUrl} badge size="fill" />
                ) : (
                  <div
                    className={`flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-line-strong bg-inset ${
                      onClick ? 'hover:border-gold' : ''
                    }`}
                  >
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
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-6">
          {allItems.map((item) => (
            <ItemCard
              key={item.inventoryId}
              name={item.name}
              imageUrl={item.imageUrl}
              description={item.description}
              probability={item.probability}
              caseId={item.caseId}
              caseTitle={item.caseTitle}
              authorId={item.authorId}
              authorName={item.authorName}
              size="fill"
            />
          ))}
        </div>
      )}

      {tab === 'cases' && (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4">
          {cases.map((c) => (
            <div key={c.id} className="flex flex-col gap-2">
              <a href={`/case/${c.id}`}>
                <CaseCard title={c.title} coverImageUrl={c.coverImageUrl} itemCount={c.itemCount} price={c.price} size="fill" />
              </a>
              <div className="flex gap-2">
                {viewerIsOwner && (
                  <a
                    href={`/case/${c.id}/edit`}
                    className="flex h-9 flex-1 items-center justify-center rounded-md border border-line-strong px-3 font-mono text-caps uppercase text-text-secondary hover:border-gold hover:text-gold"
                  >
                    изменить
                  </a>
                )}
                <a
                  href={`/case/${c.id}`}
                  className="flex h-9 flex-1 items-center justify-center rounded-md border border-gold px-3 font-mono text-caps uppercase text-gold hover:bg-gold/10"
                >
                  открыть
                </a>
              </div>
            </div>
          ))}
          {cases.length === 0 && (
            <p className="font-mono text-caps text-text-muted">Кейсов пока нет.</p>
          )}
        </div>
      )}

      </div>

      {pickerSlot !== null && (
        <div className="sticky top-6 h-[calc(100vh-3rem)] w-[380px] shrink-0">
          <ShowcasePicker
            slotIndex={pickerSlot}
            currentInventoryId={slots[pickerSlot].inventoryId}
            currentCaseId={slots[pickerSlot].caseId}
            onClose={() => setPickerSlot(null)}
          />
        </div>
      )}
    </div>
  );
}
