import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(url, serviceRoleKey);

async function createSignedInUser(email: string): Promise<{
  userId: string;
  client: SupabaseClient;
}> {
  const password = 'test-password-123';
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError) throw createError;

  const client = createClient(url, anonKey);
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;

  return { userId: created.user!.id, client };
}

describe('RLS policies', () => {
  let ownerId: string;
  let ownerClient: SupabaseClient;
  let strangerClient: SupabaseClient;
  let caseId: string;

  beforeAll(async () => {
    const owner = await createSignedInUser(`owner-${Date.now()}@example.com`);
    ownerId = owner.userId;
    ownerClient = owner.client;

    const stranger = await createSignedInUser(`stranger-${Date.now()}@example.com`);
    strangerClient = stranger.client;

    const { data, error } = await admin
      .from('cases')
      .insert({ user_id: ownerId, title: 'Test Case', price: 10 })
      .select('id')
      .single();
    if (error) throw error;
    caseId = data.id;
  });

  it('allows an anonymous client to read cases', async () => {
    const anon = createClient(url, anonKey);
    const { data, error } = await anon.from('cases').select('id').eq('id', caseId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("blocks a stranger from updating someone else's case", async () => {
    const { data, error } = await strangerClient
      .from('cases')
      .update({ title: 'Hijacked' })
      .eq('id', caseId)
      .select();
    expect(error).toBeNull();
    expect(data).toHaveLength(0); // RLS silently filters, not an error
  });

  it('allows the owner to update their own case', async () => {
    const { data, error } = await ownerClient
      .from('cases')
      .update({ title: 'Renamed' })
      .eq('id', caseId)
      .select();
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].title).toBe('Renamed');
  });

  it('blocks a stranger from reading a profile that is not theirs', async () => {
    const { data, error } = await strangerClient
      .from('profiles')
      .select('*')
      .eq('user_id', ownerId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });
});
