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

  return (
    <main className="mx-auto flex max-w-[1140px] flex-col gap-6 px-10 py-10">
      <h1 className="font-display text-display-lg uppercase">Профиль</h1>
      <ProfileTabs slots={slots} allItems={allItems} viewerIsOwner={viewerIsOwner} />
    </main>
  );
}
