'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import {
  getInventoryPage,
  getOwnCasesPage,
  type PickerItem,
  type PickerCase,
} from '@/app/actions/showcase-picker-data';
import { ItemCard } from '@/components/ItemCard';
import { CaseCard } from '@/components/CaseCard';

type ItemsState = { items: PickerItem[]; hasMore: boolean; nextPage: number };
type CasesState = { cases: PickerCase[]; hasMore: boolean; nextPage: number };

const EMPTY_ITEMS: ItemsState = { items: [], hasMore: true, nextPage: 0 };
const EMPTY_CASES: CasesState = { cases: [], hasMore: true, nextPage: 0 };

export type SlotSelection = { type: 'item'; inventoryId: string } | { type: 'case'; caseId: string };
export type SlotDragPayload = { slotIndex: number; selection: SlotSelection };
export const SLOT_DRAG_MIME = 'application/x-loodka-showcase-slot';
export const ITEM_DRAG_MIME = 'application/x-loodka-showcase-item';
export const CASE_DRAG_MIME = 'application/x-loodka-showcase-case';

// Pointing setDragImage at the real card (still a fairly complex nested
// node — rarity glow, borders, footer) didn't reliably crop the browser's
// drag-image capture to just that card. A tiny, purpose-built, flat node —
// off-screen, nothing nested, nothing to mis-measure — sidesteps that
// entirely. Standard trick: append it detached from layout, hand it to
// setDragImage synchronously, drop it right after (the browser has already
// captured it by then).
export function setThumbDragImage(e: React.DragEvent, imageUrl?: string) {
  const el = document.createElement('div');
  el.style.position = 'fixed';
  el.style.top = '-1000px';
  el.style.left = '-1000px';
  el.style.width = '64px';
  el.style.height = '64px';
  el.style.borderRadius = '6px';
  el.style.overflow = 'hidden';
  el.style.background = '#1c1d24';
  if (imageUrl) {
    const img = document.createElement('img');
    img.src = imageUrl;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    el.appendChild(img);
  }
  document.body.appendChild(el);
  e.dataTransfer.setDragImage(el, 32, 32);
  setTimeout(() => el.remove(), 0);
}

