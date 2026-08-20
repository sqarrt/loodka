import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { CurrencyIcon } from '@/components/CurrencyIcon';
import { UserMenu } from '@/components/UserMenu';
import { formatLudki } from '@/lib/currency';

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let balance: number | null = null;
  let displayName = 'игрок';
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('balance, display_name')
      .eq('user_id', user.id)
      .maybeSingle();
    balance = profile?.balance ?? 0;
    displayName = profile?.display_name ?? 'игрок';
  }

  return (
    <header className="border-b border-line-soft">
      <div className="mx-auto flex max-w-[1140px] flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 sm:gap-x-6 sm:px-10 sm:py-4">
        <Link
          href="/"
          className="font-display text-label uppercase tracking-[0.08em] transition-colors hover:text-gold"
        >
          Loodka
        </Link>
        {user && (
          <div className="flex h-9 items-center gap-2 sm:gap-4">
            <Link
              href="/cases/new"
              className="flex h-9 items-center whitespace-nowrap rounded-md bg-gold px-3 font-display text-caps uppercase text-bg transition-colors hover:bg-gold-hover active:bg-gold-active sm:px-4"
            >
              <span className="sm:hidden">+ Кейс</span>
              <span className="hidden sm:inline">+ Создать кейс</span>
            </Link>
            <div className="flex h-9 items-center gap-2 rounded-full border border-line bg-surface-card px-3 font-mono text-label font-bold">
              <CurrencyIcon size={12} /> {formatLudki(balance ?? 0)}
            </div>
            <UserMenu userId={user.id} displayName={displayName} />
          </div>
        )}
      </div>
    </header>
  );
}
