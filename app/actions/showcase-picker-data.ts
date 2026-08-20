'use server';

import { createClient } from '@/lib/supabase/server';
import { resolveImageUrl } from '@/lib/storage';
import { mapInventoryToDisplayItems, type InventoryRowWithItem } from '@/lib/inventory';

const PAGE_SIZE = 20;

export type PickerItem = { inventoryId: string; name: string; imageUrl: string; probability?: number };
export type PickerCase = { id: string; title: string; itemCount: number; coverImageUrl: string | null };

export async function getInventoryPage(
  query: string,
  page: number,
  excludeIds?: string[]
): Promise<{ items: PickerItem[]; hasMore: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { items: [], hasMore: false };

  const from = page * PAGE_SIZE;
  const select = query.trim()
    ? 'id, cashback_value, obtained_at, case_items!inner(name, image_path, weight, case_id)'
    : 'id, cashback_value, obtained_at, case_items(name, image_path, weight, case_id)';
  let q = supabase
    .from('inventory')
    .select(select)
    .eq('user_id', user.id)
    .order('obtained_at', { ascending: false })
    .range(from, from + PAGE_SIZE);

  if (query.trim()) q = q.ilike('case_items.name', `%${query.trim()}%`);
  if (excludeIds?.length) q = q.not('id', 'in', `(${excludeIds.join(',')})`);

  const { data } = await q;
  const rows = (data ?? []) as unknown as InventoryRowWithItem[];
  const hasMore = rows.length > PAGE_SIZE;
  const page_ = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const displayItems = mapInventoryToDisplayItems(page_);

  // Rarity is odds *within the item's own case* — that needs every
  // referenced case's current total active weight, same batched approach
  // as app/u/[userId]/page.tsx.
  const caseIds = [...new Set(displayItems.map((item) => item.caseId).filter((id): id is string => id !== null))];
  const { data: siblingWeightRows } = caseIds.length
    ? await supabase.from('case_items').select('case_id, weight').in('case_id', caseIds).eq('removed', false)
    : { data: [] };
  const totalWeightByCase = new Map<string, number>();
  for (const row of siblingWeightRows ?? []) {
    totalWeightByCase.set(row.case_id, (totalWeightByCase.get(row.case_id) ?? 0) + row.weight);
  }

  const items = displayItems.map((item) => {
    const totalWeight = item.caseId ? totalWeightByCase.get(item.caseId) : undefined;
    return {
      inventoryId: item.inventoryId,
      name: item.name,
      imageUrl: item.image_path ? resolveImageUrl(supabase, item.image_path) : '',
      probability: item.weight && totalWeight ? item.weight / totalWeight : undefined,
    };
  });

  return { items, hasMore };
}

export async function getOwnCasesPage(
  query: string,
  page: number,
  excludeIds?: string[]
): Promise<{ cases: PickerCase[]; hasMore: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { cases: [], hasMore: false };

  const from = page * PAGE_SIZE;
  let q = supabase
    .from('cases')
    .select('id, title, cover_image_path, case_items(id)')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .eq('case_items.removed', false)
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE);

  if (query.trim()) q = q.ilike('title', `%${query.trim()}%`);
  if (excludeIds?.length) q = q.not('id', 'in', `(${excludeIds.join(',')})`);

  const { data } = await q;
  const rows = data ?? [];
  const hasMore = rows.length > PAGE_SIZE;
  const page_ = hasMore ? rows.slice(0, PAGE_SIZE) : rows;

  return {
    cases: page_.map((c) => ({
      id: c.id,
      title: c.title,
      itemCount: c.case_items.length,
      coverImageUrl: c.cover_image_path ? resolveImageUrl(supabase, c.cover_image_path) : null,
    })),
    hasMore,
  };
}
