'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  pickWeightedRandom,
  buildReelStrip,
  REEL_WINNER_INDEX,
  CARD_PITCH_PX,
  CARD_WIDTH_PX,
} from '@/lib/cases';
import { openCaseForReal } from '@/app/actions/open-case-for-real';
import { ItemCard } from '@/components/ItemCard';
import { Button } from '@/components/Button';
import { CurrencyIcon } from '@/components/CurrencyIcon';

type ItemWithImage = {
  id: string;
  name: string;
  imageUrl: string;
  weight: number;
  probability: number;
};

const SPIN_DURATION_MS = 6200;
// Enough to keep cards filling the track left of the marker at rest too,
// not just after a spin — the marker sits at the horizontal center, and
// the strip's own left edge starts there, so anything less leaves a
// visible empty gap to the left before the first spin.
const IDLE_OFFSET_PX = 5 * CARD_PITCH_PX;

export function CaseOpener({
  caseId,
  items,
  price,
  canOpenReal,
  initialBalance,
}: {
  caseId: string;
  items: ItemWithImage[];
  price: number;
  canOpenReal: boolean;
  initialBalance: number | null;
}) {
  const [strip, setStrip] = useState<ItemWithImage[]>(() =>
    buildReelStrip(items, items[0])
  );
  const [offset, setOffset] = useState(IDLE_OFFSET_PX);
  const [transitioning, setTransitioning] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'result'>('idle');
  const [result, setResult] = useState<ItemWithImage | null>(null);
  const [balance, setBalance] = useState(initialBalance);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const animateTo = (winner: ItemWithImage) => {
    const reel = buildReelStrip(items, winner);
    const jitter = (Math.random() - 0.5) * 76;
    // +CARD_WIDTH_PX/2 centers the winner card under the fixed marker;
    // without it the marker aligns to the card's left edge instead, so
    // jitter alone could land it in the gap before the previous card.
    const target = REEL_WINNER_INDEX * CARD_PITCH_PX + CARD_WIDTH_PX / 2 + jitter;

    // Reset must land in its own paint with the transition off, or the
    // browser animates the reset itself instead of the spin (only visible
    // from the 2nd spin on, once offset/phase are no longer both at rest).
    setResult(null);
    setStrip(reel);
    setTransitioning(false);
    setOffset(0);
    setPhase('spinning');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTransitioning(true);
        setOffset(target);
      });
    });
    window.setTimeout(() => {
      setPhase('result');
      setResult(winner);
    }, SPIN_DURATION_MS + 50);
  };

  const handleDemoOpen = () => {
    if (phase === 'spinning') return;
    animateTo(pickWeightedRandom(items));
  };

  const handleRealOpen = async () => {
    if (phase === 'spinning') return;
    setError(null);
    setPhase('spinning');
    const response = await openCaseForReal(caseId);

    if (response.error) {
      setPhase('idle');
      setError(response.error);
      return;
    }

    const winner = items.find((item) => item.id === response.itemId);
    setBalance(response.newBalance ?? balance);
    router.refresh();
    if (winner) animateTo(winner);
  };

  const insufficientFunds = canOpenReal && (balance ?? 0) < price;

  return (
    <div className="flex flex-col gap-6">
      <div
        className="relative overflow-hidden rounded-lg border border-line bg-[#08090D] py-3"
        style={{ opacity: phase === 'spinning' ? 1 : phase === 'result' ? 0.55 : 0.82 }}
      >
        <div className="pointer-events-none absolute inset-y-0 left-0 z-3 w-[110px] bg-gradient-to-r from-[#08090D] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-3 w-[110px] bg-gradient-to-l from-[#08090D] to-transparent" />
        <div className="absolute inset-y-0 left-1/2 z-4 w-0.5 -translate-x-1/2 bg-gold shadow-[0_0_16px_2px_rgba(245,197,66,0.53)]" />
        <div className="absolute -top-[5px] left-1/2 z-5 h-[11px] w-[11px] -translate-x-1/2 rotate-45 rounded-[2px] bg-gold" />
        <div className="absolute -bottom-[5px] left-1/2 z-5 h-[11px] w-[11px] -translate-x-1/2 rotate-45 rounded-[2px] bg-gold" />
        <div className="relative h-[150px]">
          <div
            className="absolute left-1/2 top-0 flex gap-3 will-change-transform"
            style={{
              transform: `translateX(-${offset}px)`,
              transition: transitioning
                ? `transform ${SPIN_DURATION_MS}ms cubic-bezier(.08,.72,.02,1)`
                : 'none',
            }}
          >
            {strip.map((item, i) => (
              <ItemCard key={i} name={item.name} imageUrl={item.imageUrl} size="sm" />
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        {canOpenReal ? (
          <Button
            variant={phase === 'spinning' ? 'loading' : insufficientFunds ? 'disabled' : 'cta'}
            onClick={handleRealOpen}
            className="min-w-[340px]"
          >
            {phase === 'spinning' ? (
              'Крутим…'
            ) : insufficientFunds ? (
              <span className="flex flex-col items-center gap-0.5 normal-case">
                <span className="uppercase">Не хватает лудок</span>
                <span className="font-mono text-caps normal-case">
                  нужно ещё {price - (balance ?? 0)} · баланс {balance ?? 0}
                </span>
              </span>
            ) : (
              <>
                Открыть за <CurrencyIcon size={15} /> {price}
              </>
            )}
          </Button>
        ) : (
          <Button
            variant={phase === 'spinning' ? 'loading' : 'demo'}
            onClick={handleDemoOpen}
            className="min-w-[340px]"
          >
            {phase === 'spinning' ? 'Крутим…' : 'Открыть (демо)'}
          </Button>
        )}
        <span className="font-mono text-caps text-text-dim">
          {canOpenReal
            ? `баланс ${balance ?? 0}`
            : 'демо не списывает лудки и не даёт предмет'}
        </span>
        {error && (
          <p role="alert" className="text-caps font-mono text-danger">
            {error}
          </p>
        )}
      </div>

      {phase === 'result' && result && (
        <div
          className="flex items-center gap-6 rounded-lg border bg-inset p-6"
          style={{ borderColor: 'var(--color-gold)' }}
        >
          <div className="shrink-0">
            <ItemCard name={result.name} imageUrl={result.imageUrl} size="lg" />
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <span className="font-mono text-caps uppercase text-gold">выпало</span>
            <span className="font-display text-display-lg uppercase leading-none">
              {result.name}
            </span>
            <span className="text-body text-text-secondary">
              {canOpenReal
                ? 'Предмет уже в инвентаре. Можно поставить на витрину или обменять на лудки.'
                : 'Демо-открытие — лудки не списаны, предмет не добавлен в инвентарь.'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
