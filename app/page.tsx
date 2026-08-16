import { createClient } from '@/lib/supabase/server';
import { claimDailyBonus } from '@/app/actions/claim-daily-bonus';

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main>
        <p>Не залогинен.</p>
        <a href="/login">Войти через Google</a>
      </main>
    );
  }

  const profile = await claimDailyBonus();

  return (
    <main>
      <p>Привет, {user.email}</p>
      <p>Баланс: {profile?.balance ?? 0} лудок</p>
      <form action="/auth/signout" method="post">
        <button type="submit">Выйти</button>
      </form>
    </main>
  );
}
