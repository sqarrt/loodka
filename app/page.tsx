import { createClient } from '@/lib/supabase/server';
import { GoogleLoginButton } from '@/components/GoogleLoginButton';

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto flex w-full min-h-screen max-w-[1140px] flex-col items-center justify-center gap-5 px-10 text-center">
        <h1 className="font-display text-display-xl uppercase leading-none">
          Собери кейс
          <br />и разыграй друга
        </h1>
        <p className="max-w-md text-body-lg text-text-secondary">
          Кидаешь ссылку — он крутит и получает что-то нелепое. Бесплатно, в
          демо-режиме.
        </p>
        <GoogleLoginButton />
        <span className="font-mono text-caps text-text-dim">
          без логина можно смотреть и крутить демо
        </span>
      </main>
    );
  }

  const displayName = user.email?.split('@')[0] ?? 'игрок';

  const links = [
    { href: '/inventory', label: 'Инвентарь', hint: '' },
    { href: `/u/${user.id}`, label: 'Мой профиль', hint: 'витрина · кейсы' },
  ];

  return (
    <main className="mx-auto flex w-full max-w-[1140px] flex-col gap-6 px-10 py-14">
      <div className="flex flex-col gap-1 border-b border-line-soft pb-6">
        <span className="font-mono text-caps uppercase text-text-muted">
          с возвращением
        </span>
        <h1 className="font-display text-display-lg uppercase">
          Привет, {displayName}
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="flex min-h-[120px] flex-col justify-between gap-6 rounded-lg border border-line bg-surface-card p-4 hover:border-gold hover:bg-surface-raised"
          >
            <span className="h-3.5 w-3.5 rotate-45 rounded-[2px] border border-line-strong" />
            <div className="flex flex-col gap-1">
              <span className="font-display text-label uppercase">{link.label}</span>
              {link.hint && (
                <span className="font-mono text-caps text-text-muted">{link.hint}</span>
              )}
            </div>
          </a>
        ))}
      </div>
    </main>
  );
}
