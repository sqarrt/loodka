export function CurrencyIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="inline-block shrink-0">
      <rect
        x="4.5"
        y="4.5"
        width="15"
        height="15"
        rx="3"
        transform="rotate(45 12 12)"
        fill="var(--color-gold)"
        stroke="var(--color-bg)"
        strokeWidth="1.5"
      />
      <path d="M9.5 7h2.6v8h4.4v2.4H9.5V7Z" fill="var(--color-bg)" />
    </svg>
  );
}
