import type { ReactNode } from 'react';

const SIZE_CLASSES = {
  lg: 'w-44 h-44',
  md: 'w-37 h-37',
  sm: 'w-30 h-30',
  xs: 'w-21 h-21',
  fill: 'aspect-square w-full',
} as const;

export function ItemThumb({
  imageUrl,
  size,
  rarityColor,
  children,
}: {
  imageUrl?: string | null;
  size: keyof typeof SIZE_CLASSES;
  rarityColor?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-md border bg-surface-raised bg-[repeating-linear-gradient(135deg,var(--color-surface-raised)_0_8px,var(--color-line)_8px_16px)] ${SIZE_CLASSES[size]}`}
      style={{ borderColor: rarityColor ?? 'var(--color-line)' }}
    >
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      )}
      {children}
    </div>
  );
}
