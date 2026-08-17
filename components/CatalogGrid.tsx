'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
import { loadMoreCases } from '@/app/actions/load-more-cases';
import { RARITY_INFO } from '@/lib/rarity';
import { CurrencyIcon } from '@/components/CurrencyIcon';
import type { CatalogCase, CatalogFilters } from '@/lib/catalog';

function CaseCard({ c }: { c: CatalogCase }) {
  const accent = RARITY_INFO[c.topRarity].colorVar;
  const created = new Date(c.createdAt).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });

  return (
    <a
      href={`/case/${c.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-line bg-surface-card transition-all hover:-translate-y-0.5 hover:border-line-strong hover:bg-surface-raised"
    >
      <div
        className="relative flex h-[110px] items-end bg-[repeating-linear-gradient(135deg,var(--color-surface-raised)_0_8px,var(--color-line)_8px_16px)] p-2.5"
      >
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-14 opacity-20"
          style={{ background: `linear-gradient(to top, ${accent}, transparent)` }}
        />
        <span
          className="relative rounded-full border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em]"
          style={{ borderColor: accent, color: accent }}
        >
          топ: {RARITY_INFO[c.topRarity].name.toLowerCase()}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-3.5">
        <div className="flex flex-col gap-1">
          <span className="truncate font-display text-label uppercase leading-tight">{c.title}</span>
          <span className="truncate font-mono text-[10px] text-text-dim">
            @{c.authorName} · {c.itemCount} предметов · {created}
          </span>
        </div>
        <div className="mt-auto flex items-center justify-between">
          <span className="flex items-center gap-2 font-mono text-body font-bold">
            <CurrencyIcon size={13} /> {c.price}
          </span>
          <span className="flex h-8 items-center rounded-md border border-gold px-3 font-mono text-[11px] uppercase tracking-[0.08em] text-gold group-hover:bg-gold/10">
            крутить
          </span>
        </div>
      </div>
      <div className="h-[3px]" style={{ background: accent }} />
    </a>
  );
}

export function CatalogGrid({
  initialCases,
  initialCursor,
  filters,
}: {
  initialCases: CatalogCase[];
  initialCursor: string | null;
  filters: CatalogFilters;
}) {
  const [cases, setCases] = useState(initialCases);
  const [cursor, setCursor] = useState(initialCursor);
  const [isPending, startTransition] = useTransition();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !cursor) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingRef.current) {
          loadingRef.current = true;
          startTransition(async () => {
            const result = await loadMoreCases(filters, cursor);
            setCases((prev) => [...prev, ...result.cases]);
            setCursor(result.nextCursor);
            loadingRef.current = false;
          });
        }
      },
      { rootMargin: '600px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [cursor, filters]);

  if (cases.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line-strong bg-inset p-9 text-center">
        <span className="h-4 w-4 rotate-45 rounded-[2px] border border-line-strong" />
        <span className="font-display text-label uppercase">Ничего не нашлось</span>
        <Link
          href="/"
          className="font-mono text-caps uppercase tracking-[0.08em] text-gold hover:text-gold-hover"
        >
          сбросить фильтры
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {cases.map((c) => (
          <CaseCard key={c.id} c={c} />
        ))}
      </div>
      {cursor && (
        <div ref={sentinelRef} className="flex h-11 items-center justify-center">
          {isPending && (
            <span className="font-mono text-caps uppercase tracking-[0.08em] text-text-muted">
              Загружаем…
            </span>
          )}
        </div>
      )}
    </div>
  );
}
