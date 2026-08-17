import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(url, serviceRoleKey);

describe('create_case_with_items (data layer)', () => {
  let client: SupabaseClient;
  let userId: string;

  beforeAll(async () => {
    const email = `case-creator-${Date.now()}@example.com`;
    const password = 'test-password-123';
    const { data } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    userId = data.user!.id;
    client = createClient(url, anonKey);
    await client.auth.signInWithPassword({ email, password });
  });

  it('creates a case with items owned by the signed-in user', async () => {
    const items = [
      { name: 'Common thing', image_path: `${userId}/a.png`, weight: 9 },
      { name: 'Rare thing', image_path: `${userId}/b.png`, weight: 1 },
    ];

    const { data: caseId, error } = await client.rpc('create_case_with_items', {
      p_title: 'My Case',
      p_price: 10,
      p_items: items,
    });

    expect(error).toBeNull();

    const { data: caseRow } = await admin
      .from('cases')
      .select('title, price, user_id')
      .eq('id', caseId)
      .single();
    expect(caseRow!.title).toBe('My Case');
    expect(caseRow!.user_id).toBe(userId);

    const { data: itemRows } = await admin
      .from('case_items')
      .select('name, weight, position')
      .eq('case_id', caseId)
      .order('position');
    expect(itemRows).toHaveLength(2);
    expect(itemRows![0].name).toBe('Common thing');
    expect(itemRows![1].name).toBe('Rare thing');
  });

  it('rejects a price below 1 (DB check constraint)', async () => {
    const { error } = await client.rpc('create_case_with_items', {
      p_title: 'Bad Case',
      p_price: 0,
      p_items: [],
    });

    expect(error).not.toBeNull();
  });
});
