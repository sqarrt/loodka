import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(url, serviceRoleKey);
const fakeImage = new Blob(['fake-image-bytes'], { type: 'image/png' });

describe('case-images bucket', () => {
  let authedClient: SupabaseClient;

  beforeAll(async () => {
    const email = `uploader-${Date.now()}@example.com`;
    const password = 'test-password-123';
    await admin.auth.admin.createUser({ email, password, email_confirm: true });
    authedClient = createClient(url, anonKey);
    await authedClient.auth.signInWithPassword({ email, password });
  });

  it('allows an authenticated user to upload', async () => {
    const { error } = await authedClient.storage
      .from('case-images')
      .upload(`test/${Date.now()}.png`, fakeImage);
    expect(error).toBeNull();
  });

  it('blocks an anonymous client from uploading', async () => {
    const anon = createClient(url, anonKey);
    const { error } = await anon.storage
      .from('case-images')
      .upload(`test/${Date.now()}-anon.png`, fakeImage);
    expect(error).not.toBeNull();
  });

  it('serves an uploaded file publicly without auth', async () => {
    const path = `test/${Date.now()}-public.png`;
    await authedClient.storage.from('case-images').upload(path, fakeImage);
    const { data } = authedClient.storage.from('case-images').getPublicUrl(path);

    const response = await fetch(data.publicUrl);
    expect(response.status).toBe(200);
  });
});
