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
  await admin.from('profiles').insert({ user_id: userId, balance, last_daily_claim_at: '2026-08-16' });
  const client = createClient(url, anonKey);
  await client.auth.signInWithPassword({ email, password });
  return { userId, client };
}

describe('cash_back_item showcase cleanup', () => {
  it('clears the slot an item occupied when it is cashed back', async () => {
    const author = await createSignedInUser(`author-${Date.now()}@example.com`, 0);
    const opener = await createSignedInUser(`opener-${Date.now()}@example.com`, 100);
    const items = [
      { id: crypto.randomUUID(), name: 'A', image_path: 'a.png', weight: 1 },
      { id: crypto.randomUUID(), name: 'B', image_path: 'b.png', weight: 1 },
    ];
    const { data: caseRow } = await admin
      .from('cases')
      .insert({ user_id: author.userId, title: 'Showcase Cleanup Test', price: 10, items })
      .select('id')
      .single();

    await opener.client.rpc('open_case_for_real', {
      p_case_id: caseRow!.id,
    });
    const { data: inventoryRow } = await admin
      .from('inventory')
      .select('id')
      .eq('user_id', opener.userId)
      .eq('case_id', caseRow!.id)
      .single();
    const inventoryId = inventoryRow!.id;

    const slots = Array(12).fill(null);
    slots[4] = inventoryId;
    await admin.from('profile_showcases').insert({ user_id: opener.userId, slots });

    await opener.client.rpc('cash_back_item', { p_inventory_id: inventoryId });

    const { data: showcase } = await admin
      .from('profile_showcases')
      .select('slots')
      .eq('user_id', opener.userId)
      .single();
    expect(showcase!.slots[4]).toBeNull();
  });
});
