'use server';

import { createClient } from '@/lib/supabase/server';
import { assignItemToSlot } from '@/lib/showcase';

export async function setShowcaseSlot(inventoryId: string, slotIndex: number | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Нужно войти через Google.' };

  const { data: invRow } = await supabase
    .from('inventory')
    .select('user_id')
    .eq('id', inventoryId)
    .maybeSingle();

  if (!invRow || invRow.user_id !== user.id) {
    return { error: 'Это не твой предмет.' };
  }

  const { data: showcase } = await supabase
    .from('profile_showcases')
    .select('slots')
    .eq('user_id', user.id)
    .maybeSingle();

  const currentSlots = ((showcase?.slots as (string | null)[]) ?? Array(12).fill(null)) as (
    | string
    | null
  )[];
  const updatedSlots = assignItemToSlot(currentSlots, inventoryId, slotIndex);

  const { error } = await supabase
    .from('profile_showcases')
    .upsert({ user_id: user.id, slots: updatedSlots });

  if (error) return { error: error.message };

  return { slots: updatedSlots };
}
