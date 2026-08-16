'use client';

import { useState } from 'react';
import { pickWeightedRandom, buildReelStrip, REEL_WINNER_INDEX } from '@/lib/cases';

type ItemWithImage = {
  id: string;
  name: string;
  imageUrl: string;
  weight: number;
};

const CARD_WIDTH = 120;

export function CaseOpener({ items }: { items: ItemWithImage[] }) {
  const [strip, setStrip] = useState<ItemWithImage[] | null>(null);
  const [offset, setOffset] = useState(0);
  const [result, setResult] = useState<ItemWithImage | null>(null);

  const handleOpen = () => {
    const winner = pickWeightedRandom(items);
    const reel = buildReelStrip(items, winner);
    setResult(null);
    setStrip(reel);
    setOffset(0);
    // Force a reflow so the transition below actually animates from 0.
    requestAnimationFrame(() => {
      setOffset(REEL_WINNER_INDEX * CARD_WIDTH);
    });
    window.setTimeout(() => setResult(winner), 4200);
  };

  return (
    <div>
      <button onClick={handleOpen}>Открыть (демо)</button>
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
