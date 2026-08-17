'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cashBackItem } from '@/app/actions/cash-back-item';
import { CurrencyIcon } from '@/components/CurrencyIcon';

export function CashBackButton({
  inventoryId,
  cashbackValue,
}: {
  inventoryId: string;
  cashbackValue: number;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setPending(true);
    const response = await cashBackItem(inventoryId);
    setPending(false);

    if (response.error) {
      setError(response.error);
      return;
    }
    router.refresh();
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={pending}
        className="flex h-11 items-center gap-2 whitespace-nowrap rounded-md border border-[#2E4A3E] bg-[#122019] px-4 font-mono text-label font-bold text-success hover:border-success hover:bg-[#16281F] disabled:opacity-50"
      >
        Продать за <CurrencyIcon size={11} /> {cashbackValue}
      </button>
      {error && (
        <span role="alert" className="font-mono text-caps text-danger">
          {error}
        </span>
      )}
    </div>
  );
}
