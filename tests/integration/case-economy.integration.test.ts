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

describe('open_case_for_real', () => {
  it('debits the opener, credits the author, and inserts an inventory row', async () => {
    const author = await createSignedInUser(`author-${Date.now()}@example.com`, 0);
    const opener = await createSignedInUser(`opener-${Date.now()}@example.com`, 100);

    // Equal weights: cashback is identical either way, so the assertion
    // doesn't depend on which item the random roll picks.
    const items = [
      { id: crypto.randomUUID(), name: 'A', image_path: 'a.png', weight: 1 },
      { id: crypto.randomUUID(), name: 'B', image_path: 'b.png', weight: 1 },
    ];
    const { data: caseRow } = await admin
      .from('cases')
      .insert({ user_id: author.userId, title: 'Economy Test', price: 10, items })
      .select('id')
      .single();

    const { data, error } = await opener.client.rpc('open_case_for_real', {
      p_case_id: caseRow!.id,
    });

    expect(error).toBeNull();
    const result = data![0];
    expect(items.map((i) => i.id)).toContain(result.item_id);
    expect(result.cashback_value).toBe(5); // floor((0.5*10)/(2*0.5))
    expect(result.new_balance).toBe(90);

    const { data: authorProfile } = await admin
      .from('profiles')
      .select('balance')
      .eq('user_id', author.userId)
      .single();
    expect(authorProfile!.balance).toBe(5); // floor(0.5*10)

    const { data: inventoryRows } = await admin
      .from('inventory')
      .select('item_id, cashback_value')
      .eq('user_id', opener.userId)
      .eq('case_id', caseRow!.id);
    expect(inventoryRows).toHaveLength(1);
    expect(inventoryRows![0].item_id).toBe(result.item_id);
  });

  it('computes cashback proportional to rarity, matching the JS formula', async () => {
    const author = await createSignedInUser(`author2-${Date.now()}@example.com`, 0);
    const opener = await createSignedInUser(`opener2-${Date.now()}@example.com`, 100);

    const items = [
      { id: crypto.randomUUID(), name: 'Common', image_path: 'c.png', weight: 9 },
      { id: crypto.randomUUID(), name: 'Rare', image_path: 'r.png', weight: 1 },
    ];
    const price = 10;
    const { data: caseRow } = await admin
      .from('cases')
      .insert({ user_id: author.userId, title: 'Rarity Test', price, items })
      .select('id')
      .single();

    const { data } = await opener.client.rpc('open_case_for_real', { p_case_id: caseRow!.id });
    const result = data![0];

    const totalWeight = items.reduce((s, i) => s + i.weight, 0);
    const winner = items.find((i) => i.id === result.item_id)!;
    const prob = winner.weight / totalWeight;
    const expectedCashback = Math.floor((0.5 * price) / (items.length * prob));

    expect(result.cashback_value).toBe(expectedCashback);
  });

  it('rejects the author opening their own case for real', async () => {
    const author = await createSignedInUser(`author3-${Date.now()}@example.com`, 100);
    const items = [
      { id: crypto.randomUUID(), name: 'A', image_path: 'a.png', weight: 1 },
      { id: crypto.randomUUID(), name: 'B', image_path: 'b.png', weight: 1 },
    ];
    const { data: caseRow } = await admin
      .from('cases')
      .insert({ user_id: author.userId, title: 'Self Open Test', price: 10, items })
      .select('id')
      .single();

    const { error } = await author.client.rpc('open_case_for_real', { p_case_id: caseRow!.id });
    expect(error).not.toBeNull();
  });

  it('rejects an opener with insufficient balance', async () => {
    const author = await createSignedInUser(`author4-${Date.now()}@example.com`, 0);
    const opener = await createSignedInUser(`opener4-${Date.now()}@example.com`, 1);
    const items = [
      { id: crypto.randomUUID(), name: 'A', image_path: 'a.png', weight: 1 },
      { id: crypto.randomUUID(), name: 'B', image_path: 'b.png', weight: 1 },
    ];
    const { data: caseRow } = await admin
      .from('cases')
      .insert({ user_id: author.userId, title: 'Poor Test', price: 10, items })
      .select('id')
      .single();

    const { error } = await opener.client.rpc('open_case_for_real', { p_case_id: caseRow!.id });
    expect(error).not.toBeNull();
  });
});

describe('cash_back_item', () => {
  it('deletes the inventory row and credits the balance', async () => {
    const author = await createSignedInUser(`author5-${Date.now()}@example.com`, 0);
    const opener = await createSignedInUser(`opener5-${Date.now()}@example.com`, 100);
    const items = [
      { id: crypto.randomUUID(), name: 'A', image_path: 'a.png', weight: 1 },
      { id: crypto.randomUUID(), name: 'B', image_path: 'b.png', weight: 1 },
    ];
    const { data: caseRow } = await admin
      .from('cases')
      .insert({ user_id: author.userId, title: 'Cashback Test', price: 10, items })
      .select('id')
      .single();

    await opener.client.rpc('open_case_for_real', { p_case_id: caseRow!.id });
    const { data: inventoryRows } = await admin
      .from('inventory')
      .select('id, cashback_value')
      .eq('user_id', opener.userId)
      .eq('case_id', caseRow!.id);
    const inventoryId = inventoryRows![0].id;
    const cashbackValue = inventoryRows![0].cashback_value;

    const { data: creditedAmount, error } = await opener.client.rpc('cash_back_item', {
      p_inventory_id: inventoryId,
    });

    expect(error).toBeNull();
    expect(creditedAmount).toBe(cashbackValue);

    const { data: remaining } = await admin.from('inventory').select('id').eq('id', inventoryId);
    expect(remaining).toHaveLength(0);

    const { data: profile } = await admin
      .from('profiles')
      .select('balance')
      .eq('user_id', opener.userId)
      .single();
    expect(profile!.balance).toBe(90 + cashbackValue); // 100 - 10 (open) + cashback
  });

  it("blocks cashing back someone else's item", async () => {
    const author = await createSignedInUser(`author6-${Date.now()}@example.com`, 0);
    const opener = await createSignedInUser(`opener6-${Date.now()}@example.com`, 100);
    const stranger = await createSignedInUser(`stranger6-${Date.now()}@example.com`, 100);
    const items = [
      { id: crypto.randomUUID(), name: 'A', image_path: 'a.png', weight: 1 },
      { id: crypto.randomUUID(), name: 'B', image_path: 'b.png', weight: 1 },
    ];
    const { data: caseRow } = await admin
      .from('cases')
      .insert({ user_id: author.userId, title: 'Steal Test', price: 10, items })
      .select('id')
      .single();

    await opener.client.rpc('open_case_for_real', { p_case_id: caseRow!.id });
    const { data: inventoryRows } = await admin
      .from('inventory')
      .select('id')
      .eq('user_id', opener.userId)
      .eq('case_id', caseRow!.id);

    const { error } = await stranger.client.rpc('cash_back_item', {
      p_inventory_id: inventoryRows![0].id,
    });
    expect(error).not.toBeNull();
  });
});
