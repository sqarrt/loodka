import { createClient } from '@/lib/supabase/server';
import { resolveImageUrl } from '@/lib/storage';
import { mapInventoryToDisplayItems, type CaseItemsById } from '@/lib/inventory';
import type { CaseItem } from '@/lib/cases';
import { ProfileTabs } from './ProfileTabs';

export default async function ProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from('inventory')
    .select('id, case_id, item_id, cashback_value, obtained_at')
    .eq('user_id', userId)
    .order('obtained_at', { ascending: false });

  const caseIds = [...new Set((rows ?? []).map((r) => r.case_id))];
  const { data: cases } = await supabase.from('cases').select('id, items').in('id', caseIds);

  const casesById: CaseItemsById = {};
  for (const c of cases ?? []) {
    casesById[c.id] = c.items as CaseItem[];
  }

  const allItems = mapInventoryToDisplayItems(rows ?? [], casesById).map((item) => ({
    ...item,
    imageUrl: item.image_path ? resolveImageUrl(supabase, item.image_path) : '',
  }));

  const { data: showcase } = await supabase
    .from('profile_showcases')
    .select('slots')
    .eq('user_id', userId)
    .maybeSingle();
  const slots = ((showcase?.slots as (string | null)[]) ?? Array(12).fill(null)) as (
    | string
    | null
  )[];

  const itemsById = new Map(allItems.map((item) => [item.inventoryId, item]));
  const showcaseItems = slots.map((id) => (id ? (itemsById.get(id) ?? null) : null));

  return (
    <main>
      <h1>Профиль</h1>
      <ProfileTabs showcaseItems={showcaseItems} allItems={allItems} />
    </main>
  );
}
