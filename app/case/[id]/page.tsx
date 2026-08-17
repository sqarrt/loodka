import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolveImageUrl } from '@/lib/storage';
import { computeOdds, type CaseItem } from '@/lib/cases';
import { ItemCard } from '@/components/ItemCard';
import { CurrencyIcon } from '@/components/CurrencyIcon';
import { CaseOpener } from './CaseOpener';
import { CasePrankButton } from './CasePrankButton';

export default async function CasePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ prank?: string; by?: string }>;
}) {
  const { id } = await params;
  const { prank, by } = await searchParams;
  const supabase = await createClient();

  const { data: caseRow } = await supabase
    .from('cases')
    .select('id, title, price, items, user_id')
    .eq('id', id)
    .maybeSingle();

  if (!caseRow) notFound();

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

  // Self-opens are allowed too — author_share + cashback_share <= 1 makes
  // this a zero-expected-value loop, not a farming exploit.
  const canOpenReal = !!user;
  const displayName = user?.email?.split('@')[0] ?? 'Игрок';

  const items = caseRow.items as CaseItem[];
  const itemsWithOdds = computeOdds(items).map((item) => ({
    ...item,
    imageUrl: resolveImageUrl(supabase, item.image_path),
  }));

  const prankItemId = prank && items.some((item) => item.id === prank) ? prank : null;

  return (
    <main className="mx-auto flex w-full max-w-[1140px] flex-1 flex-col gap-7 px-10 py-10">
      <div className="flex items-end justify-between gap-6">
        <div className="flex flex-col gap-2">
          <span className="font-mono text-caps uppercase text-text-muted">
            {items.length} предметов
          </span>
          <h1 className="font-display text-display-xl uppercase leading-none">
            {caseRow.title}
          </h1>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="font-mono text-caps uppercase text-text-muted">
            цена крутки
          </span>
          <span className="flex items-center gap-2 font-mono text-heading font-bold">
            <CurrencyIcon size={15} /> {caseRow.price}
          </span>
        </div>
      </div>

      <CaseOpener
        caseId={caseRow.id}
        items={itemsWithOdds}
        price={caseRow.price}
        canOpenReal={canOpenReal}
        initialBalance={balance}
        prankItemId={prankItemId}
        prankBy={by ?? null}
      />

      <div className="mt-auto flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-heading uppercase">Что может выпасть</h2>
          <CasePrankButton caseId={caseRow.id} items={itemsWithOdds} displayName={displayName} />
        </div>
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-6">
          {itemsWithOdds.map((item) => (
            <ItemCard
              key={item.id}
              name={item.name}
              imageUrl={item.imageUrl}
              probability={item.probability}
              size="lg"
            />
          ))}
        </div>
      </div>
    </main>
  );
}
