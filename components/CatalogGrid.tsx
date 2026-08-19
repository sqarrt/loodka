'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
import { loadMoreCases } from '@/app/actions/load-more-cases';
import { CaseCard } from '@/components/CaseCard';
import type { CatalogCase, CatalogFilters } from '@/lib/catalog';

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
          />
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
