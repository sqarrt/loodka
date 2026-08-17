import { createClient } from '@/lib/supabase/server';
import { resolveImageUrl } from '@/lib/storage';
import { mapInventoryToDisplayItems, type InventoryRowWithItem } from '@/lib/inventory';
import { progressForSpend } from '@/lib/xp';
import { ProfileTabs } from './ProfileTabs';

export default async function ProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const supabase = await createClient();

  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();
  const viewerIsOwner = viewer?.id === userId;
  const displayName = viewerIsOwner ? (viewer?.email?.split('@')[0] ?? 'игрок') : null;

  const { data: viewedProfile } = await supabase
    .from('profiles')
    .select('total_spent')
    .eq('user_id', userId)
    .maybeSingle();
  const { level, intoLevel, forLevel, fraction } = progressForSpend(viewedProfile?.total_spent ?? 0);

  const { data: rows } = await supabase
    .from('inventory')
    .select('id, cashback_value, obtained_at, case_items(name, image_path, description)')
    .eq('user_id', userId)
    .order('obtained_at', { ascending: false });

  const allItems = mapInventoryToDisplayItems(
    (rows ?? []) as unknown as InventoryRowWithItem[]
  ).map((item) => ({
    ...item,
    imageUrl: item.image_path ? resolveImageUrl(supabase, item.image_path) : '',
  }));

  const { data: showcaseRows } = await supabase
    .from('showcase_slots')
    .select('slot_index, inventory_id, case_id')
    .eq('user_id', userId);

  const slots: { inventoryId: string | null; caseId: string | null }[] = Array.from(
    { length: 12 },
    () => ({ inventoryId: null, caseId: null })
  );
  for (const row of showcaseRows ?? []) {
    slots[row.slot_index] = { inventoryId: row.inventory_id, caseId: row.case_id };
  }

  const { data: ownCases } = await supabase
    .from('cases')
    .select('id, title, price, cover_image_path, case_items(id)')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .eq('case_items.removed', false)
    .order('created_at', { ascending: false });

  const cases = (ownCases ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    price: c.price,
    itemCount: c.case_items.length,
  }));

  // A case-slot can only ever hold the owner's own case (enforced in
  // setShowcaseSlot), so ownCases already contains every case any slot's
  // caseId could point to — reuse it instead of a second query.
  const caseDisplayById = Object.fromEntries(
    (ownCases ?? []).map((c) => [
      c.id,
      { title: c.title, coverImageUrl: c.cover_image_path ? resolveImageUrl(supabase, c.cover_image_path) : null },
    ])
  );

  return (
    <main className="mx-auto flex w-full max-w-[1140px] flex-col gap-6 px-10 py-10">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-caps uppercase text-text-muted">профиль</span>
        <h1 className="font-display text-display-lg uppercase">{displayName ?? 'Профиль'}</h1>
        <div className="flex flex-col gap-1.5 pt-2">
          <div className="flex items-center gap-2 font-mono text-caps text-text-muted">
            <span className="text-gold">уровень {level}</span>
            <span>
              {intoLevel} / {Math.round(forLevel)}
            </span>
          </div>
          <div className="h-1.5 w-56 overflow-hidden rounded-full bg-inset">
            <div
              className="h-full rounded-full bg-gold"
              style={{ width: `${Math.min(fraction, 1) * 100}%` }}
            />
          </div>
        </div>
      </div>
      <ProfileTabs
        slots={slots}
        allItems={allItems}
        cases={cases}
        caseDisplayById={caseDisplayById}
        viewerIsOwner={viewerIsOwner}
      />
    </main>
  );
}
