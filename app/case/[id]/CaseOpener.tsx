'use client';

import { useState } from 'react';
import { pickWeightedRandom, buildReelStrip, REEL_WINNER_INDEX } from '@/lib/cases';
import { openCaseForReal } from '@/app/actions/open-case-for-real';

type ItemWithImage = {
  id: string;
  name: string;
  imageUrl: string;
  weight: number;
};

const CARD_WIDTH = 120;

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
  const [strip, setStrip] = useState<ItemWithImage[] | null>(null);
  const [offset, setOffset] = useState(0);
  const [result, setResult] = useState<ItemWithImage | null>(null);
  const [balance, setBalance] = useState(initialBalance);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const animateTo = (winner: ItemWithImage) => {
    const reel = buildReelStrip(items, winner);
    setResult(null);
    setStrip(reel);
    setOffset(0);
    requestAnimationFrame(() => {
      setOffset(REEL_WINNER_INDEX * CARD_WIDTH);
    });
    window.setTimeout(() => setResult(winner), 4200);
  };

  const handleDemoOpen = () => {
    animateTo(pickWeightedRandom(items));
  };

  const handleRealOpen = async () => {
    setError(null);
    setPending(true);
    const response = await openCaseForReal(caseId);
    setPending(false);

    if (response.error) {
      setError(response.error);
      return;
    }

    const winner = items.find((item) => item.id === response.itemId);
    if (winner) animateTo(winner);
    setBalance(response.newBalance ?? balance);
  };

  return (
    <div>
      {canOpenReal ? (
        <button onClick={handleRealOpen} disabled={pending || (balance ?? 0) < price}>
          Открыть за {price} лудок (баланс: {balance ?? 0})
        </button>
      ) : (
        <button onClick={handleDemoOpen}>Открыть (демо)</button>
      )}
      {error && <p role="alert">{error}</p>}
      {strip && (
        <div style={{ overflow: 'hidden', width: CARD_WIDTH, position: 'relative' }}>
          <div
            style={{
              display: 'flex',
              transform: `translateX(-${offset}px)`,
              transition: 'transform 4s cubic-bezier(0.15, 0.85, 0.25, 1)',
            }}
          >
            {strip.map((item, i) => (
              <div key={i} style={{ minWidth: CARD_WIDTH }}>
                <img src={item.imageUrl} alt={item.name} width={100} height={100} />
              </div>
            ))}
          </div>
        </div>
      )}
      {result && (
        <p>
          Выпало: <strong>{result.name}</strong>
        </p>
      )}
    </div>
  );
}
