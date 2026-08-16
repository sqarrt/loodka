'use client';

import { useState } from 'react';

type DisplayItem = {
  inventoryId: string;
  name: string;
  imageUrl: string;
};

export function ProfileTabs({
  showcaseItems,
  allItems,
}: {
  showcaseItems: (DisplayItem | null)[];
  allItems: DisplayItem[];
}) {
  const [tab, setTab] = useState<'showcase' | 'inventory'>('showcase');

  return (
    <div>
      <nav>
        <button onClick={() => setTab('showcase')} aria-current={tab === 'showcase'}>
          Витрина
        </button>
        <button onClick={() => setTab('inventory')} aria-current={tab === 'inventory'}>
          Инвентарь
        </button>
      </nav>
      {tab === 'showcase' && (
        <ul>
          {showcaseItems.map((item, i) => (
            <li key={i}>
              {item ? (
                <>
                  <img src={item.imageUrl} alt={item.name} width={80} height={80} />
                  <span>{item.name}</span>
                </>
              ) : (
                <span>Пусто</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {tab === 'inventory' && (
        <ul>
          {allItems.map((item) => (
            <li key={item.inventoryId}>
              <img src={item.imageUrl} alt={item.name} width={80} height={80} />
              <span>{item.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
