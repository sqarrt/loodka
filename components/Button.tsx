import type { ButtonHTMLAttributes } from 'react';

type Variant = 'cta' | 'demo' | 'disabled' | 'loading';

const VARIANT_CLASSES: Record<Variant, string> = {
  cta: 'bg-gold text-bg hover:bg-gold-hover hover:-translate-y-px active:bg-gold-active active:translate-y-px',
  demo: 'border border-gold text-gold bg-transparent hover:bg-gold/10',
  disabled: 'bg-surface-raised border border-line text-text-muted cursor-not-allowed',
  loading: 'bg-gold-active text-bg relative overflow-hidden cursor-wait',
};

export function Button({
  variant = 'cta',
  className = '',
  children,
  ...props
}: { variant?: Variant } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`flex h-16 items-center justify-center gap-3 rounded-lg px-8 font-display text-lg uppercase transition-colors ${VARIANT_CLASSES[variant]} ${className}`}
      disabled={variant === 'disabled' || variant === 'loading'}
      {...props}
    >
      {variant === 'loading' && (
        <span className="absolute inset-0 w-[45%] animate-[lk-sheen_1.1s_linear_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      )}
      <span className="relative">{children}</span>
    </button>
  );
}
