import { createClient } from '@/lib/supabase/server';
import { resolveImageUrl } from '@/lib/storage';
import { mapInventoryToDisplayItems, type InventoryRowWithItem } from '@/lib/inventory';
import { progressForSpend } from '@/lib/xp';
import { getRarityTier } from '@/lib/rarity';
import { ProfileTabs } from './ProfileTabs';

export default async function ProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const supabase = await createClient();

  // Five independent reads — none needs another's result — so they go out
  // together instead of round-tripping one at a time. That matters here:
  // this page reloads on every showcase-slot pick (router.refresh()), so a
  // serial waterfall of 8 sequential queries was making that feel sluggish.
  const [
    {
      data: { user: viewer },
    },
    { data: viewedProfile },
    { data: rows },
    { data: showcaseRows },
    { data: ownCases },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('profiles').select('total_spent, display_name').eq('user_id', userId).maybeSingle(),
    supabase
      .from('inventory')
      .select('id, cashback_value, obtained_at, case_items(name, image_path, description, weight, case_id)')
      .eq('user_id', userId)
      .order('obtained_at', { ascending: false }),
    supabase.from('showcase_slots').select('slot_index, inventory_id, case_id').eq('user_id', userId),
    supabase
      .from('cases')
      .select('id, title, price, cover_image_path, created_at, case_items(id, weight)')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .eq('case_items.removed', false)
      .order('created_at', { ascending: false }),
  ]);

  const viewerIsOwner = viewer?.id === userId;
  const { level, intoLevel, forLevel, fraction } = progressForSpend(viewedProfile?.total_spent ?? 0);
  const ownerName = viewedProfile?.display_name ?? 'игрок';

  const rawItems = mapInventoryToDisplayItems((rows ?? []) as unknown as InventoryRowWithItem[]);

  // Rarity and case/author navigation both need each item's odds within its
  // own case — that means every referenced case's *current* total active
  // weight, plus that case's title and author. Batch it all rather than
  // querying per item. The two queries below are independent of each other
  // (both only need itemCaseIds), so they run together too.
  const itemCaseIds = [...new Set(rawItems.map((item) => item.caseId).filter((id): id is string => id !== null))];

  const [{ data: siblingWeightRows }, { data: itemCaseRows }] = itemCaseIds.length
    ? await Promise.all([
        supabase.from('case_items').select('case_id, weight').in('case_id', itemCaseIds).eq('removed', false),
        supabase.from('cases').select('id, title, user_id').in('id', itemCaseIds),
      ])
    : [{ data: [] }, { data: [] }];
  const totalWeightByCase = new Map<string, number>();
  for (const row of siblingWeightRows ?? []) {
    totalWeightByCase.set(row.case_id, (totalWeightByCase.get(row.case_id) ?? 0) + row.weight);
  }

  const caseMetaById = new Map((itemCaseRows ?? []).map((c) => [c.id, c]));

  const itemAuthorIds = [...new Set((itemCaseRows ?? []).map((c) => c.user_id))];
  const { data: itemAuthorProfiles } = itemAuthorIds.length
    ? await supabase.from('profiles').select('user_id, display_name').in('user_id', itemAuthorIds)
    : { data: [] };
  const itemAuthorNameById = new Map((itemAuthorProfiles ?? []).map((p) => [p.user_id, p.display_name]));

  const allItems = rawItems.map((item) => {
    const caseMeta = item.caseId ? caseMetaById.get(item.caseId) : undefined;
    const totalWeight = item.caseId ? totalWeightByCase.get(item.caseId) : undefined;
    return {
      ...item,
      imageUrl: item.image_path ? resolveImageUrl(supabase, item.image_path) : '',
      probability: item.weight && totalWeight ? item.weight / totalWeight : undefined,
      caseTitle: caseMeta?.title ?? null,
      authorId: caseMeta?.user_id ?? null,
      authorName: caseMeta ? (itemAuthorNameById.get(caseMeta.user_id) ?? 'игрок') : null,
    };
  });

  const slots: { inventoryId: string | null; caseId: string | null }[] = Array.from(
    { length: 12 },
    () => ({ inventoryId: null, caseId: null })
  );
  for (const row of showcaseRows ?? []) {
    slots[row.slot_index] = { inventoryId: row.inventory_id, caseId: row.case_id };
  }

  const cases = (ownCases ?? []).map((c) => {
    const items = c.case_items;
    const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
    const minWeight = items.length ? Math.min(...items.map((i) => i.weight)) : 0;
    return {
      id: c.id,
      title: c.title,
      price: c.price,
      itemCount: items.length,
      coverImageUrl: c.cover_image_path ? resolveImageUrl(supabase, c.cover_image_path) : null,
      topRarity: totalWeight > 0 ? getRarityTier(minWeight / totalWeight) : ('common' as const),
      createdAt: c.created_at,
      authorId: userId,
      authorName: ownerName,
    };
  });

  // A case-slot can only ever hold the owner's own case (enforced in
  // setShowcaseSlot), so ownCases already contains every case any slot's
  // caseId could point to — reuse it instead of a second query.
  const caseDisplayById = Object.fromEntries(cases.map((c) => [c.id, c]));

  return (
    <main className="w-full flex-1">
      <ProfileTabs
        displayName={ownerName}
        level={level}
        intoLevel={intoLevel}
        forLevel={forLevel}
        fraction={fraction}
        slots={slots}
        allItems={allItems}
        cases={cases}
        caseDisplayById={caseDisplayById}
        viewerIsOwner={viewerIsOwner}
      />
    </main>
  );
}
