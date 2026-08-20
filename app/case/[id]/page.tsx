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
    .select('id, title, price, user_id, deleted_at, case_items(id, name, image_path, weight, description)')
    .eq('id', id)
    .eq('case_items.removed', false)
    .order('position', { referencedTable: 'case_items' })
    .maybeSingle();

  if (!caseRow || caseRow.deleted_at) notFound();

  const { data: authorProfile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('user_id', caseRow.user_id)
    .maybeSingle();
  const authorName = authorProfile?.display_name ?? 'игрок';

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let balance: number | null = null;
  let displayName = 'Игрок';
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('balance, display_name')
      .eq('user_id', user.id)
      .maybeSingle();
    balance = profile?.balance ?? 0;
    displayName = profile?.display_name ?? 'Игрок';
  }

  // Self-opens are allowed too — author_share + cashback_share <= 1 makes
  // this a zero-expected-value loop, not a farming exploit.
  const canOpenReal = !!user;

  const items = caseRow.case_items as CaseItem[];
  const itemsWithOdds = computeOdds(items).map((item) => ({
    ...item,
    imageUrl: resolveImageUrl(supabase, item.image_path),
  }));

  const prankItemId = prank && items.some((item) => item.id === prank) ? prank : null;

  return (
    <main className="mx-auto flex w-full max-w-[1140px] flex-1 flex-col gap-7 px-10 py-10">
      <div className="flex items-end justify-between gap-6">
        <div className="flex min-w-0 flex-col gap-2">
          <span className="font-mono text-caps uppercase text-text-muted">
            {items.length} предметов
          </span>
          <h1 className="break-words font-display text-display-lg uppercase leading-none sm:text-display-xl">
            {caseRow.title}
          </h1>
          <a href={`/u/${caseRow.user_id}`} className="w-fit font-mono text-caps text-text-secondary hover:text-gold">
            @{authorName}
          </a>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
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
        {/* Horizontal scroll, not a wrapping grid — a case can have a lot of
            items, and a grid would just grow the page taller without bound. */}
        <div className="flex gap-3.5 overflow-x-auto pb-2 [scrollbar-color:var(--color-line-strong)_transparent] [scrollbar-gutter:stable] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-line-strong [&::-webkit-scrollbar-track]:bg-transparent">
          {itemsWithOdds.map((item) => (
            <div key={item.id} className="shrink-0">
              <ItemCard
                name={item.name}
                imageUrl={item.imageUrl}
                probability={item.probability}
                description={item.description}
                size="lg"
              />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
