import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { uploadItemImage, resolveImageUrl } from '@/lib/storage';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(url, serviceRoleKey);

describe('uploadItemImage', () => {
  let client: SupabaseClient;
  let userId: string;

  beforeAll(async () => {
    const email = `image-uploader-${Date.now()}@example.com`;
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

  it('uploads a file and returns a path under the user id', async () => {
    const file = new File(['fake-bytes'], 'item.png', { type: 'image/png' });
    const path = await uploadItemImage(client, userId, file);
    expect(path.startsWith(`${userId}/`)).toBe(true);
  });

  it('resolves the path to a publicly fetchable URL', async () => {
    const file = new File(['fake-bytes'], 'item2.png', { type: 'image/png' });
    const path = await uploadItemImage(client, userId, file);
    const publicUrl = resolveImageUrl(client, path);

    const response = await fetch(publicUrl);
    expect(response.status).toBe(200);
  });
});
