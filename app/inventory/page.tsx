import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolveImageUrl } from '@/lib/storage';
import { mapInventoryToDisplayItems, type CaseItemsById } from '@/lib/inventory';
import type { CaseItem } from '@/lib/cases';
import { CashBackButton } from './CashBackButton';

export default async function InventoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: rows } = await supabase
    .from('inventory')
    .select('id, case_id, item_id, cashback_value, obtained_at')
    .eq('user_id', user.id)
    .order('obtained_at', { ascending: false });

  const caseIds = [...new Set((rows ?? []).map((r) => r.case_id))];
  const { data: cases } = await supabase.from('cases').select('id, items').in('id', caseIds);

  const casesById: CaseItemsById = {};
  for (const c of cases ?? []) {
    casesById[c.id] = c.items as CaseItem[];
  }

  const displayItems = mapInventoryToDisplayItems(rows ?? [], casesById).map((item) => ({
    ...item,
    imageUrl: item.image_path ? resolveImageUrl(supabase, item.image_path) : '',
  }));

  return (
    <main>
      <h1>Инвентарь</h1>
      <ul>
        {displayItems.map((item) => (
          <li key={item.inventoryId}>
            {item.imageUrl && <img src={item.imageUrl} alt={item.name} width={80} height={80} />}
            <span>{item.name}</span>
            <CashBackButton inventoryId={item.inventoryId} cashbackValue={item.cashbackValue} />
          </li>
        ))}
      </ul>
    </main>
  );
}
