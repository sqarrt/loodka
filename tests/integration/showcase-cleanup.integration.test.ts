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

async function createCaseWithItems(authorId: string, title: string, price: number) {
  const { data: caseRow } = await admin
    .from('cases')
    .insert({ user_id: authorId, title, price })
    .select('id')
    .single();
  await admin.from('case_items').insert([
    { case_id: caseRow!.id, name: 'A', image_path: 'a.png', weight: 1, position: 0 },
    { case_id: caseRow!.id, name: 'B', image_path: 'b.png', weight: 1, position: 1 },
  ]);
  return caseRow!.id as string;
}

describe('cash_back_item showcase cleanup', () => {
  it('clears the slot an item occupied when it is cashed back', async () => {
    const author = await createSignedInUser(`author-${Date.now()}@example.com`, 0);
    const opener = await createSignedInUser(`opener-${Date.now()}@example.com`, 100);
    const caseId = await createCaseWithItems(author.userId, 'Showcase Cleanup Test', 10);

    await opener.client.rpc('open_case_for_real', { p_case_id: caseId });
    const { data: inventoryRow } = await admin
      .from('inventory')
      .select('id')
      .eq('user_id', opener.userId)
      .eq('case_id', caseId)
      .single();
    const inventoryId = inventoryRow!.id;

    await admin
      .from('showcase_slots')
      .insert({ user_id: opener.userId, slot_index: 4, inventory_id: inventoryId });

    await opener.client.rpc('cash_back_item', { p_inventory_id: inventoryId });

    const { data: slotRows } = await admin
      .from('showcase_slots')
      .select('slot_index')
      .eq('user_id', opener.userId);
    expect(slotRows).toHaveLength(0);
  });
});
