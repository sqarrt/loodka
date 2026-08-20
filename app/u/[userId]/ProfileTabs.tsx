'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ShowcasePicker } from './ShowcasePicker';
import {
  ShowcaseDragPanel,
  SLOT_DRAG_MIME,
  ITEM_DRAG_MIME,
  CASE_DRAG_MIME,
  setThumbDragImage,
  type SlotDragPayload,
  type SlotSelection,
} from './ShowcaseDragPanel';
import { ItemCard } from '@/components/ItemCard';
import { CaseCard } from '@/components/CaseCard';
import { setShowcaseSlot } from '@/app/actions/set-showcase-slot';
import { cashBackItem } from '@/app/actions/cash-back-item';
import { formatLudki } from '@/lib/currency';
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
  cashbackValue: number;
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

  // Same media-query pattern ShowcasePicker.tsx already uses for its own
  // body-scroll lock — mobile keeps the existing click-opens-picker flow
  // untouched, desktop gets the persistent drag panel instead.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 639px)');
    const apply = () => setIsMobile(mql.matches);
    apply();
    mql.addEventListener('change', apply);
    return () => mql.removeEventListener('change', apply);
  }, []);

  const [desktopPickerCollapsed, setDesktopPickerCollapsed] = useState(false);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  const desktopPanelOpen = tab === 'showcase' && viewerIsOwner && !isMobile && !desktopPickerCollapsed;
  const [, startPlacingTransition] = useTransition();

  const excludeInventoryIds = slots.map((s) => s.inventoryId).filter((id): id is string => id !== null);
  const excludeCaseIds = slots.map((s) => s.caseId).filter((id): id is string => id !== null);

  const placeInSlot = (slotIndex: number, selection: SlotSelection) => {
    startPlacingTransition(async () => {
      await setShowcaseSlot(slotIndex, selection);
      router.refresh();
    });
  };

  const clearSlot = (slotIndex: number) => {
    startPlacingTransition(async () => {
      await setShowcaseSlot(slotIndex, null);
      router.refresh();
    });
  };

  const [sellingId, setSellingId] = useState<string | null>(null);
  const [sellError, setSellError] = useState<string | null>(null);
  const [, startSellTransition] = useTransition();

  const sellItem = (inventoryId: string) => {
    setSellError(null);
    setSellingId(inventoryId);
    startSellTransition(async () => {
      const result = await cashBackItem(inventoryId);
      setSellingId(null);
      if (result.error) {
        setSellError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const TAB_LABELS = { showcase: 'Витрина', inventory: 'Инвентарь', cases: 'Кейсы' } as const;

  return (
    <>
      <div
        className={`mx-auto flex w-full max-w-[1140px] flex-col gap-6 px-10 py-10 transition-[max-width] duration-200 ${
          // Content is centered against the real viewport, same as when the
          // side panel is closed — it only gives up width once the panel
          // would actually reach it (100vw - panel - gap), not always.
          // That's what keeps it in place on screens with room to spare.
          // sm+ only: on mobile the picker is a full-screen overlay (not a
          // side panel), so the content behind it never needs to shrink —
          // `100vw - 440px` goes negative below 440px wide and collapses
          // this container to 0, which is what was overflowing the page.
          desktopPanelOpen ? 'sm:max-w-[min(1140px,calc(100vw_-_440px))]' : ''
        }`}
      >
        <div className="flex flex-col gap-1">
          <span className="font-mono text-caps uppercase text-text-muted">профиль</span>
          <h1 className="break-words font-display text-heading uppercase sm:text-display-lg">
            {displayName ?? 'Профиль'}
          </h1>
          <div className="flex w-56 flex-col gap-1.5 pt-2">
            <span className="font-mono text-label uppercase text-gold">уровень {level}</span>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-inset">
              <div
                className="h-full rounded-full bg-gold"
                style={{ width: `${Math.min(fraction, 1) * 100}%` }}
              />
            </div>
            <span className="self-end font-mono text-caps text-text-muted">
              {formatLudki(intoLevel)} / {Math.round(forLevel)}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-5">
      <nav className="flex items-center gap-6 border-b border-line-soft">
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
        {tab === 'showcase' && viewerIsOwner && !isMobile && (
          <button
            onClick={() => setDesktopPickerCollapsed((c) => !c)}
            className="ml-auto hidden items-center gap-1.5 pb-3 font-mono text-caps uppercase text-text-muted hover:text-gold sm:flex"
          >
            Пикер <span aria-hidden>{desktopPickerCollapsed ? '‹' : '›'}</span>
          </button>
        )}
      </nav>

      {tab === 'showcase' && (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4">
          {slots.map((slot, i) => {
            const item = slot.inventoryId ? itemsById.get(slot.inventoryId) : null;
            const caseDisplay = slot.caseId ? caseDisplayById[slot.caseId] : null;
            const filled = !!(item || caseDisplay);
            const slotSelection: SlotSelection | null = slot.inventoryId
              ? { type: 'item', inventoryId: slot.inventoryId }
              : slot.caseId
                ? { type: 'case', caseId: slot.caseId }
                : null;

            // Mobile keeps the original flow: any slot click (owner) opens
            // the picker scoped to it. Desktop drops that entirely —
            // placement is drag-only there — so a click falls back to the
            // same thing a non-owner gets: navigate if it's a case slot,
            // otherwise nothing (the "×" and drag handle the rest).
            const onClick =
              viewerIsOwner && isMobile
                ? () => setPickerSlot(i)
                : slot.caseId
                  ? () => router.push(`/case/${slot.caseId}`)
                  : undefined;

            const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
              if (!slotSelection) return;
              const payload: SlotDragPayload = { slotIndex: i, selection: slotSelection };
              e.dataTransfer.setData(SLOT_DRAG_MIME, JSON.stringify(payload));
              e.dataTransfer.effectAllowed = 'move';
              setThumbDragImage(e, item?.imageUrl ?? caseDisplay?.coverImageUrl ?? undefined);
            };

            const handleDragOver = (e: React.DragEvent) => {
              if (!viewerIsOwner) return;
              const types = e.dataTransfer.types;
              if (types.includes(SLOT_DRAG_MIME) || types.includes(ITEM_DRAG_MIME) || types.includes(CASE_DRAG_MIME)) {
                e.preventDefault();
                setDragOverSlot(i);
              }
            };

            const handleDrop = (e: React.DragEvent) => {
              e.preventDefault();
              setDragOverSlot(null);
              const slotRaw = e.dataTransfer.getData(SLOT_DRAG_MIME);
              if (slotRaw) {
                const payload = JSON.parse(slotRaw) as SlotDragPayload;
                placeInSlot(i, payload.selection);
                return;
              }
              const inventoryId = e.dataTransfer.getData(ITEM_DRAG_MIME);
              if (inventoryId) {
                placeInSlot(i, { type: 'item', inventoryId });
                return;
              }
              const caseId = e.dataTransfer.getData(CASE_DRAG_MIME);
              if (caseId) placeInSlot(i, { type: 'case', caseId });
            };

            return (
              <div
                key={i}
                onClick={onClick}
                draggable={viewerIsOwner && filled}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={() => setDragOverSlot((cur) => (cur === i ? null : cur))}
                onDrop={handleDrop}
                className={`relative rounded-md ${onClick ? 'cursor-pointer' : ''} ${
                  viewerIsOwner && filled ? 'cursor-grab active:cursor-grabbing' : ''
                } ${
                  pickerSlot === i || dragOverSlot === i
                    ? 'ring-2 ring-gold ring-offset-2 ring-offset-bg'
                    : ''
                }`}
              >
                {viewerIsOwner && filled && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearSlot(i);
                    }}
                    aria-label="Освободить слот"
                    className="absolute right-2.5 top-2.5 z-30 flex h-7 w-7 items-center justify-center rounded-full border border-line-strong bg-bg/70 text-text-secondary hover:border-danger hover:text-danger"
                  >
                    ×
                  </button>
                )}
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
                      {/* Matches ItemCard's real footer exactly (border-t,
                          same font size, two stacked lines — case title +
                          author) — a filled card's footer is two lines,
                          not one, so a shorter placeholder made the grid
                          jump a row's height whenever a drag mixed filled
                          and empty slots in the same row. */}
                      <div className="mt-auto flex flex-col gap-0.5 truncate border-t border-line-soft pt-2 font-mono text-[10px] text-text-dim">
                        <span className="invisible">&nbsp;</span>
                        <span className="text-center">слот {String(i + 1).padStart(2, '0')}</span>
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
        <div className="flex flex-col gap-3">
          {sellError && (
            <p role="alert" className="font-mono text-caps text-danger">
              {sellError}
            </p>
          )}
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
                cashbackValue={viewerIsOwner ? item.cashbackValue : undefined}
                onSell={viewerIsOwner ? () => sellItem(item.inventoryId) : undefined}
                selling={sellingId === item.inventoryId}
                size="fill"
              />
            ))}
          </div>
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
        // Mobile: a genuine full-screen sheet (the old `w-full max-w-[400px]`
        // math broke down below 400px — `right-4` + `width:100%` solves to a
        // negative `left`, sliding the panel 16px past the left edge and
        // making every element inside it click off-target). Desktop keeps
        // the original fixed-width side panel unchanged.
        <div className="fixed inset-0 z-40 sm:inset-auto sm:right-4 sm:top-[70px] sm:z-10 sm:h-[calc(100vh-86px)] sm:w-[400px]">
          <ShowcasePicker
            slotIndex={pickerSlot}
            currentInventoryId={slots[pickerSlot].inventoryId}
            currentCaseId={slots[pickerSlot].caseId}
            onClose={() => setPickerSlot(null)}
          />
        </div>
      )}

      {desktopPanelOpen && (
        // Flush to `right-0`, not `right-4` — any margin here read as a
        // stray gap rather than intentional spacing. The expand/collapse
        // toggle itself now lives in the tab nav (next to Витрина/
        // Инвентарь/Кейсы), not as a floating button here.
        <div className="hidden sm:fixed sm:inset-auto sm:right-0 sm:top-[70px] sm:z-10 sm:flex sm:h-[calc(100vh-86px)] sm:w-[400px]">
          <ShowcaseDragPanel
            excludeInventoryIds={excludeInventoryIds}
            excludeCaseIds={excludeCaseIds}
            onClearSlot={clearSlot}
            onCollapse={() => setDesktopPickerCollapsed(true)}
          />
        </div>
      )}
    </>
  );
}
