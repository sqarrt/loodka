export function CurrencyIcon({ size = 13 }: { size?: number }) {
  return (
    <span
      className="inline-block shrink-0 rotate-45 rounded-[2px] bg-gold"
      style={{ width: size, height: size }}
      aria-hidden
    />
  );
}
