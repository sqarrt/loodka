import { CaseThumb } from '@/components/CaseThumb';
import { CurrencyIcon } from '@/components/CurrencyIcon';

const CARD_WIDTH = {
  lg: 'w-44',
  md: 'w-37',
  sm: 'w-30',
  xs: 'w-21',
  fill: 'w-full',
} as const;

export function CaseCard({
  title,
  coverImageUrl,
  itemCount,
  price,
  badge = false,
  size = 'md',
}: {
  title: string;
  coverImageUrl?: string | null;
  itemCount?: number;
  price?: number;
  badge?: boolean;
  size?: 'lg' | 'md' | 'sm' | 'xs' | 'fill';
}) {
  return (
    <div className={`${CARD_WIDTH[size]} overflow-hidden rounded-md border border-line bg-surface-card`}>
      <CaseThumb imageUrl={coverImageUrl} size={size} badge={badge} />
      <div className="flex flex-col gap-1.5 p-3">
        <div className="truncate text-label font-semibold">{title}</div>
        {(itemCount !== undefined || price !== undefined) && (
          <div className="flex items-center justify-between text-mono-num font-mono">
            {itemCount !== undefined && <span className="text-text-muted">{itemCount} предметов</span>}
            {price !== undefined && (
              <span className="ml-auto flex items-center gap-1 font-bold text-text-primary">
                <CurrencyIcon size={11} /> {price}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
