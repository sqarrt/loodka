import Link from 'next/link';
import { getRarityTier, RARITY_INFO, formatProbabilityPercent } from '@/lib/rarity';
import { formatLudki } from '@/lib/currency';
import { ItemThumb } from '@/components/ItemThumb';
import { CurrencyIcon } from '@/components/CurrencyIcon';

const CARD_WIDTH = {
  lg: 'w-44', // 176px
  md: 'w-37', // 148px
  sm: 'w-30', // 120px
  fill: 'w-full',
} as const;

const SIZE_CLASSES_PX = {
  lg: 'w-44 h-44',
  md: 'w-37 h-37',
  sm: 'w-30 h-30',
  fill: 'w-full aspect-square',
} as const;

export function ItemCard({
  name,
  imageUrl,
  probability,
  description,
  caseId,
  caseTitle,
  authorId,
  authorName,
  cashbackValue,
  onSell,
  selling = false,
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
  /** What this item would sell for — only meaningful for something actually
   * sitting in someone's inventory, so most callers leave it unset. */
  cashbackValue?: number;
  /** Renders a sell button when given. Pass alongside cashbackValue, and
   * only from the owner's own inventory view. */
  onSell?: () => void;
  selling?: boolean;
  size?: 'lg' | 'md' | 'sm' | 'fill';
  state?: 'default' | 'loading' | 'disabled';
}) {
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
    <div
      className={`flex flex-col ${CARD_WIDTH[size]} overflow-hidden rounded-md border bg-surface-card ${
        state === 'disabled' ? 'opacity-40 saturate-[0.2]' : ''
      }`}
      style={{ borderColor: info.colorVar }}
    >
      <ItemThumb
        imageUrl={imageUrl}
        size={size}
        rarityColor={info.colorVar}
        variant="card"
        glow={info.glow}
        description={description}
      />
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        {probability !== undefined && (
          <div className="flex items-center justify-between text-mono-num font-mono">
            <span style={{ color: info.colorVar }}>{info.name}</span>
            <span>{formatProbabilityPercent(probability)}</span>
          </div>
        )}
        <div className="min-h-[2.5em] font-semibold leading-[1.25] text-label break-words">{name}</div>
        {(cashbackValue !== undefined || (caseId && authorId)) && (
          // stopPropagation — this card may be nested inside a clickable
          // showcase-slot wrapper (open the picker on click); these links
          // must navigate instead of triggering that. Single row, not a
          // stack — a sell button here must not grow the card taller than
          // every other card in the same grid.
          <div
            className="mt-auto flex items-center justify-between gap-2 border-t border-line-soft pt-2 font-mono text-[10px] text-text-dim"
            onClick={(e) => e.stopPropagation()}
          >
            {caseId && authorId && (
              <div className="flex min-w-0 flex-col gap-0.5 truncate">
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
            {cashbackValue !== undefined && onSell && (
              <button
                type="button"
                onClick={onSell}
                disabled={selling}
                className="flex h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-md border border-[#2E4A3E] bg-[#122019] px-2 font-mono text-[10px] font-bold uppercase text-success hover:border-success hover:bg-[#16281F] disabled:opacity-50"
              >
                {selling ? (
                  'продаём…'
                ) : (
                  <>
                    продать за {formatLudki(cashbackValue)} <CurrencyIcon size={9} />
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
      <div className="h-[3px]" style={{ background: info.colorVar }} />
    </div>
  );
}
