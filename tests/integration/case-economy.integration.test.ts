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

async function createCaseWithItems(
  authorId: string,
  title: string,
  price: number,
  items: { name: string; image_path: string; weight: number }[]
) {
  const { data: caseRow } = await admin
    .from('cases')
    .insert({ user_id: authorId, title, price })
    .select('id')
    .single();
  const { data: itemRows } = await admin
    .from('case_items')
    .insert(items.map((item, i) => ({ case_id: caseRow!.id, ...item, position: i })))
    .select('id, name, image_path, weight');
  return { caseId: caseRow!.id as string, items: itemRows! };
}

describe('open_case_for_real', () => {
  it('debits the opener, credits the author, and inserts an inventory row', async () => {
    const author = await createSignedInUser(`author-${Date.now()}@example.com`, 0);
    const opener = await createSignedInUser(`opener-${Date.now()}@example.com`, 100);

    const { caseId, items } = await createCaseWithItems(author.userId, 'Economy Test', 10, [
      { name: 'A', image_path: 'a.png', weight: 1 },
      { name: 'B', image_path: 'b.png', weight: 1 },
    ]);

    const { data, error } = await opener.client.rpc('open_case_for_real', {
      p_case_id: caseId,
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
      .eq('case_id', caseId);
    expect(inventoryRows).toHaveLength(1);
    expect(inventoryRows![0].item_id).toBe(result.item_id);
  });

  it('computes cashback proportional to rarity, matching the JS formula', async () => {
    const author = await createSignedInUser(`author2-${Date.now()}@example.com`, 0);
    const opener = await createSignedInUser(`opener2-${Date.now()}@example.com`, 100);

    const price = 10;
    const { caseId, items } = await createCaseWithItems(author.userId, 'Rarity Test', price, [
      { name: 'Common', image_path: 'c.png', weight: 9 },
      { name: 'Rare', image_path: 'r.png', weight: 1 },
    ]);

    const { data } = await opener.client.rpc('open_case_for_real', { p_case_id: caseId });
    const result = data![0];

    const totalWeight = items.reduce((s, i) => s + i.weight, 0);
    const winner = items.find((i) => i.id === result.item_id)!;
    const prob = winner.weight / totalWeight;
    const expectedCashback = Math.floor((0.5 * price) / (items.length * prob));

    expect(result.cashback_value).toBe(expectedCashback);
  });

  it('allows the author to open their own case for real, netting only the non-author share', async () => {
    const author = await createSignedInUser(`author3-${Date.now()}@example.com`, 100);
    const { caseId } = await createCaseWithItems(author.userId, 'Self Open Test', 10, [
      { name: 'A', image_path: 'a.png', weight: 1 },
      { name: 'B', image_path: 'b.png', weight: 1 },
    ]);

    const { data, error } = await author.client.rpc('open_case_for_real', {
      p_case_id: caseId,
    });

    expect(error).toBeNull();
    const result = data![0];
    expect(result.new_balance).toBe(95);

    const { data: inventoryRows } = await admin
      .from('inventory')
      .select('item_id')
      .eq('user_id', author.userId)
      .eq('case_id', caseId);
    expect(inventoryRows).toHaveLength(1);
    expect(inventoryRows![0].item_id).toBe(result.item_id);
  });

  it('rejects an opener with insufficient balance', async () => {
    const author = await createSignedInUser(`author4-${Date.now()}@example.com`, 0);
    const opener = await createSignedInUser(`opener4-${Date.now()}@example.com`, 1);
    const { caseId } = await createCaseWithItems(author.userId, 'Poor Test', 10, [
      { name: 'A', image_path: 'a.png', weight: 1 },
      { name: 'B', image_path: 'b.png', weight: 1 },
    ]);

    const { error } = await opener.client.rpc('open_case_for_real', { p_case_id: caseId });
    expect(error).not.toBeNull();
  });
});

describe('cash_back_item', () => {
  it('deletes the inventory row and credits the balance', async () => {
    const author = await createSignedInUser(`author5-${Date.now()}@example.com`, 0);
    const opener = await createSignedInUser(`opener5-${Date.now()}@example.com`, 100);
    const { caseId } = await createCaseWithItems(author.userId, 'Cashback Test', 10, [
      { name: 'A', image_path: 'a.png', weight: 1 },
      { name: 'B', image_path: 'b.png', weight: 1 },
    ]);

    await opener.client.rpc('open_case_for_real', { p_case_id: caseId });
    const { data: inventoryRows } = await admin
      .from('inventory')
      .select('id, cashback_value')
      .eq('user_id', opener.userId)
      .eq('case_id', caseId);
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
    const { caseId } = await createCaseWithItems(author.userId, 'Steal Test', 10, [
      { name: 'A', image_path: 'a.png', weight: 1 },
      { name: 'B', image_path: 'b.png', weight: 1 },
    ]);

    await opener.client.rpc('open_case_for_real', { p_case_id: caseId });
    const { data: inventoryRows } = await admin
      .from('inventory')
      .select('id')
      .eq('user_id', opener.userId)
      .eq('case_id', caseId);

    const { error } = await stranger.client.rpc('cash_back_item', {
      p_inventory_id: inventoryRows![0].id,
    });
    expect(error).not.toBeNull();
  });
});
