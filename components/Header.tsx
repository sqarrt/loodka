import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { CurrencyIcon } from '@/components/CurrencyIcon';

const NAV_LINKS = [
  { href: '/', label: 'Главная' },
  { href: '/cases/new', label: 'Создать кейс' },
  { href: '/inventory', label: 'Инвентарь' },
  { href: '/dashboard', label: 'Мои кейсы' },
];

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

  return (
    <header className="border-b border-line-soft">
      <div className="mx-auto flex max-w-[1140px] items-center justify-between gap-6 px-10 py-4">
        <Link href="/" className="font-display text-label uppercase tracking-[0.08em]">
          Loodka
        </Link>
        {user && (
          <nav className="flex items-center gap-5">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-mono text-caps uppercase text-text-secondary hover:text-text-primary"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href={`/u/${user.id}`}
              className="font-mono text-caps uppercase text-text-secondary hover:text-text-primary"
            >
              Профиль
            </Link>
          </nav>
        )}
        {user && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-full border border-line bg-surface-card px-3 py-1.5 font-mono text-label font-bold">
              <CurrencyIcon size={12} /> {balance}
            </div>
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
