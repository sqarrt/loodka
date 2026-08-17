import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolveImageUrl } from '@/lib/storage';
import { CaseEditForm } from './CaseEditForm';

export default async function CaseEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: caseRow } = await supabase
    .from('cases')
    .select(
      'id, title, price, user_id, open_count, created_at, deleted_at, case_items(id, name, image_path, weight, removed)'
    )
    .eq('id', id)
    .order('position', { referencedTable: 'case_items' })
    .maybeSingle();

  if (!caseRow || caseRow.deleted_at || caseRow.user_id !== user.id) notFound();

  const { data: config } = await supabase
    .from('platform_config')
    .select('author_share')
    .maybeSingle();
  const authorShare = config?.author_share ?? 0.5;
  const earned = Math.floor(caseRow.price * caseRow.open_count * authorShare);

  const items = caseRow.case_items.map((item) => ({
    id: item.id,
    name: item.name,
    weight: item.weight,
    removed: item.removed,
    imageUrl: resolveImageUrl(supabase, item.image_path),
  }));

  return (
    <main className="mx-auto flex w-full max-w-[1140px] flex-col gap-6 px-10 py-10">
      <CaseEditForm
        caseId={caseRow.id}
        title={caseRow.title}
        price={caseRow.price}
        openCount={caseRow.open_count}
        earned={earned}
        createdAt={caseRow.created_at}
        initialItems={items}
      />
    </main>
  );
}
