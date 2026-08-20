'use server';

import { createClient } from '@/lib/supabase/server';

export type Suggestion = { value: string; hint?: string };

export async function getTitleSuggestions(query: string): Promise<Suggestion[]> {
  const q = query.trim();
  if (!q) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from('cases')
    .select('title')
    .is('deleted_at', null)
    .ilike('title', `%${q}%`)
    .limit(20);

  const seen = new Set<string>();
  const suggestions: Suggestion[] = [];
  for (const row of data ?? []) {
    if (seen.has(row.title)) continue;
    seen.add(row.title);
    suggestions.push({ value: row.title });
    if (suggestions.length >= 6) break;
  }
  return suggestions;
}

export async function getAuthorSuggestions(query: string): Promise<Suggestion[]> {
  const q = query.trim();
  if (!q) return [];
  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from('profile_names')
    .select('user_id, display_name')
    .ilike('display_name', `%${q}%`)
    .limit(6);

  if (!profiles?.length) return [];

  const userIds = profiles.map((p) => p.user_id);
  const { data: counts } = await supabase
    .from('cases')
    .select('user_id')
    .is('deleted_at', null)
    .in('user_id', userIds);

  const countByUser = new Map<string, number>();
  for (const row of counts ?? []) {
    countByUser.set(row.user_id, (countByUser.get(row.user_id) ?? 0) + 1);
  }

  return profiles.map((p) => ({
    value: p.display_name,
    hint: String(countByUser.get(p.user_id) ?? 0),
  }));
}
