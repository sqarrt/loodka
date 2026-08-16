import { createClient } from '@/lib/supabase/server';
import { resolveImageUrl } from '@/lib/storage';
import { mapInventoryToDisplayItems, type CaseItemsById } from '@/lib/inventory';
import type { CaseItem } from '@/lib/cases';
import { ProfileTabs } from './ProfileTabs';

export default async function ProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const supabase = await createClient();

  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();
  const viewerIsOwner = viewer?.id === userId;
  const displayName = viewerIsOwner ? (viewer?.email?.split('@')[0] ?? 'игрок') : null;

  const { data: rows } = await supabase
    .from('inventory')
    .select('id, case_id, item_id, cashback_value, obtained_at')
    .eq('user_id', userId)
    .order('obtained_at', { ascending: false });

  const caseIds = [...new Set((rows ?? []).map((r) => r.case_id))];
  const { data: inventoryCases } = await supabase
    .from('cases')
    .select('id, items')
    .in('id', caseIds);

  const casesById: CaseItemsById = {};
  for (const c of inventoryCases ?? []) {
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

  const { data: ownCases } = await supabase
    .from('cases')
    .select('id, title, price, items')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  const cases = (ownCases ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    price: c.price,
    itemCount: (c.items as unknown[]).length,
  }));

  return (
    <main className="mx-auto flex max-w-[1140px] flex-col gap-6 px-10 py-10">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-caps uppercase text-text-muted">профиль</span>
        <h1 className="font-display text-display-lg uppercase">{displayName ?? 'Профиль'}</h1>
      </div>
      <ProfileTabs slots={slots} allItems={allItems} cases={cases} viewerIsOwner={viewerIsOwner} />
    </main>
  );
}
