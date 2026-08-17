'use server';

import { createClient } from '@/lib/supabase/server';

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

  // Clear whatever slot this item currently occupies (if any) before
  // placing it elsewhere — showcase_slots.inventory_id is unique, so an
  // item can only ever be in one slot at a time.
  const { error: clearError } = await supabase
    .from('showcase_slots')
    .delete()
    .eq('inventory_id', inventoryId);

  if (clearError) return { error: clearError.message };

  if (slotIndex !== null) {
    const { error: insertError } = await supabase
      .from('showcase_slots')
      .upsert({ user_id: user.id, slot_index: slotIndex, inventory_id: inventoryId });

    if (insertError) return { error: insertError.message };
  }

  return { ok: true };
}
