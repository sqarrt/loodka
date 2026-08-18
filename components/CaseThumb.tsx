import { ItemThumb } from '@/components/ItemThumb';

// Square case-cover art, sharing ItemThumb's sizing/fallback-pattern
// treatment. Case slots visually looked identical to item slots on the
// showcase, so this always renders a small "кейс" corner badge to tell them
// apart at a glance — pass badge={false} where the surrounding context
// already makes it obvious (e.g. the catalog, which is cases-only).
export function CaseThumb({
  imageUrl,
  size,
  badge = true,
}: {
  imageUrl?: string | null;
  size: 'lg' | 'md' | 'sm' | 'xs' | 'fill';
  badge?: boolean;
}) {
  return (
    <ItemThumb imageUrl={imageUrl} size={size}>
      {badge && (
        <span className="absolute left-1 top-1 z-1 rounded-full border border-gold/50 bg-bg/80 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wide text-gold">
          кейс
        </span>
      )}
    </ItemThumb>
  );
}
