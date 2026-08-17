'use server';

import { createClient } from '@/lib/supabase/server';

type Selection = { type: 'item'; inventoryId: string } | { type: 'case'; caseId: string } | null;

export async function setShowcaseSlot(slotIndex: number, selection: Selection) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Нужно войти через Google.' };

  if (selection === null) {
    const { error } = await supabase
      .from('showcase_slots')
      .delete()
      .eq('user_id', user.id)
      .eq('slot_index', slotIndex);
    if (error) return { error: error.message };
    return { ok: true as const };
  }

  if (selection.type === 'item') {
    const { data: invRow } = await supabase
      .from('inventory')
      .select('user_id')
      .eq('id', selection.inventoryId)
      .maybeSingle();
    if (!invRow || invRow.user_id !== user.id) return { error: 'Это не твой предмет.' };

    // showcase_slots.inventory_id is unique — clear whatever slot this
    // item currently occupies before placing it elsewhere.
    await supabase.from('showcase_slots').delete().eq('inventory_id', selection.inventoryId);

    const { error } = await supabase
      .from('showcase_slots')
      .upsert({ user_id: user.id, slot_index: slotIndex, inventory_id: selection.inventoryId, case_id: null });
    if (error) return { error: error.message };
    return { ok: true as const };
  }

  const { data: caseRow } = await supabase
    .from('cases')
    .select('user_id, deleted_at')
    .eq('id', selection.caseId)
    .maybeSingle();
  if (!caseRow || caseRow.user_id !== user.id || caseRow.deleted_at) {
    return { error: 'Это не твой кейс.' };
  }

  const { error } = await supabase
    .from('showcase_slots')
    .upsert({ user_id: user.id, slot_index: slotIndex, inventory_id: null, case_id: selection.caseId });
  if (error) return { error: error.message };
  return { ok: true as const };
}
