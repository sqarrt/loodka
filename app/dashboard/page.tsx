import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CurrencyIcon } from '@/components/CurrencyIcon';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: cases } = await supabase
    .from('cases')
    .select('id, title, price, items, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <main className="mx-auto flex max-w-[1140px] flex-col gap-5 px-10 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-display-lg uppercase">Мои кейсы</h1>
        <a
          href="/cases/new"
          className="flex h-11 items-center rounded-md bg-gold px-5 font-display text-label uppercase text-bg"
        >
          + Новый кейс
        </a>
      </div>
      <div className="flex flex-col gap-2.5">
        {(cases ?? []).map((c) => (
          <div
            key={c.id}
            className="flex flex-col gap-3 rounded-lg border border-line bg-surface-card p-4 sm:grid sm:grid-cols-[1fr_110px_90px_auto] sm:items-center"
          >
            <span className="font-display text-label uppercase">{c.title}</span>
            <span className="font-mono text-mono-num text-text-secondary">
              {(c.items as unknown[]).length} предметов
            </span>
            <span className="flex items-center gap-2 font-mono text-label font-bold">
              <CurrencyIcon size={12} /> {c.price}
            </span>
            <a
              href={`/case/${c.id}`}
              className="flex h-9 items-center justify-center rounded-md border border-gold px-3 font-mono text-caps uppercase text-gold sm:justify-self-end"
            >
              открыть
            </a>
          </div>
        ))}
        {(cases ?? []).length === 0 && (
          <p className="font-mono text-caps text-text-muted">Кейсов пока нет.</p>
        )}
      </div>
    </main>
  );
}
