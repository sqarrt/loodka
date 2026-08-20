'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateDisplayName } from '@/app/actions/update-display-name';

export function SettingsForm({ initialDisplayName }: { initialDisplayName: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialDisplayName);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const save = () => {
    setSaved(false);
    startTransition(async () => {
      const result = await updateDisplayName(name);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      setSaved(true);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-line-strong bg-surface-card p-6">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="display-name" className="font-mono text-caps uppercase text-text-muted">
          Отображаемое имя
        </label>
        <input
          id="display-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
          maxLength={24}
          disabled={isPending}
          className="h-10 w-full rounded-md border border-line-strong bg-inset px-3 text-body outline-none focus:border-gold"
        />
      </div>
      {error && <span className="font-mono text-caps text-danger">{error}</span>}
      {saved && !error && <span className="font-mono text-caps text-gold">Сохранено</span>}
      <button
        onClick={save}
        disabled={isPending || !name.trim()}
        className="flex h-9 items-center justify-center self-start rounded-md bg-gold px-4 font-display text-caps uppercase text-bg transition-colors hover:bg-gold-hover active:bg-gold-active disabled:opacity-50"
      >
        Сохранить
      </button>
    </div>
  );
}
