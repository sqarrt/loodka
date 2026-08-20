import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SettingsForm } from './SettingsForm';

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('user_id', user.id)
    .maybeSingle();

  return (
    <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col gap-6 px-10 py-10">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-caps uppercase text-text-muted">настройки</span>
        <h1 className="font-display text-display-lg uppercase">Настройки профиля</h1>
      </div>
      <SettingsForm initialDisplayName={profile?.display_name ?? ''} />
    </main>
  );
}
