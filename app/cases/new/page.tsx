'use client';

import { useActionState, useState, type ChangeEvent } from 'react';
import { createCase } from '@/app/actions/create-case';
import { Button } from '@/components/Button';
import { CurrencyIcon } from '@/components/CurrencyIcon';

const emptyItems = [0, 1];

const inputClass =
  'h-12 rounded-md border border-line-strong bg-surface-card px-3.5 text-body outline-none focus:border-gold';

export default function NewCasePage() {
  const [state, formAction] = useActionState(createCase, null);
  const [previews, setPreviews] = useState<Record<number, string>>({});

  const handleFileChange = (i: number) => (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviews((prev) => ({ ...prev, [i]: URL.createObjectURL(file) }));
  };

  return (
    <main className="mx-auto flex max-w-[1140px] flex-col gap-6 px-10 py-10">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-caps uppercase text-text-muted">новый кейс</span>
        <h1 className="font-display text-display-lg uppercase">Собери кейс</h1>
      </div>
      <form action={formAction} className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr]">
          <label className="flex flex-col gap-2">
            <span className="font-mono text-caps uppercase text-text-muted">название</span>
            <input name="title" required className={inputClass} />
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-mono text-caps uppercase text-text-muted">
              цена крутки
            </span>
            <div className="flex items-center gap-2">
              <CurrencyIcon size={13} />
              <input
                name="price"
                type="number"
                min={1}
                defaultValue={10}
                required
                className={`${inputClass} w-full font-mono font-bold`}
              />
            </div>
          </label>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-caps uppercase text-text-muted">
              предметы · минимум 2
            </span>
            <span className="font-mono text-caps text-text-secondary">
              шансы считаются из весов автоматически
            </span>
          </div>
          {emptyItems.map((i) => (
            <div
              key={i}
              className="flex flex-col gap-2 rounded-lg border border-line bg-surface-card p-3 sm:grid sm:grid-cols-[84px_1fr_110px] sm:items-center"
            >
              <label className="relative flex h-[62px] w-[84px] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed border-line-strong bg-inset text-center font-mono text-[9px] leading-tight text-text-dim hover:border-gold hover:text-gold">
                {previews[i] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previews[i]} alt="" className="h-full w-full object-cover" />
                ) : (
                  'фото'
                )}
                <input
                  name="itemImage"
                  type="file"
                  accept="image/*"
                  required
                  onChange={handleFileChange(i)}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </label>
              <input
                name="itemName"
                placeholder="Название предмета"
                required
                className={inputClass}
              />
              <input
                name="itemWeight"
                type="number"
                min={1}
                defaultValue={1}
                required
                className={`${inputClass} font-mono`}
              />
            </div>
          ))}
        </div>

        {state?.error && (
          <p role="alert" className="font-mono text-caps text-danger">
            {state.error}
          </p>
        )}

        <div className="flex items-center justify-between border-t border-line-soft pt-5">
          <span className="font-mono text-caps text-text-muted">
            после создания получишь ссылку на кейс
          </span>
          <Button type="submit" variant="cta">
            Создать кейс
          </Button>
        </div>
      </form>
    </main>
  );
}
