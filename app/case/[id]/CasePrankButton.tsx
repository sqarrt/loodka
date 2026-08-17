'use client';

import { useState } from 'react';

type PrankItem = {
  id: string;
  name: string;
  imageUrl: string;
};

export function CasePrankButton({
  caseId,
  items,
  displayName,
}: {
  caseId: string;
  items: PrankItem[];
  displayName: string;
}) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const close = () => {
    setOpen(false);
    setSelectedId(null);
    setCopied(false);
  };

  const copyLink = async () => {
    if (!selectedId) return;
    const url = `${window.location.origin}/case/${caseId}?prank=${selectedId}&by=${encodeURIComponent(displayName)}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 items-center rounded-md border border-line-strong px-4 font-mono text-caps uppercase text-text-secondary hover:border-gold hover:text-gold"
      >
        Пранк
      </button>

      {open && (
        <div
          className="fixed inset-0 z-10 flex items-center justify-center bg-bg/80 p-7"
          onClick={close}
        >
          <div
            className="flex max-h-[70vh] w-full max-w-[480px] flex-col overflow-hidden rounded-lg border border-line-strong bg-surface-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-1.5 border-b border-line p-4">
              <div className="flex items-center justify-between">
                <span className="font-display text-label uppercase">Разыграть друга</span>
                <button
                  onClick={close}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-line text-text-secondary hover:border-line-strong hover:text-text-primary"
                >
                  ×
                </button>
              </div>
              <p className="text-caps text-text-secondary">
                Выбери предмет и скинь ссылку, чтоб выпал именно он. Предмет не попадёт в
                инвентарь.
              </p>
            </div>
            <div className="flex flex-col gap-2 overflow-auto p-3.5">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`flex items-center gap-3 rounded-md border bg-inset p-2.5 text-left hover:border-line-strong hover:bg-surface-raised ${
                    selectedId === item.id ? 'border-gold' : 'border-line'
                  }`}
                >
                  {item.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt={item.name} className="h-11 w-14 rounded object-cover" />
                  )}
                  <span className="text-label font-semibold">{item.name}</span>
                </button>
              ))}
            </div>
            <button
              onClick={copyLink}
              disabled={!selectedId}
              className="border-t border-line p-3.5 text-center font-display text-label uppercase text-gold disabled:cursor-not-allowed disabled:text-text-muted"
            >
              {copied ? 'Скопировано' : 'Скопировать ссылку'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
