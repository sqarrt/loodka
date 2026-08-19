import type { ReactNode } from 'react';
import { ItemThumb } from '@/components/ItemThumb';

// Full-bleed case-cover art — no border/radius of its own, clipped by the
// outer CaseCard's own border + overflow-hidden. This is now only ever used
// nested inside CaseCard, which already makes "this is a case" obvious via
// its body (item count, top-rarity badge), so no disambiguation badge here.
// children render inside the same relatively-positioned box (scrim, badge).
export function CaseThumb({
  imageUrl,
  size,
  glow,
  children,
}: {
  imageUrl?: string | null;
  size: 'lg' | 'md' | 'sm' | 'xs' | 'fill';
  glow?: number;
  children?: ReactNode;
}) {
  return (
    <ItemThumb imageUrl={imageUrl} size={size} variant="cover" glow={glow}>
      {children}
    </ItemThumb>
  );
}
