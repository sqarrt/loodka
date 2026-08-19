import type { ReactNode } from 'react';

const SIZE_CLASSES = {
  lg: 'w-44 h-44',
  md: 'w-37 h-37',
  sm: 'w-30 h-30',
  xs: 'w-21 h-21',
  fill: 'aspect-square w-full',
} as const;

// standalone: today's look, used bare (edit forms) — full border, all
// corners rounded. card: sits flush atop a card body (ItemCard) — rounded
// top only, no bottom border, so the card's own border continues it.
// cover: full-bleed, no border/radius of its own — clipped by the outer
// card that contains it (CaseCard's cover).
const VARIANT_CLASSES = {
  standalone: 'rounded-md border',
  card: 'rounded-t-md border border-b-0',
  cover: '',
} as const;

export function ItemThumb({
  imageUrl,
  size,
  rarityColor,
  variant = 'standalone',
  glow,
  description,
  children,
}: {
  imageUrl?: string | null;
  size: keyof typeof SIZE_CLASSES;
  rarityColor?: string;
  variant?: keyof typeof VARIANT_CLASSES;
  /** 0–1 rarity-wash intensity behind the image. Omitted = no wash. */
  glow?: number;
  /** When given, hovering (or focusing) the thumb swaps the image for this text. */
  description?: string | null;
  children?: ReactNode;
}) {
  return (
    <div
      tabIndex={description ? 0 : undefined}
      className={`group relative isolate flex shrink-0 items-center justify-center overflow-hidden bg-surface-raised bg-[repeating-linear-gradient(135deg,var(--color-surface-raised)_0_8px,var(--color-line)_8px_16px)] outline-none ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]}`}
      style={variant === 'cover' ? undefined : { borderColor: rarityColor ?? 'var(--color-line)' }}
    >
      {!!glow && (
        <div
          className="pointer-events-none absolute -inset-[30%] z-0"
          style={{
            background: `radial-gradient(circle at 50% 42%, ${rarityColor ?? 'transparent'} 0%, transparent 62%)`,
            opacity: glow,
          }}
        />
      )}
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="relative z-10 h-full w-full object-cover" />
      )}
      {description && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-surface-raised p-3 text-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <p className="text-mono-num text-text-secondary before:content-['\201C'] after:content-['\201D']">
            {description}
          </p>
        </div>
      )}
      {children}
    </div>
  );
}
