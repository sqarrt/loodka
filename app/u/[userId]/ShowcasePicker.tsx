'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setShowcaseSlot } from '@/app/actions/set-showcase-slot';
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

// Renders as a plain panel — no fixed overlay, no backdrop. The caller
// (ProfileTabs) places it as a flex sibling next to the tab content so the
// two share the row; this component only handles its own slide-in reveal.
export function ShowcasePicker({
  slotIndex,
  currentInventoryId,
  currentCaseId,
  onClose,
}: {
  slotIndex: number;
  currentInventoryId: string | null;
  currentCaseId: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Opens on whichever tab matches what's already in the slot (a case ->
  // "Мои кейсы", an item or an empty slot -> "Предметы").
  const [tab, setTab] = useState<'items' | 'cases'>(currentCaseId ? 'cases' : 'items');
  // The panel itself doesn't remount when the targeted slot changes (that
  // would replay the slide-in animation) — but the tab still needs to
  // follow the new slot's content. Adjusting state during render (rather
  // than in an effect) is the React-sanctioned way to do that: it re-runs
  // synchronously before paint, comparing against the last slot we saw.
  const [trackedSlot, setTrackedSlot] = useState(slotIndex);
  if (slotIndex !== trackedSlot) {
    setTrackedSlot(slotIndex);
    setTab(currentCaseId ? 'cases' : 'items');
  }
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [itemsState, setItemsState] = useState<ItemsState>(EMPTY_ITEMS);
  const [casesState, setCasesState] = useState<CasesState>(EMPTY_CASES);
  const [isPending, startTransition] = useTransition();
  const loadingMoreRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Accumulated results, keyed by search query alone (the list keeps
  // growing as more pages load) — so returning to a query you already
  // scrolled through restores where you left off instead of refetching.
  const itemsCache = useRef(new Map<string, ItemsState>());
  const casesCache = useRef(new Map<string, CasesState>());

  // Mount already off-screen (translate-x-full), then flip to open on the
  // next frame so the transition actually plays instead of the panel just
  // appearing already-open. Closing reverses the same way: slide out first,
  // then unmount via onClose once the transition has had time to finish.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Below sm, the picker is a full-screen sheet with its own scroll area —
  // any touch drag that lands outside that area (e.g. the blank space below
  // a short results list) would otherwise fall through to the page behind
  // it, since a bare `overflow-hidden` div doesn't claim the scroll gesture
  // the way `overflow-y-auto` does. Lock body scroll for exactly as long as
  // that's true. Desktop's side panel intentionally leaves the rest of the
  // page scrollable, so this only applies below the sheet breakpoint.
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 639px)');
    const apply = () => {
      document.body.style.overflow = mql.matches ? 'hidden' : '';
    };
    apply();
    mql.addEventListener('change', apply);
    return () => {
      mql.removeEventListener('change', apply);
      document.body.style.overflow = '';
    };
  }, []);

  const close = () => {
    setOpen(false);
    setTimeout(onClose, 200);
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  // Fresh query or tab switch: load page 0 (or restore it from cache).
  useEffect(() => {
    if (tab === 'items') {
      const cached = itemsCache.current.get(debouncedQuery);
      if (cached) {
        startTransition(() => setItemsState(cached));
        return;
      }
      startTransition(async () => {
        const result = await getInventoryPage(debouncedQuery, 0);
        const next: ItemsState = { items: result.items, hasMore: result.hasMore, nextPage: 1 };
        itemsCache.current.set(debouncedQuery, next);
        setItemsState(next);
      });
    } else {
      const cached = casesCache.current.get(debouncedQuery);
      if (cached) {
        startTransition(() => setCasesState(cached));
        return;
      }
      startTransition(async () => {
        const result = await getOwnCasesPage(debouncedQuery, 0);
        const next: CasesState = { cases: result.cases, hasMore: result.hasMore, nextPage: 1 };
        casesCache.current.set(debouncedQuery, next);
        setCasesState(next);
      });
    }
  }, [tab, debouncedQuery]);

  // Scrolling near the bottom of the (internally-scrolling) list appends
  // the next page — root is the scroll container itself, not the viewport,
  // since this list scrolls independently inside a fixed-height panel.
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
            const result = await getInventoryPage(debouncedQuery, itemsState.nextPage);
            setItemsState((prev) => {
              const next: ItemsState = {
                items: [...prev.items, ...result.items],
                hasMore: result.hasMore,
                nextPage: prev.nextPage + 1,
              };
              itemsCache.current.set(debouncedQuery, next);
              return next;
            });
          } else {
            const result = await getOwnCasesPage(debouncedQuery, casesState.nextPage);
            setCasesState((prev) => {
              const next: CasesState = {
                cases: [...prev.cases, ...result.cases],
                hasMore: result.hasMore,
                nextPage: prev.nextPage + 1,
              };
              casesCache.current.set(debouncedQuery, next);
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
  }, [tab, debouncedQuery, itemsState.hasMore, itemsState.nextPage, casesState.hasMore, casesState.nextPage]);

  const pick = async (selection: { type: 'item'; inventoryId: string } | { type: 'case'; caseId: string } | null) => {
    await setShowcaseSlot(slotIndex, selection);
    // Deliberately doesn't close — only the × button does. Refreshing
    // updates currentInventoryId/currentCaseId via props, so the ring
    // highlight moves to the newly picked item without the panel closing.
    router.refresh();
  };

  const items = tab === 'items' ? itemsState.items : [];
  const cases = tab === 'cases' ? casesState.cases : [];
  const hasMore = tab === 'items' ? itemsState.hasMore : casesState.hasMore;
  // Only the very first load of a query has nothing to show yet —
  // background loads (typing, scrolling further) keep the grid visible.
  const showSkeleton = isPending && (tab === 'items' ? items.length === 0 : cases.length === 0);

  return (
    <div
      className={`relative flex h-full flex-col overflow-hidden border-line-strong bg-surface-card shadow-2xl transition-transform duration-200 ease-out sm:rounded-lg sm:border ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <button
        onClick={close}
        className="absolute right-3 top-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-md border border-line bg-surface-card text-text-secondary hover:border-line-strong hover:text-text-primary"
      >
        ×
      </button>

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
        // min-h-0 (not flex-1): sizes to its content, capped by whatever
        // space is actually left in the panel — a short results list no
        // longer force-stretches to fill the rest of the viewport with
        // blank space before "Освободить слот"; a long one still scrolls
        // internally instead of pushing that button off-screen.
        className="min-h-0 overflow-y-auto p-3.5 [scrollbar-color:var(--color-line-strong)_transparent] [scrollbar-gutter:stable] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-line-strong [&::-webkit-scrollbar-track]:bg-transparent"
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
              <button
                key={item.inventoryId}
                onClick={() => pick({ type: 'item', inventoryId: item.inventoryId })}
                className="text-left"
              >
                <div
                  className={`rounded-md ${
                    item.inventoryId === currentInventoryId ? 'ring-2 ring-gold ring-offset-2 ring-offset-surface-card' : ''
                  }`}
                >
                  <ItemCard name={item.name} imageUrl={item.imageUrl} probability={item.probability} size="fill" />
                </div>
              </button>
            ))}
          </div>
        )}

        {!showSkeleton && tab === 'cases' && (
          <div className="grid grid-cols-3 gap-2.5">
            {cases.map((c) => (
              <button
                key={c.id}
                onClick={() => pick({ type: 'case', caseId: c.id })}
                className="text-left"
              >
                <div
                  className={`rounded-md ${
                    c.id === currentCaseId ? 'ring-2 ring-gold ring-offset-2 ring-offset-surface-card' : ''
                  }`}
                >
                  <CaseCard caseId={c.id} title={c.title} coverImageUrl={c.coverImageUrl} size="fill" linked={false} />
                </div>
              </button>
            ))}
          </div>
        )}

        {!showSkeleton &&
          ((tab === 'items' && items.length === 0) || (tab === 'cases' && cases.length === 0)) && (
            <p className="p-2 text-center text-body text-text-dim">Ничего не найдено</p>
          )}

        {!showSkeleton && hasMore && (
          <div ref={sentinelRef} className="flex h-10 items-center justify-center">
            {isPending && (
              <span className="font-mono text-caps uppercase text-text-muted">Загружаем…</span>
            )}
          </div>
        )}
      </div>

      {(currentInventoryId || currentCaseId) && (
        <button
          onClick={() => pick(null)}
          className="border-t border-line p-3.5 text-center text-label text-text-secondary hover:text-danger"
        >
          Освободить слот
        </button>
      )}
    </div>
  );
}
