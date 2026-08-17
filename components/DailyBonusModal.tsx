'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CurrencyIcon } from '@/components/CurrencyIcon';
import { progressForSpend } from '@/lib/xp';

export function DailyBonusModal({ amount, totalSpent }: { amount: number; totalSpent: number }) {
  const [open, setOpen] = useState(true);
  const router = useRouter();

  if (!open) return null;

  const close = () => {
    setOpen(false);
    // The balance already changed server-side when this modal was shown —
    // refresh so the header's balance pill picks it up without the user
    // needing a manual page reload.
    router.refresh();
  };

  const { level, intoLevel, forLevel, fraction } = progressForSpend(totalSpent);

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-bg/80 p-7" onClick={close}>
      <div
        className="flex w-full max-w-[380px] flex-col items-center gap-4 rounded-lg border border-gold bg-surface-card p-8 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/10">
          <CurrencyIcon size={28} />
        </span>
        <div className="flex flex-col gap-1">
          <span className="font-mono text-caps uppercase text-gold">ежедневный бонус</span>
          <span className="font-display text-heading uppercase">+{amount} лудок</span>
        </div>
        <p className="text-body text-text-secondary">
          Заходи каждый день — бонус начисляется раз в сутки.
        </p>
        <div className="flex w-full flex-col gap-1.5">
          <div className="flex items-center justify-between font-mono text-caps text-text-muted">
            <span>уровень {level}</span>
            <span>
              {intoLevel} / {Math.round(forLevel)}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-inset">
            <div
              className="h-full rounded-full bg-gold"
              style={{ width: `${Math.min(fraction, 1) * 100}%` }}
            />
          </div>
        </div>
        <button
          onClick={close}
          className="flex h-11 w-full items-center justify-center rounded-md bg-gold px-6 font-display text-label uppercase text-bg hover:bg-gold-hover"
        >
          Забрать
        </button>
      </div>
    </div>
  );
}