// Desktop-only, persistent (not scoped to one slot) counterpart to the
// mobile ShowcasePicker — that component stays untouched (see plan). This
// one is drag-source only: no click-to-place, since there's no single
// target slot to imply. Placement happens by dropping onto a slot in
// ProfileTabs; dropping a dragged slot back here clears it (onClearSlot).
export function ShowcaseDragPanel({
  excludeInventoryIds,
  excludeCaseIds,
  onClearSlot,
  onCollapse,
}: {
  excludeInventoryIds: string[];
  excludeCaseIds: string[];
  onClearSlot: (slotIndex: number) => void;
  onCollapse: () => void;
}) {
  const [tab, setTab] = useState<'items' | 'cases'>('items');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [itemsState, setItemsState] = useState<ItemsState>(EMPTY_ITEMS);
  const [casesState, setCasesState] = useState<CasesState>(EMPTY_CASES);
  const [isPending, startTransition] = useTransition();
  const [panelDragOver, setPanelDragOver] = useState(false);
  const loadingMoreRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const excludeItemsSig = excludeInventoryIds.join(',');
  const excludeCasesSig = excludeCaseIds.join(',');

  // Cache key includes the exclude signature — otherwise a router.refresh()
  // after a drag places/clears something would leave an already-open panel
  // showing a stale list (still showing what was just placed, or hiding
  // what was just freed).
  const itemsCache = useRef(new Map<string, ItemsState>());
  const casesCache = useRef(new Map<string, CasesState>());

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (tab === 'items') {
      const key = `${debouncedQuery}|${excludeItemsSig}`;
      const cached = itemsCache.current.get(key);
      if (cached) {
        startTransition(() => setItemsState(cached));
        return;
      }
      startTransition(async () => {
        const result = await getInventoryPage(debouncedQuery, 0, excludeInventoryIds);
        const next: ItemsState = { items: result.items, hasMore: result.hasMore, nextPage: 1 };
        itemsCache.current.set(key, next);
        setItemsState(next);
      });
    } else {
      const key = `${debouncedQuery}|${excludeCasesSig}`;
      const cached = casesCache.current.get(key);
      if (cached) {
        startTransition(() => setCasesState(cached));
        return;
      }
      startTransition(async () => {
        const result = await getOwnCasesPage(debouncedQuery, 0, excludeCaseIds);
        const next: CasesState = { cases: result.cases, hasMore: result.hasMore, nextPage: 1 };
        casesCache.current.set(key, next);
        setCasesState(next);
      });
    }
    // excludeInventoryIds/excludeCaseIds are recreated every render in the
    // parent — the joined signature is the stable dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, debouncedQuery, excludeItemsSig, excludeCasesSig]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const hasMore = tab === 'items' ? itemsState.hasMore : casesState.hasMore;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || loadingMoreRef.current) return;
        loadingMoreRef.current = true;
        startTransition(async () => {
          if (tab === 'items') {
            const result = await getInventoryPage(debouncedQuery, itemsState.nextPage, excludeInventoryIds);
            setItemsState((prev) => {
              const next: ItemsState = {
                items: [...prev.items, ...result.items],
                hasMore: result.hasMore,
                nextPage: prev.nextPage + 1,
              };
              itemsCache.current.set(`${debouncedQuery}|${excludeItemsSig}`, next);
              return next;
            });
          } else {
            const result = await getOwnCasesPage(debouncedQuery, casesState.nextPage, excludeCaseIds);
            setCasesState((prev) => {
              const next: CasesState = {
                cases: [...prev.cases, ...result.cases],
                hasMore: result.hasMore,
                nextPage: prev.nextPage + 1,
              };
              casesCache.current.set(`${debouncedQuery}|${excludeCasesSig}`, next);
              return next;
            });
          }
          loadingMoreRef.current = false;
        });
      },
      { root: scrollRef.current, rootMargin: '300px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, debouncedQuery, itemsState.hasMore, itemsState.nextPage, casesState.hasMore, casesState.nextPage]);

  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(SLOT_DRAG_MIME)) {
      e.preventDefault();
      setPanelDragOver(true);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    const raw = e.dataTransfer.getData(SLOT_DRAG_MIME);
    setPanelDragOver(false);
    if (!raw) return; // dragging the panel's own contents onto itself — no-op
    e.preventDefault();
    const payload = JSON.parse(raw) as SlotDragPayload;
    onClearSlot(payload.slotIndex);
  };

  const items = tab === 'items' ? itemsState.items : [];
  const cases = tab === 'cases' ? casesState.cases : [];
  const hasMore = tab === 'items' ? itemsState.hasMore : casesState.hasMore;
  const showSkeleton = isPending && (tab === 'items' ? items.length === 0 : cases.length === 0);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={() => setPanelDragOver(false)}
      onDrop={handleDrop}
      className={`relative flex h-full w-full flex-col overflow-hidden rounded-lg border bg-surface-card shadow-2xl transition-colors ${
        panelDragOver ? 'border-danger' : 'border-line-strong'
      }`}
    >
      <button
        onClick={onCollapse}
        className="absolute right-3 top-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-md border border-line bg-surface-card text-text-secondary hover:border-line-strong hover:text-text-primary"
      >
        ×
      </button>

      {panelDragOver && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-bg/80">
          <span className="font-mono text-caps uppercase text-danger">Отпусти, чтобы освободить слот</span>
        </div>
      )}

      <div className="flex gap-4 border-b border-line-soft px-4 pr-14 pt-4">
        {(['items', 'cases'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2.5 font-display text-caps uppercase ${
              tab === t ? 'border-b-2 border-gold text-text-primary' : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {t === 'items' ? 'Предметы' : 'Мои кейсы'}
          </button>
        ))}
      </div>

      <div className="border-b border-line-soft p-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по названию"
          className="h-9 w-full rounded-md border border-line-strong bg-inset px-3 text-body outline-none focus:border-gold"
        />
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto p-3.5 [scrollbar-color:var(--color-line-strong)_transparent] [scrollbar-gutter:stable] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-line-strong [&::-webkit-scrollbar-track]:bg-transparent"
      >
        {showSkeleton && (
          <div className="grid grid-cols-3 gap-2.5">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <div className="aspect-square w-full animate-pulse rounded-md bg-surface-raised" />
                <div className="h-2.5 w-3/4 animate-pulse rounded bg-surface-raised" />
              </div>
            ))}
          </div>
        )}

        {!showSkeleton && tab === 'items' && (
          <div className="grid grid-cols-3 gap-2.5">
            {items.map((item) => (
              <div
                key={item.inventoryId}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(ITEM_DRAG_MIME, item.inventoryId);
                  e.dataTransfer.effectAllowed = 'move';
                  setThumbDragImage(e, item.imageUrl);
                }}
                className="cursor-grab active:cursor-grabbing"
              >
                <ItemCard name={item.name} imageUrl={item.imageUrl} probability={item.probability} size="fill" />
              </div>
            ))}
          </div>
        )}

        {!showSkeleton && tab === 'cases' && (
          <div className="grid grid-cols-3 gap-2.5">
            {cases.map((c) => (
              <div
                key={c.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(CASE_DRAG_MIME, c.id);
                  e.dataTransfer.effectAllowed = 'move';
                  setThumbDragImage(e, c.coverImageUrl ?? undefined);
                }}
                className="cursor-grab active:cursor-grabbing"
              >
                <CaseCard caseId={c.id} title={c.title} coverImageUrl={c.coverImageUrl} size="fill" linked={false} />
              </div>
            ))}
          </div>
        )}

        {!showSkeleton &&
          ((tab === 'items' && items.length === 0) || (tab === 'cases' && cases.length === 0)) && (
            <p className="p-2 text-center text-body text-text-dim">Всё уже на витрине</p>
          )}

        {!showSkeleton && hasMore && (
          <div ref={sentinelRef} className="flex h-10 items-center justify-center">
            {isPending && (
              <span className="font-mono text-caps uppercase text-text-muted">Загружаем…</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
