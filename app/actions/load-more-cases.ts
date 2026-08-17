'use server';

import { createClient } from '@/lib/supabase/server';
import { fetchCatalogPage, decodeCatalogCursor, type CatalogFilters, type CatalogCase } from '@/lib/catalog';

export async function loadMoreCases(
  filters: CatalogFilters,
  cursorRaw: string
): Promise<{ cases: CatalogCase[]; nextCursor: string | null }> {
  const supabase = await createClient();
  return fetchCatalogPage(supabase, filters, decodeCatalogCursor(cursorRaw));
}
