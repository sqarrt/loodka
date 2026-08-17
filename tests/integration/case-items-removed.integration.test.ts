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

describe('soft-removed case_items', () => {
  it("is excluded from open_case_for_real's weighted pick", async () => {
    const author = await createSignedInUser(`author-${Date.now()}@example.com`, 0);
    const opener = await createSignedInUser(`opener-${Date.now()}@example.com`, 100);

    const { data: caseRow } = await admin
      .from('cases')
      .insert({ user_id: author.userId, title: 'Removed Item Test', price: 10 })
      .select('id')
      .single();

    const { data: itemRows } = await admin
      .from('case_items')
      .insert([
        {
          case_id: caseRow!.id,
          name: 'Active',
          image_path: 'a.png',
          weight: 1,
          position: 0,
          removed: false,
        },
        {
          case_id: caseRow!.id,
          name: 'Removed',
          image_path: 'r.png',
          weight: 999, // huge weight — if it were pickable, it would win nearly every time
          position: 1,
          removed: true,
        },
      ])
      .select('id, name');

    const { data, error } = await opener.client.rpc('open_case_for_real', {
      p_case_id: caseRow!.id,
    });

    expect(error).toBeNull();
    const result = data![0];
    const removedItem = itemRows!.find((i) => i.name === 'Removed')!;
    expect(result.item_id).not.toBe(removedItem.id);
  });

  it('still resolves its name/image for an inventory row obtained before removal', async () => {
    const author = await createSignedInUser(`author2-${Date.now()}@example.com`, 0);
    const opener = await createSignedInUser(`opener2-${Date.now()}@example.com`, 100);

    const { data: caseRow } = await admin
      .from('cases')
      .insert({ user_id: author.userId, title: 'Removed After Obtain Test', price: 10 })
      .select('id')
      .single();
    const { data: itemRows } = await admin
      .from('case_items')
      .insert([{ case_id: caseRow!.id, name: 'Doomed', image_path: 'd.png', weight: 1, position: 0 }])
      .select('id');

    await opener.client.rpc('open_case_for_real', { p_case_id: caseRow!.id });

    // Soft-remove it after the player already obtained a copy.
    await admin.from('case_items').update({ removed: true }).eq('id', itemRows![0].id);

    const { data: inventoryRows } = await admin
      .from('inventory')
      .select('id, case_items(name, image_path)')
      .eq('user_id', opener.userId)
      .eq('case_id', caseRow!.id);

    expect(inventoryRows).toHaveLength(1);
    expect(inventoryRows![0].case_items).toEqual({ name: 'Doomed', image_path: 'd.png' });
  });
});
