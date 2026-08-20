'use server';

import { createClient } from '@/lib/supabase/server';

const MAX_LENGTH = 24;

export async function updateDisplayName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return { error: 'Имя не может быть пустым.' };
  if (trimmed.length > MAX_LENGTH) return { error: `Имя не длиннее ${MAX_LENGTH} символов.` };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Нужно войти через Google.' };

  const { error } = await supabase.from('profiles').update({ display_name: trimmed }).eq('user_id', user.id);
  if (error) return { error: error.message };
  return { ok: true as const };
}
