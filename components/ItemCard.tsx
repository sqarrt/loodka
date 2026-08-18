'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getRarityTier, RARITY_INFO } from '@/lib/rarity';
import { ItemThumb } from '@/components/ItemThumb';

const CARD_WIDTH = {
  lg: 'w-44', // 176px
  md: 'w-37', // 148px
  sm: 'w-30', // 120px
} as const;

const SIZE_CLASSES_PX = { lg: 'w-44 h-44', md: 'w-37 h-37', sm: 'w-30 h-30' } as const;

export function ItemCard({
  name,
  imageUrl,
  probability,
  description,
  caseId,
  caseTitle,
  authorId,
  authorName,
  size = 'md',
  state = 'default',
}: {
  name: string;
  imageUrl?: string;
  probability?: number;
  description?: string | null;
  caseId?: string | null;
  caseTitle?: string | null;
  authorId?: string | null;
  authorName?: string | null;
  size?: 'lg' | 'md' | 'sm';
  state?: 'default' | 'loading' | 'disabled';
}) {
  const [hovered, setHovered] = useState(false);
  const tier = probability !== undefined ? getRarityTier(probability) : 'common';
  const info = RARITY_INFO[tier];

  if (state === 'loading') {
    return (
      <div className={`${CARD_WIDTH[size]} overflow-hidden rounded-md border border-line bg-surface-card`}>
        <div className={`${SIZE_CLASSES_PX[size]} relative overflow-hidden bg-surface-raised`}>
          <div className="absolute inset-0 w-3/5 animate-[lk-sheen_1.4s_linear_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>
        <div className="flex flex-col gap-2 p-3">
          <div className="h-3 w-3/4 rounded bg-surface-raised" />
        </div>
        <div className="h-[3px] bg-line" />
      </div>
    );
  }

  return (
    // The card's own border needs overflow-hidden (rounded corners, clipped
    // image) but that would also clip a tooltip popping out above it — so
    // the tooltip lives in this unclipped relative wrapper instead, as a
    // sibling of the clipped card body, not a child of it.
    <div className="relative" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div
        className={`${CARD_WIDTH[size]} overflow-hidden rounded-md border bg-surface-card transition-transform hover:-translate-y-0.5 ${
          state === 'disabled' ? 'opacity-40 saturate-[0.2]' : ''
        }`}
        style={{ borderColor: info.colorVar }}
      >
        <ItemThumb imageUrl={imageUrl} size={size} rarityColor={info.colorVar} />
        <div className="flex flex-col gap-1.5 p-3">
          <div className="truncate text-label font-semibold">{name}</div>
          {probability !== undefined && (
            <div className="flex items-center justify-between text-mono-num font-mono">
              <span style={{ color: info.colorVar }}>{info.name}</span>
              <span>{(probability * 100).toFixed(probability < 0.1 ? 1 : 0)}%</span>
            </div>
          )}
        </div>
        <div className="h-[3px]" style={{ background: info.colorVar }} />
      </div>
      {caseId && authorId && (
        <div className="mt-1 flex flex-col gap-0.5 truncate font-mono text-[10px] text-text-dim">
          {caseTitle && (
            <Link href={`/case/${caseId}`} className="truncate hover:text-text-secondary hover:underline">
              {caseTitle}
            </Link>
          )}
          {authorName && (
            <Link href={`/u/${authorId}`} className="truncate hover:text-text-secondary hover:underline">
              @{authorName}
            </Link>
          )}
        </div>
      )}
      {hovered && description && (
        <div className="absolute bottom-[calc(100%+8px)] left-1/2 z-10 w-48 -translate-x-1/2 rounded-md border border-gold/40 bg-surface-card p-2.5 text-center text-mono-num text-text-secondary shadow-2xl">
          {description}
          <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-gold/40 bg-surface-card" />
        </div>
      )}
    </div>
  );
}
