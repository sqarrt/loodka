import { createClient } from '@/lib/supabase/server';
import { GoogleLoginButton } from '@/components/GoogleLoginButton';
import { CatalogFilters } from '@/components/CatalogFilters';
import { CatalogGrid } from '@/components/CatalogGrid';
import { fetchCatalogPage, resolveSort } from '@/lib/catalog';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{
    title?: string;
    author?: string;
    priceMin?: string;
    priceMax?: string;
    sort?: string;
    dir?: string;
  }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const sp = await searchParams;
  const { sort, dir, explicit: sortExplicit } = resolveSort(sp.sort, sp.dir);
  const priceMin = sp.priceMin ? Number(sp.priceMin) : undefined;
  const priceMax = sp.priceMax ? Number(sp.priceMax) : undefined;
  const filters = { title: sp.title, author: sp.author, priceMin, priceMax, sort, dir };

  const { cases, nextCursor } = await fetchCatalogPage(supabase, filters, null);

  return (
    <main className="mx-auto flex w-full max-w-[1140px] flex-col gap-10 px-10 py-14">
      {!user && (
        <div className="flex flex-col items-center gap-5 py-10 text-center">
          <h1 className="font-display text-display-xl uppercase leading-none">
            Собери кейс
            <br />и разыграй друга
          </h1>
          <p className="max-w-md text-body-lg text-text-secondary">
            Кидаешь ссылку — он крутит и получает что-то нелепое. Бесплатно, в
            демо-режиме.
          </p>
          <GoogleLoginButton />
          <span className="font-mono text-caps text-text-dim">
            без логина можно смотреть и крутить демо
          </span>
        </div>
      )}

      <div className="flex flex-col gap-5">
        <CatalogFilters
          title={sp.title}
          author={sp.author}
          priceMin={priceMin}
          priceMax={priceMax}
          sort={sort}
          dir={dir}
          sortExplicit={sortExplicit}
        />
        <CatalogGrid initialCases={cases} initialCursor={nextCursor} filters={filters} />
      </div>
    </main>
  );
}
