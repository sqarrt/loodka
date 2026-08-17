import { getRarityTier, RARITY_INFO } from '@/lib/rarity';

const SIZE_CLASSES = {
  lg: { card: 'w-44', art: 'h-30', imgPad: 'p-3' }, // 176px / 120px
  md: { card: 'w-37', art: 'h-26', imgPad: 'p-2' }, // 148px / 106px
  sm: { card: 'w-30', art: 'h-22', imgPad: 'p-1.5' }, // 120px / 90px
} as const;

export function ItemCard({
  name,
  imageUrl,
  probability,
  size = 'md',
  state = 'default',
}: {
  name: string;
  imageUrl?: string;
  probability?: number;
  size?: 'lg' | 'md' | 'sm';
  state?: 'default' | 'loading' | 'disabled';
}) {
  const tier = probability !== undefined ? getRarityTier(probability) : 'common';
  const info = RARITY_INFO[tier];
  const { card, art, imgPad } = SIZE_CLASSES[size];

  if (state === 'loading') {
    return (
      <div className={`${card} overflow-hidden rounded-md border border-line bg-surface-card`}>
        <div className={`${art} relative overflow-hidden bg-surface-raised`}>
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
      className={`${card} overflow-hidden rounded-md border bg-surface-card transition-transform hover:-translate-y-0.5 ${
        state === 'disabled' ? 'opacity-40 saturate-[0.2]' : ''
      }`}
      style={{ borderColor: info.colorVar }}
    >
      <div
        className={`${art} flex items-center justify-center bg-surface-raised bg-[repeating-linear-gradient(135deg,var(--color-surface-raised)_0_8px,var(--color-line)_8px_16px)]`}
      >
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={name} className={`h-full w-full object-cover ${imgPad}`} />
        )}
      </div>
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
  );
}
