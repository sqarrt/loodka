'use server';

import { createClient } from '@/lib/supabase/server';
import { resolveImageUrl } from '@/lib/storage';
import { mapInventoryToDisplayItems, type InventoryRowWithItem } from '@/lib/inventory';

const PAGE_SIZE = 20;

export type PickerItem = { inventoryId: string; name: string; imageUrl: string };
export type PickerCase = { id: string; title: string; itemCount: number };

export async function getInventoryPage(
  query: string,
  page: number
): Promise<{ items: PickerItem[]; hasMore: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { items: [], hasMore: false };

  const from = page * PAGE_SIZE;
  const select = query.trim()
    ? 'id, cashback_value, obtained_at, case_items!inner(name, image_path)'
    : 'id, cashback_value, obtained_at, case_items(name, image_path)';
  let q = supabase
    .from('inventory')
    .select(select)
    .eq('user_id', user.id)
    .order('obtained_at', { ascending: false })
    .range(from, from + PAGE_SIZE);

  if (query.trim()) q = q.ilike('case_items.name', `%${query.trim()}%`);

  const { data } = await q;
  const rows = (data ?? []) as unknown as InventoryRowWithItem[];
  const hasMore = rows.length > PAGE_SIZE;
  const page_ = hasMore ? rows.slice(0, PAGE_SIZE) : rows;

  const items = mapInventoryToDisplayItems(page_).map((item) => ({
    inventoryId: item.inventoryId,
    name: item.name,
    imageUrl: item.image_path ? resolveImageUrl(supabase, item.image_path) : '',
  }));

  return { items, hasMore };
}

export async function getOwnCasesPage(
  query: string,
  page: number
): Promise<{ cases: PickerCase[]; hasMore: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { cases: [], hasMore: false };

  const from = page * PAGE_SIZE;
  let q = supabase
    .from('cases')
    .select('id, title, case_items(id)')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .eq('case_items.removed', false)
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE);

  if (query.trim()) q = q.ilike('title', `%${query.trim()}%`);

  const { data } = await q;
  const rows = data ?? [];
  const hasMore = rows.length > PAGE_SIZE;
  const page_ = hasMore ? rows.slice(0, PAGE_SIZE) : rows;

  return {
    cases: page_.map((c) => ({ id: c.id, title: c.title, itemCount: c.case_items.length })),
    hasMore,
  };
}
