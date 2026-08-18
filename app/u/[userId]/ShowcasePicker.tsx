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
import { ItemThumb } from '@/components/ItemThumb';
import { CaseThumb } from '@/components/CaseThumb';

type ItemsResult = { items: PickerItem[]; hasMore: boolean };
type CasesResult = { cases: PickerCase[]; hasMore: boolean };

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
  const [page, setPage] = useState(0);
  const [itemsResult, setItemsResult] = useState<ItemsResult | null>(null);
  const [casesResult, setCasesResult] = useState<CasesResult | null>(null);
  const [isPending, startTransition] = useTransition();

  // Keyed by "tab:query:page" so switching back to an already-visited
  // tab/page/search combo is instant and never re-requests the same page —
  // and so a background refetch never has to clear what's already on
  // screen while it's in flight.
  const itemsCache = useRef(new Map<string, ItemsResult>());
  const casesCache = useRef(new Map<string, CasesResult>());

  // Mount already off-screen (translate-x-full), then flip to open on the
  // next frame so the transition actually plays instead of the panel just
  // appearing already-open. Closing reverses the same way: slide out first,
  // then unmount via onClose once the transition has had time to finish.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const close = () => {
    setOpen(false);
    setTimeout(onClose, 200);
  };

  const switchTab = (t: 'items' | 'cases') => {
    setTab(t);
    setPage(0);
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setPage(0);
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const key = `${tab}:${debouncedQuery}:${page}`;

    if (tab === 'items') {
      const cached = itemsCache.current.get(key);
      if (cached) {
        startTransition(() => setItemsResult(cached));
        return;
      }
      startTransition(async () => {
        const result = await getInventoryPage(debouncedQuery, page);
        itemsCache.current.set(key, result);
        setItemsResult(result);
      });
    } else {
      const cached = casesCache.current.get(key);
      if (cached) {
        startTransition(() => setCasesResult(cached));
        return;
      }
      startTransition(async () => {
        const result = await getOwnCasesPage(debouncedQuery, page);
        casesCache.current.set(key, result);
        setCasesResult(result);
      });
    }
  }, [tab, debouncedQuery, page]);

  const pick = async (selection: { type: 'item'; inventoryId: string } | { type: 'case'; caseId: string } | null) => {
    await setShowcaseSlot(slotIndex, selection);
    // Deliberately doesn't close — only the × button does. Refreshing
    // updates currentInventoryId/currentCaseId via props, so the "тут"
    // badge moves to the newly picked item without the panel going away.
    router.refresh();
  };

  const items = tab === 'items' ? itemsResult?.items : undefined;
  const cases = tab === 'cases' ? casesResult?.cases : undefined;
  const hasMore = (tab === 'items' ? itemsResult?.hasMore : casesResult?.hasMore) ?? false;
  // Only the very first load of a combo has nothing cached to show yet —
  // background refetches (e.g. after typing) keep the old grid visible.
  const showSkeleton = isPending && (tab === 'items' ? items === undefined : cases === undefined);

  return (
    <div
      className={`relative flex h-full flex-col overflow-hidden rounded-lg border border-line-strong bg-surface-card shadow-2xl transition-transform duration-200 ease-out ${
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
            onClick={() => switchTab(t)}
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
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Поиск по названию"
          className="h-9 w-full rounded-md border border-line-strong bg-inset px-3 text-body outline-none focus:border-gold"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-3.5 [scrollbar-color:var(--color-line-strong)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-line-strong [&::-webkit-scrollbar-track]:bg-transparent">
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
            {(items ?? []).map((item) => (
              <button
                key={item.inventoryId}
                onClick={() => pick({ type: 'item', inventoryId: item.inventoryId })}
                className="group flex flex-col gap-1.5 text-left"
              >
                <div
                  className={`rounded-md ${
                    item.inventoryId === currentInventoryId ? 'ring-2 ring-gold ring-offset-2 ring-offset-surface-card' : ''
                  }`}
                >
                  <ItemThumb imageUrl={item.imageUrl} size="fill" />
                </div>
                <span className="truncate text-caps font-semibold group-hover:text-gold">{item.name}</span>
              </button>
            ))}
          </div>
        )}

        {!showSkeleton && tab === 'cases' && (
          <div className="grid grid-cols-3 gap-2.5">
            {(cases ?? []).map((c) => (
              <button
                key={c.id}
                onClick={() => pick({ type: 'case', caseId: c.id })}
                className="group flex flex-col gap-1.5 text-left"
              >
                <div
                  className={`rounded-md ${
                    c.id === currentCaseId ? 'ring-2 ring-gold ring-offset-2 ring-offset-surface-card' : ''
                  }`}
                >
                  <CaseThumb imageUrl={c.coverImageUrl} size="fill" badge={false} />
                </div>
                <span className="truncate text-caps font-semibold group-hover:text-gold">{c.title}</span>
              </button>
            ))}
          </div>
        )}

        {!showSkeleton &&
          ((tab === 'items' && items?.length === 0) || (tab === 'cases' && cases?.length === 0)) && (
            <p className="p-2 text-center text-body text-text-dim">Ничего не найдено</p>
          )}
      </div>

      {(page > 0 || hasMore) && (
        <div className="flex items-center justify-between border-t border-line-soft p-3">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            className="font-mono text-caps uppercase text-text-secondary disabled:opacity-30"
          >
            ← назад
          </button>
          <span className="font-mono text-caps text-text-dim">стр. {page + 1}</span>
          <button
            disabled={!hasMore}
            onClick={() => setPage((p) => p + 1)}
            className="font-mono text-caps uppercase text-text-secondary disabled:opacity-30"
          >
            вперёд →
          </button>
        </div>
      )}

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
