import type { SupabaseClient } from '@supabase/supabase-js';
import { computeOdds, type CaseItem } from '@/lib/cases';
import { getRarityTier, type RarityTier } from '@/lib/rarity';
import { resolveImageUrl } from '@/lib/storage';

export type CatalogSort = 'popular' | 'new' | 'price' | 'alpha';
export type SortDirection = 'asc' | 'desc';
type SortColumn = 'open_count' | 'created_at' | 'price' | 'title';

export const CATALOG_SORTS: {
  value: CatalogSort;
  label: string;
  column: SortColumn;
  defaultDir: SortDirection;
}[] = [
  { value: 'popular', label: 'популярность', column: 'open_count', defaultDir: 'desc' },
  { value: 'new', label: 'новизна', column: 'created_at', defaultDir: 'desc' },
  { value: 'price', label: 'цена', column: 'price', defaultDir: 'asc' },
  { value: 'alpha', label: 'алфавит', column: 'title', defaultDir: 'asc' },
];

const DEFAULT_SORT: CatalogSort = 'popular';

export function defaultDirFor(sort: CatalogSort): SortDirection {
  return CATALOG_SORTS.find((s) => s.value === sort)!.defaultDir;
}

export const CATALOG_PAGE_SIZE = 9;

export type CatalogCase = {
  id: string;
  title: string;
  price: number;
  authorId: string;
  authorName: string;
  itemCount: number;
  openCount: number;
  createdAt: string;
  topRarity: RarityTier;
  coverImageUrl: string | null;
};

export type CatalogFilters = {
  title?: string;
  author?: string;
  priceMin?: number;
  priceMax?: number;
  sort: CatalogSort;
  dir: SortDirection;
};

// PostgREST's .or() splits on bare commas/parens, so any cursor value that
// might contain them (title, under 'alpha' sort) must be double-quoted with
// backslash-escaping — numeric/timestamp cursor values never contain either
// and are safe to interpolate as-is.
function pgQuote(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

export type CatalogCursor = { v: string; id: string };

export function encodeCatalogCursor(cursor: CatalogCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

export function decodeCatalogCursor(raw: string | undefined): CatalogCursor | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    if (typeof parsed?.v === 'string' && typeof parsed?.id === 'string') return parsed;
  } catch {
    // Malformed/tampered cursor — treat as "no cursor" rather than erroring.
  }
  return null;
}

type CaseRow = {
  id: string;
  title: string;
  price: number;
  user_id: string;
  open_count: number;
  created_at: string;
  cover_image_path: string | null;
  case_items: CaseItem[];
};

export async function fetchCatalogPage(
  supabase: SupabaseClient,
  filters: CatalogFilters,
  cursor: CatalogCursor | null
): Promise<{ cases: CatalogCase[]; nextCursor: string | null }> {
  let authorIds: string[] | null = null;
  if (filters.author?.trim()) {
    const { data: authorRows } = await supabase
      .from('profiles')
      .select('user_id')
      .ilike('display_name', `%${filters.author.trim()}%`);
    authorIds = (authorRows ?? []).map((r) => r.user_id);
    if (authorIds.length === 0) return { cases: [], nextCursor: null };
  }

  const sortConfig = CATALOG_SORTS.find((s) => s.value === filters.sort) ?? CATALOG_SORTS[0];
  const column = sortConfig.column;
  const ascending = filters.dir === 'asc';

  let query = supabase
    .from('cases')
    .select(
      'id, title, price, user_id, open_count, created_at, cover_image_path, case_items(id, name, image_path, weight)'
    )
    .is('deleted_at', null)
    .eq('case_items.removed', false);
  if (filters.title?.trim()) query = query.ilike('title', `%${filters.title.trim()}%`);
  if (authorIds) query = query.in('user_id', authorIds);
  if (filters.priceMin) query = query.gte('price', filters.priceMin);
  if (filters.priceMax) query = query.lte('price', filters.priceMax);

  if (cursor) {
    const op = ascending ? 'gt' : 'lt';
    const cursorValue = column === 'title' ? pgQuote(cursor.v) : cursor.v;
    query = query.or(`${column}.${op}.${cursorValue},and(${column}.eq.${cursorValue},id.${op}.${cursor.id})`);
  }

  const { data, error } = await query
    .order(column, { ascending })
    .order('id', { ascending })
    .limit(CATALOG_PAGE_SIZE + 1);

  if (error || !data) return { cases: [], nextCursor: null };

  const rows = data as unknown as CaseRow[];
  const hasMore = rows.length > CATALOG_PAGE_SIZE;
  const page = hasMore ? rows.slice(0, CATALOG_PAGE_SIZE) : rows;

  const authorIdsToLoad = [...new Set(page.map((row) => row.user_id))];
  const { data: authorProfiles } = authorIdsToLoad.length
    ? await supabase.from('profiles').select('user_id, display_name').in('user_id', authorIdsToLoad)
    : { data: [] };
  const authorNameById = new Map((authorProfiles ?? []).map((p) => [p.user_id, p.display_name]));

  const cases: CatalogCase[] = page.map((row) => {
    const items = row.case_items ?? [];
    const withOdds = computeOdds(items);
    const rarest = withOdds.reduce(
      (min, item) => (item.probability < min.probability ? item : min),
      withOdds[0]
    );
    return {
      id: row.id,
      title: row.title,
      price: row.price,
      authorId: row.user_id,
      authorName: authorNameById.get(row.user_id) ?? 'игрок',
      itemCount: items.length,
      openCount: row.open_count,
      createdAt: row.created_at,
      topRarity: rarest ? getRarityTier(rarest.probability) : 'common',
      coverImageUrl: row.cover_image_path ? resolveImageUrl(supabase, row.cover_image_path) : null,
    };
  });

  let nextCursor: string | null = null;
  if (hasMore) {
    const last = page[page.length - 1];
    const v = column === 'created_at' ? last.created_at : column === 'title' ? last.title : String(last[column]);
    nextCursor = encodeCatalogCursor({ v, id: last.id });
  }

  return { cases, nextCursor };
}

export function resolveSort(
  sortParam: string | undefined,
  dirParam: string | undefined
): { sort: CatalogSort; dir: SortDirection } {
  const sort = CATALOG_SORTS.some((s) => s.value === sortParam) ? (sortParam as CatalogSort) : DEFAULT_SORT;
  const dir = dirParam === 'asc' || dirParam === 'desc' ? dirParam : defaultDirFor(sort);
  return { sort, dir };
}
