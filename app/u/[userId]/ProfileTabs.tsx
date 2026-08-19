'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShowcasePicker } from './ShowcasePicker';
import { ItemCard } from '@/components/ItemCard';
import { CaseCard } from '@/components/CaseCard';
import type { RarityTier } from '@/lib/rarity';

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
  topRarity: RarityTier;
  createdAt: string;
  authorId: string;
  authorName: string;
};

type ShowcaseSlot = { inventoryId: string | null; caseId: string | null };

type CaseDisplay = CaseSummary;

export function ProfileTabs({
  displayName,
  level,
  intoLevel,
  forLevel,
  fraction,
  slots,
  allItems,
  cases,
  caseDisplayById,
  viewerIsOwner,
}: {
  displayName: string | null;
  level: number;
  intoLevel: number;
  forLevel: number;
  fraction: number;
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
  const pickerOpen = pickerSlot !== null;

  const TAB_LABELS = { showcase: 'Витрина', inventory: 'Инвентарь', cases: 'Кейсы' } as const;

  return (
    <>
      <div
        className={`mx-auto flex w-full flex-col gap-6 px-10 py-10 transition-[max-width] duration-200 ${
          // Content is centered against the real viewport, same as when the
          // picker is closed — it only gives up width once the picker would
          // actually reach it (100vw - picker - gap), not on every open.
          // That's what keeps it in place on screens with room to spare.
          pickerOpen ? 'max-w-[min(1140px,calc(100vw_-_440px))]' : 'max-w-[1140px]'
        }`}
      >
        <div className="flex flex-col gap-1">
          <span className="font-mono text-caps uppercase text-text-muted">профиль</span>
          <h1 className="font-display text-display-lg uppercase">{displayName ?? 'Профиль'}</h1>
          <div className="flex w-56 flex-col gap-1.5 pt-2">
            <span className="font-mono text-label uppercase text-gold">уровень {level}</span>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-inset">
              <div
                className="h-full rounded-full bg-gold"
                style={{ width: `${Math.min(fraction, 1) * 100}%` }}
              />
            </div>
            <span className="self-end font-mono text-caps text-text-muted">
              {intoLevel} / {Math.round(forLevel)}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-5">
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
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4">
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
                  <CaseCard
                    caseId={slot.caseId!}
                    title={caseDisplay.title}
                    coverImageUrl={caseDisplay.coverImageUrl}
                    itemCount={caseDisplay.itemCount}
                    price={caseDisplay.price}
                    topRarity={caseDisplay.topRarity}
                    authorId={caseDisplay.authorId}
                    authorName={caseDisplay.authorName}
                    createdAt={caseDisplay.createdAt}
                    size="fill"
                    linked={false}
                  />
                ) : (
                  // Same shape as a real card — a square "image" area whose
                  // height tracks the column width, plus a body-sized
                  // reserve below — so it's the same size as a filled card
                  // at every breakpoint, not just when a taller sibling
                  // happens to share its grid row.
                  <div
                    className={`flex w-full flex-col overflow-hidden rounded-md border border-dashed border-line bg-inset ${
                      onClick ? 'hover:border-gold' : ''
                    }`}
                  >
                    <div className="flex aspect-square w-full items-center justify-center">
                      <span className="h-3.5 w-3.5 rotate-45 rounded-[2px] border border-text-dim" />
                    </div>
                    <div className="flex flex-1 flex-col gap-1.5 p-3">
                      <div className="invisible text-mono-num">&nbsp;</div>
                      <div className="invisible min-h-[2.5em]">&nbsp;</div>
                      <div className="mt-auto pt-2 text-center font-mono text-caps text-text-dim">
                        слот {String(i + 1).padStart(2, '0')}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'inventory' && (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4">
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
            <CaseCard
              key={c.id}
              caseId={c.id}
              title={c.title}
              coverImageUrl={c.coverImageUrl}
              itemCount={c.itemCount}
              price={c.price}
              topRarity={c.topRarity}
              authorId={c.authorId}
              authorName={c.authorName}
              createdAt={c.createdAt}
              size="fill"
              editable={viewerIsOwner}
            />
          ))}
          {cases.length === 0 && (
            <p className="font-mono text-caps text-text-muted">Кейсов пока нет.</p>
          )}
        </div>
      )}
        </div>
      </div>

      {pickerOpen && pickerSlot !== null && (
        <div className="fixed right-4 top-[70px] z-10 h-[calc(100vh-86px)] w-full max-w-[400px]">
          <ShowcasePicker
            slotIndex={pickerSlot}
            currentInventoryId={slots[pickerSlot].inventoryId}
            currentCaseId={slots[pickerSlot].caseId}
            onClose={() => setPickerSlot(null)}
          />
        </div>
      )}
    </>
  );
}
