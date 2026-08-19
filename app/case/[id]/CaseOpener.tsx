'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  pickWeightedRandom,
  buildReelStrip,
  buildIdleStrip,
  REEL_WINNER_INDEX,
  CARD_PITCH_PX,
  CARD_WIDTH_PX,
} from '@/lib/cases';
import { openCaseForReal } from '@/app/actions/open-case-for-real';
import { cashBackItem } from '@/app/actions/cash-back-item';
import { ItemCard } from '@/components/ItemCard';
import { ItemThumb } from '@/components/ItemThumb';
import { Button } from '@/components/Button';
import { CurrencyIcon } from '@/components/CurrencyIcon';

type ItemWithImage = {
  id: string;
  name: string;
  imageUrl: string;
  weight: number;
  probability: number;
  description: string | null;
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
  prankItemId,
  prankBy,
}: {
  caseId: string;
  items: ItemWithImage[];
  price: number;
  canOpenReal: boolean;
  initialBalance: number | null;
  prankItemId?: string | null;
  prankBy?: string | null;
}) {
  const [strip, setStrip] = useState<ItemWithImage[]>(() => buildIdleStrip(items));
  const [offset, setOffset] = useState(IDLE_OFFSET_PX);
  const [transitioning, setTransitioning] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'result'>('idle');
  const [result, setResult] = useState<ItemWithImage | null>(null);
  const [balance, setBalance] = useState(initialBalance);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Captured once from props on mount, so it survives the URL scrub below
  // (which re-renders the page without ?prank=/&by=, nulling the props).
  const [prankState] = useState(() =>
    prankItemId ? { itemId: prankItemId, by: prankBy ?? null } : null
  );
  const [pranked, setPranked] = useState(!!prankState);
  const [resultIsPranked, setResultIsPranked] = useState(false);

  // Only set for a real (non-demo, non-pranked) win — that's the one case
  // where the item actually landed in the inventory and can be sold back.
  const [saleInfo, setSaleInfo] = useState<{ inventoryId: string; cashbackValue: number } | null>(null);
  const [selling, setSelling] = useState(false);
  const [sold, setSold] = useState(false);

  // Mask the link immediately on load, not just after it's opened — a
  // pranked link should look like any other case link at a glance.
  useEffect(() => {
    if (prankState) {
      router.replace(`/case/${caseId}`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setSaleInfo(null);
    setSold(false);
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

  // A pending prank overrides either button: no balance touched, no server
  // call, always lands on the pranked item. Consumed after one open (the
  // URL was already scrubbed on mount, so a refresh can't re-arm it).
  const consumePrank = (): ItemWithImage | undefined => {
    if (!pranked || !prankState) return undefined;
    const forced = items.find((item) => item.id === prankState.itemId);
    if (!forced) return undefined;
    setPranked(false);
    setResultIsPranked(true);
    return forced;
  };

  const handleDemoOpen = () => {
    if (phase === 'spinning') return;
    const forced = consumePrank();
    if (forced) {
      animateTo(forced);
      return;
    }
    setResultIsPranked(false);
    animateTo(pickWeightedRandom(items));
  };

  const handleRealOpen = async () => {
    if (phase === 'spinning') return;
    setError(null);
    setPhase('spinning');

    const forced = consumePrank();
    if (forced) {
      animateTo(forced);
      return;
    }

    setResultIsPranked(false);
    const response = await openCaseForReal(caseId);

    if (response.error) {
      setPhase('idle');
      setError(response.error);
      return;
    }

    const winner = items.find((item) => item.id === response.itemId);
    setBalance(response.newBalance ?? balance);
    router.refresh();
    if (winner) {
      // response.itemId matched an item here, so we're necessarily in the
      // success branch (the error branch never sets itemId) — TS just
      // can't prove that itself from the loose `{error?}` return shape.
      animateTo(winner);
      setSaleInfo({ inventoryId: response.inventoryId!, cashbackValue: response.cashbackValue! });
    }
  };

  const handleSell = async () => {
    if (!saleInfo) return;
    setSelling(true);
    const response = await cashBackItem(saleInfo.inventoryId);
    setSelling(false);

    if (response.error) {
      setError(response.error);
      return;
    }

    setBalance((b) => (b ?? 0) + (response.creditedAmount ?? 0));
    setSold(true);
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
        <div className="relative h-[180px]">
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
              <ItemThumb key={i} imageUrl={item.imageUrl} description={item.description} size="sm" />
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
                Открыть за {price} <CurrencyIcon size={20} />
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
        {!canOpenReal && (
          <span className="font-mono text-caps text-text-dim">
            демо не списывает лудки и не даёт предмет
          </span>
        )}
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
            {result.description && (
              <p className="text-body text-text-secondary">{result.description}</p>
            )}
            <span className="mt-1.5 font-mono text-caps text-text-dim">
              {resultIsPranked
                ? `Тебя разыграл ${prankState?.by || 'друг'}! Предмет не сохранится в инвентаре. Можешь открыть ещё раз — уже по-настоящему.`
                : canOpenReal
                  ? 'Предмет уже в инвентаре. Можно поставить на витрину или обменять на лудки.'
                  : 'Демо-открытие — лудки не списаны, предмет не добавлен в инвентарь.'}
            </span>
            {saleInfo && !sold && (
              <button
                onClick={handleSell}
                disabled={selling}
                className="mt-2 flex h-11 w-fit items-center gap-2 whitespace-nowrap rounded-md border border-[#2E4A3E] bg-[#122019] px-4 font-mono text-label font-bold text-success hover:border-success hover:bg-[#16281F] disabled:opacity-50"
              >
                {selling ? (
                  'Продаём…'
                ) : (
                  <>
                    Продать за <CurrencyIcon size={11} /> {saleInfo.cashbackValue}
                  </>
                )}
              </button>
            )}
            {sold && (
              <span className="mt-2 font-mono text-caps text-success">
                Продано за {saleInfo?.cashbackValue} лудок
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
