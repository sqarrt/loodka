import { CATALOG_SORTS, type CatalogSort, type SortDirection } from '@/lib/catalog';
import { getTitleSuggestions, getAuthorSuggestions } from '@/app/actions/search-suggestions';
import { SuggestInput } from '@/components/SuggestInput';

function buildHref(params: Record<string, string | undefined>) {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) usp.set(key, value);
  }
  const qs = usp.toString();
  return qs ? `/?${qs}` : '/';
}

// Three-click cycle per chip: click an inactive chip -> activate it at its
// default direction; click the active chip -> flip direction; click again ->
// clear back to the implicit default (popular, desc, nothing highlighted).
function nextSortState(
  chipValue: CatalogSort,
  chipDefaultDir: SortDirection,
  currentSort: CatalogSort,
  currentDir: SortDirection,
  isExplicit: boolean
): { sort?: CatalogSort; dir?: SortDirection } {
  if (!isExplicit || currentSort !== chipValue) {
    return { sort: chipValue, dir: chipDefaultDir };
  }
  if (currentDir === chipDefaultDir) {
    return { sort: chipValue, dir: chipDefaultDir === 'asc' ? 'desc' : 'asc' };
  }
  return {};
}

const inputClass =
  'h-10 w-full rounded-md border border-line-strong bg-surface-card px-3 text-body outline-none focus:border-gold';

export function CatalogFilters({
  title,
  author,
  priceMin,
  priceMax,
  sort,
  dir,
  sortExplicit,
}: {
  title?: string;
  author?: string;
  priceMin?: number;
  priceMax?: number;
  sort: CatalogSort;
  dir: SortDirection;
  sortExplicit: boolean;
}) {
  const baseParams = {
    title,
    author,
    priceMin: priceMin ? String(priceMin) : undefined,
    priceMax: priceMax ? String(priceMax) : undefined,
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.12em] text-text-muted">
          сортировка
        </span>
        {CATALOG_SORTS.map((s) => {
          const isActive = sortExplicit && sort === s.value;
          const next = nextSortState(s.value, s.defaultDir, sort, dir, sortExplicit);
          return (
            <a
              key={s.value}
              href={buildHref({ ...baseParams, sort: next.sort, dir: next.dir })}
              className={`flex h-8 items-center gap-1.5 rounded-full border px-3 font-mono text-[11px] uppercase tracking-[0.08em] ${
                isActive
                  ? 'border-gold text-gold'
                  : 'border-line text-text-muted hover:border-line-strong hover:text-text-secondary'
              }`}
            >
              {s.label}
              {isActive && <span>{dir === 'asc' ? '↑' : '↓'}</span>}
            </a>
          );
        })}
      </div>

      <form
        method="get"
        className="grid grid-cols-1 items-end gap-3 rounded-lg border border-line bg-inset p-4 sm:grid-cols-[2fr_1fr_100px_100px_auto]"
      >
        {sortExplicit && <input type="hidden" name="sort" value={sort} />}
        {sortExplicit && <input type="hidden" name="dir" value={dir} />}
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-muted">
            название
          </span>
          <SuggestInput
            name="title"
            defaultValue={title}
            fetchSuggestions={getTitleSuggestions}
            inputClassName={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-muted">
            автор
          </span>
          <SuggestInput
            name="author"
            defaultValue={author}
            fetchSuggestions={getAuthorSuggestions}
            hintSuffix=" кейсов"
            inputClassName={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-muted">
            цена от
          </span>
          <input
            name="priceMin"
            type="number"
            min={1}
            defaultValue={priceMin}
            className={`${inputClass} font-mono`}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-muted">
            цена до
          </span>
          <input
            name="priceMax"
            type="number"
            min={1}
            defaultValue={priceMax}
            className={`${inputClass} font-mono`}
          />
        </label>
        <button
          type="submit"
          className="flex h-10 items-center justify-center rounded-md bg-gold px-5 font-display text-caps uppercase text-bg hover:bg-gold-hover"
        >
          Найти
        </button>
      </form>
    </div>
  );
}
