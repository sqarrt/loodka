import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolveImageUrl } from '@/lib/storage';
import { computeOdds, type CaseItem } from '@/lib/cases';
import { CaseOpener } from './CaseOpener';

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  const isAuthor = user?.id === caseRow.user_id;
  const canOpenReal = !!user && !isAuthor;

  const items = caseRow.items as CaseItem[];
  const itemsWithOdds = computeOdds(items).map((item) => ({
    ...item,
    imageUrl: resolveImageUrl(supabase, item.image_path),
  }));

  return (
    <main>
      <h1>{caseRow.title}</h1>
      <p>Цена крутки: {caseRow.price} лудок</p>
      <ul>
        {itemsWithOdds.map((item) => (
          <li key={item.id}>
            <img src={item.imageUrl} alt={item.name} width={80} height={80} />
            <span>{item.name}</span>
            <span>{(item.probability * 100).toFixed(1)}%</span>
          </li>
        ))}
      </ul>
      <CaseOpener
        caseId={caseRow.id}
        items={itemsWithOdds}
        price={caseRow.price}
        canOpenReal={canOpenReal}
        initialBalance={balance}
      />
    </main>
  );
}
