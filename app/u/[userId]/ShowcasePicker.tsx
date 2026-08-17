'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setShowcaseSlot } from '@/app/actions/set-showcase-slot';
import {
  getInventoryPage,
  getOwnCasesPage,
  type PickerItem,
  type PickerCase,
} from '@/app/actions/showcase-picker-data';
import { ItemThumb } from '@/components/ItemThumb';

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
  const [tab, setTab] = useState<'items' | 'cases'>('items');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<PickerItem[]>([]);
  const [cases, setCases] = useState<PickerCase[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isPending, startTransition] = useTransition();

  const switchTab = (t: 'items' | 'cases') => {
    setTab(t);
    setPage(0);
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setPage(0);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(async () => {
        if (tab === 'items') {
          const result = await getInventoryPage(query, page);
          setItems(result.items);
          setHasMore(result.hasMore);
        } else {
          const result = await getOwnCasesPage(query, page);
          setCases(result.cases);
          setHasMore(result.hasMore);
        }
      });
    }, 200);
    return () => clearTimeout(timer);
  }, [tab, query, page]);

  const pick = async (selection: { type: 'item'; inventoryId: string } | { type: 'case'; caseId: string } | null) => {
    await setShowcaseSlot(slotIndex, selection);
    router.refresh();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-bg/80 p-7" onClick={onClose}>
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

        <div className="flex gap-4 border-b border-line-soft px-4 pt-3">
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

        <div className="flex flex-col gap-2 overflow-auto p-3.5">
          {isPending && <p className="p-2 text-center text-body text-text-dim">Загружаем…</p>}
          {!isPending &&
            tab === 'items' &&
            items.map((item) => (
              <button
                key={item.inventoryId}
                onClick={() => pick({ type: 'item', inventoryId: item.inventoryId })}
                className="flex items-center gap-3 rounded-md border border-line bg-inset p-2.5 text-left hover:border-line-strong hover:bg-surface-raised"
              >
                <ItemThumb imageUrl={item.imageUrl} size="xs" />
                <span className="text-label font-semibold">{item.name}</span>
                {item.inventoryId === currentInventoryId && (
                  <span className="ml-auto rounded-full border border-line px-2 py-1 font-mono text-[9px] uppercase text-text-muted">
                    уже в витрине
                  </span>
                )}
              </button>
            ))}
          {!isPending &&
            tab === 'cases' &&
            cases.map((c) => (
              <button
                key={c.id}
                onClick={() => pick({ type: 'case', caseId: c.id })}
                className="flex items-center gap-3 rounded-md border border-line bg-inset p-2.5 text-left hover:border-line-strong hover:bg-surface-raised"
              >
                <span className="text-label font-semibold">{c.title}</span>
                <span className="font-mono text-caps text-text-dim">{c.itemCount} предметов</span>
                {c.id === currentCaseId && (
                  <span className="ml-auto rounded-full border border-line px-2 py-1 font-mono text-[9px] uppercase text-text-muted">
                    уже в витрине
                  </span>
                )}
              </button>
            ))}
          {!isPending && ((tab === 'items' && items.length === 0) || (tab === 'cases' && cases.length === 0)) && (
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
    </div>
  );
}
