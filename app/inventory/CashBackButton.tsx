'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cashBackItem } from '@/app/actions/cash-back-item';

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
    <>
      <button onClick={handleClick} disabled={pending}>
        Кэшбек ({cashbackValue} лудок)
      </button>
      {error && <span role="alert">{error}</span>}
    </>
  );
}
