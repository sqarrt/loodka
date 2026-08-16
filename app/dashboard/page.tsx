import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: cases } = await supabase
    .from('cases')
    .select('id, title, price, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <main>
      <h1>Мои кейсы</h1>
      <ul>
        {(cases ?? []).map((c) => (
          <li key={c.id}>
            <a href={`/case/${c.id}`}>{c.title}</a> — {c.price} лудок
          </li>
        ))}
      </ul>
    </main>
  );
}
