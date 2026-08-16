import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { CurrencyIcon } from '@/components/CurrencyIcon';

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let balance: number | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('balance')
      .eq('user_id', user.id)
      .maybeSingle();
    balance = profile?.balance ?? 0;
  }

  const displayName = user?.email?.split('@')[0] ?? 'игрок';

  return (
    <header className="border-b border-line-soft">
      <div className="mx-auto flex max-w-[1140px] items-center justify-between gap-6 px-10 py-4">
        <Link href="/" className="font-display text-label uppercase tracking-[0.08em]">
          Loodka
        </Link>
        {user && (
          <div className="flex items-center gap-4">
            <Link
              href="/cases/new"
              className="flex h-9 items-center rounded-md bg-gold px-4 font-display text-caps uppercase text-bg"
            >
              + Создать кейс
            </Link>
            <div className="flex items-center gap-2 rounded-full border border-line bg-surface-card px-3 py-1.5 font-mono text-label font-bold">
              <CurrencyIcon size={12} /> {balance}
            </div>
            <Link
              href={`/u/${user.id}`}
              className="font-mono text-caps uppercase text-text-secondary hover:text-text-primary"
            >
              {displayName}
            </Link>
            <form action="/auth/signout" method="post">
              <button className="font-mono text-caps uppercase text-text-muted hover:text-text-primary">
                выйти
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
