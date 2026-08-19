import Link from 'next/link';
import { CaseThumb } from '@/components/CaseThumb';
import { CurrencyIcon } from '@/components/CurrencyIcon';
import { RARITY_INFO, type RarityTier } from '@/lib/rarity';

const CARD_WIDTH = {
  lg: 'w-44',
  md: 'w-37',
  sm: 'w-30',
  xs: 'w-21',
  fill: 'w-full',
} as const;

export function CaseCard({
  caseId,
  title,
  coverImageUrl,
  itemCount,
  price,
  topRarity,
  authorId,
  authorName,
  createdAt,
  size = 'md',
  linked = true,
  editable = false,
}: {
  caseId: string;
  title: string;
  coverImageUrl?: string | null;
  itemCount?: number;
  price?: number;
  topRarity?: RarityTier;
  authorId?: string | null;
  authorName?: string | null;
  createdAt?: string | null;
  size?: 'lg' | 'md' | 'sm' | 'xs' | 'fill';
  /** false when a wrapping click handler (picker button, showcase-slot div)
   * already owns navigation — the card then renders no internal links at all. */
  linked?: boolean;
  /** whoever's looking at this can edit the case — shows a pencil in the corner. */
  editable?: boolean;
}) {
  const accent = topRarity ? RARITY_INFO[topRarity].colorVar : 'var(--color-line)';
  const created = createdAt
    ? new Date(createdAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })
    : null;

  const cover = (
    <CaseThumb imageUrl={coverImageUrl} size="fill" glow={topRarity ? RARITY_INFO[topRarity].glow : undefined}>
      {coverImageUrl && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
      )}
      {topRarity && (
        // max-w leaves room for the edit pencil (top-right, ~54px incl. its
        // own margin) so the two never overlap on narrow cards — the badge
        // truncates with an ellipsis instead of running under the button.
        <span
          className={`absolute left-2.5 top-2.5 z-20 inline-flex items-center gap-1.5 overflow-hidden rounded-full border bg-bg/70 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.08em] ${
            editable ? 'max-w-[calc(100%-64px)]' : 'max-w-[calc(100%-20px)]'
          }`}
          style={{ borderColor: accent, color: accent }}
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: accent }} />
          <span className="truncate">топ: {RARITY_INFO[topRarity].name.toLowerCase()}</span>
        </span>
      )}
    </CaseThumb>
  );

  const nameBlock = (
    <div className="min-h-[2.5em] font-display text-label uppercase leading-[1.25] break-words">{title}</div>
  );

  const authorBlock = authorName ? (
    <span className="min-w-0 flex-1 truncate font-mono text-label text-text-secondary">@{authorName}</span>
  ) : null;

  return (
    <div
      className={`relative isolate flex flex-col ${CARD_WIDTH[size]} overflow-hidden rounded-md border bg-surface-card`}
      style={{ borderColor: accent }}
    >
      {editable && (
        <Link
          href={`/case/${caseId}/edit`}
          aria-label="Редактировать кейс"
          className="absolute right-2.5 top-2.5 z-30 flex h-7 w-7 items-center justify-center rounded-full border border-line-strong bg-bg/70 text-text-secondary hover:border-gold hover:text-gold"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M4 20h4l10.5-10.5a2.121 2.121 0 0 0-3-3L5 17v3Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      )}
      {linked ? (
        <Link href={`/case/${caseId}`} className="contents">
          {cover}
        </Link>
      ) : (
        cover
      )}
      <div className="flex flex-1 flex-col gap-2 p-3">
        {linked ? (
          <Link href={`/case/${caseId}`} className="contents hover:text-gold">
            {nameBlock}
          </Link>
        ) : (
          nameBlock
        )}
        {(itemCount !== undefined || created) && (
          <div className="font-mono text-[10.5px] uppercase text-text-muted">
            {itemCount !== undefined && <>{itemCount} предметов</>}
            {itemCount !== undefined && created && ' · '}
            {created}
          </div>
        )}
        {(authorBlock || price !== undefined) && (
          <div className="mt-auto flex items-center gap-2 border-t border-line-soft pt-2.5">
            {linked && authorId && authorName ? (
              <Link
                href={`/u/${authorId}`}
                className="min-w-0 flex-1 truncate font-mono text-label text-text-secondary hover:text-gold hover:underline"
              >
                @{authorName}
              </Link>
            ) : (
              authorBlock ?? <span />
            )}
            {price !== undefined && (
              <span className="ml-auto flex shrink-0 items-center gap-1.5 font-mono font-bold text-body text-text-primary">
                <CurrencyIcon size={13} /> {price}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="h-[3px]" style={{ background: accent }} />
    </div>
  );
}
