import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(url, serviceRoleKey);

describe('case creation (data layer)', () => {
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

  it('inserts a case with items owned by the signed-in user', async () => {
    const items = [
      { id: crypto.randomUUID(), name: 'Common thing', image_path: `${userId}/a.png`, weight: 9 },
      { id: crypto.randomUUID(), name: 'Rare thing', image_path: `${userId}/b.png`, weight: 1 },
    ];

    const { data, error } = await client
      .from('cases')
      .insert({ user_id: userId, title: 'My Case', price: 10, items })
      .select('id, title, price, items')
      .single();

    expect(error).toBeNull();
    expect(data!.title).toBe('My Case');
    expect(data!.items).toHaveLength(2);
  });

  it('rejects a price below 1 (DB check constraint)', async () => {
    const { error } = await client
      .from('cases')
      .insert({ user_id: userId, title: 'Bad Case', price: 0, items: [] });

    expect(error).not.toBeNull();
  });
});
