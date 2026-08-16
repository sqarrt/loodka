import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(url, serviceRoleKey);

describe('daily bonus grant (data layer)', () => {
  const email = `bonus-${Date.now()}@example.com`;
  const password = 'test-password-123';
  let userId: string;

  beforeAll(async () => {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;
    userId = data.user!.id;
  });

  afterAll(async () => {
    await admin.auth.admin.deleteUser(userId);
  });

  it('creates a profile with 10 balance on first bootstrap', async () => {
    const { data, error } = await admin
      .from('profiles')
      .insert({ user_id: userId, balance: 10, last_daily_claim_at: '2026-08-16' })
      .select('balance, last_daily_claim_at')
      .single();

    expect(error).toBeNull();
    expect(data!.balance).toBe(10);
    expect(data!.last_daily_claim_at).toBe('2026-08-16');
  });

  it('a signed-in user can read only their own profile balance', async () => {
    const client = createClient(url, anonKey);
    await client.auth.signInWithPassword({ email, password });

    const { data, error } = await client
      .from('profiles')
      .select('balance')
      .eq('user_id', userId)
      .single();

    expect(error).toBeNull();
    expect(data!.balance).toBe(10);
  });
});
