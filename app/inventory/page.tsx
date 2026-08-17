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
    <main className="mx-auto flex w-full max-w-[1140px] flex-col gap-5 px-10 py-10">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-caps uppercase text-text-muted">
          {displayItems.length} предметов
        </span>
        <h1 className="font-display text-display-lg uppercase">Инвентарь</h1>
      </div>
      <div className="flex flex-col gap-2.5">
        {displayItems.map((item) => (
          <div
            key={item.inventoryId}
            className="flex items-center gap-4 rounded-lg border border-line bg-surface-card p-3 hover:bg-surface-raised"
          >
            {item.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.imageUrl}
                alt={item.name}
                className="h-18 w-24 shrink-0 rounded-md border border-line object-cover"
              />
            )}
            <div className="flex flex-1 flex-col gap-1">
              <span className="text-label font-semibold">{item.name}</span>
              <span className="font-mono text-caps text-text-muted">
                получен {new Date(item.obtainedAt).toLocaleDateString('ru-RU')}
              </span>
            </div>
            <CashBackButton inventoryId={item.inventoryId} cashbackValue={item.cashbackValue} />
          </div>
        ))}
      </div>
      <span className="font-mono text-caps text-text-dim">
        витрина здесь не редактируется — только на своём профиле
      </span>
    </main>
  );
}
