import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(url, serviceRoleKey);

async function createSignedInUser(email: string, balance: number) {
  const password = 'test-password-123';
  const { data } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  const userId = data.user!.id;
  await admin.from('profiles').insert({
    user_id: userId,
    balance,
    last_daily_claim_at: '2026-08-16',
    display_name: email.split('@')[0],
  });
  const client = createClient(url, anonKey);
  await client.auth.signInWithPassword({ email, password });
  return { userId, client };
}

describe('showcase_slots reassignment', () => {
  it('moving an item to a new slot clears its old slot (unique inventory_id)', async () => {
    const author = await createSignedInUser(`author-${Date.now()}@example.com`, 0);
    const opener = await createSignedInUser(`opener-${Date.now()}@example.com`, 100);

    const { data: caseRow } = await admin
      .from('cases')
      .insert({ user_id: author.userId, title: 'Slot Move Test', price: 10 })
      .select('id')
      .single();
    await admin
      .from('case_items')
      .insert([{ case_id: caseRow!.id, name: 'A', image_path: 'a.png', weight: 1, position: 0 }]);

    await opener.client.rpc('open_case_for_real', { p_case_id: caseRow!.id });
    const { data: inventoryRow } = await admin
      .from('inventory')
      .select('id')
      .eq('user_id', opener.userId)
      .eq('case_id', caseRow!.id)
      .single();
    const inventoryId = inventoryRow!.id;

    // Mirrors setShowcaseSlot's delete-then-upsert pattern directly.
    await opener.client
      .from('showcase_slots')
      .insert({ user_id: opener.userId, slot_index: 1, inventory_id: inventoryId });
    await opener.client.from('showcase_slots').delete().eq('inventory_id', inventoryId);
    await opener.client
      .from('showcase_slots')
      .upsert({ user_id: opener.userId, slot_index: 7, inventory_id: inventoryId });

    const { data: slots } = await opener.client
      .from('showcase_slots')
      .select('slot_index')
      .eq('user_id', opener.userId);
    expect(slots).toHaveLength(1);
    expect(slots![0].slot_index).toBe(7);
  });
});
