'use client';

import { useState } from 'react';
import Link from 'next/link';

// The name in the header (desktop and mobile alike) opens this dropdown
// instead of linking straight to the profile — that's the one tap/click
// target that reaches profile, settings, and sign-out.
export function UserMenu({ userId, displayName }: { userId: string; displayName: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 max-w-[70px] items-center truncate font-mono text-caps uppercase text-text-secondary transition-colors hover:text-gold sm:max-w-[160px]"
      >
        {displayName}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-[calc(100%+8px)] z-50 flex w-40 flex-col overflow-hidden rounded-md border border-line-strong bg-surface-card shadow-2xl">
            <Link
              href={`/u/${userId}`}
              onClick={() => setOpen(false)}
              className="px-4 py-3 font-mono text-caps uppercase text-text-secondary transition-colors hover:bg-surface-raised hover:text-gold"
            >
              Профиль
            </Link>
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="px-4 py-3 font-mono text-caps uppercase text-text-secondary transition-colors hover:bg-surface-raised hover:text-gold"
            >
              Настройки
            </Link>
            <form action="/auth/signout" method="post">
              <button className="w-full px-4 py-3 text-left font-mono text-caps uppercase text-text-muted transition-colors hover:bg-surface-raised hover:text-text-primary">
                Выйти
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
