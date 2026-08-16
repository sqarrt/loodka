import type { SupabaseClient } from '@supabase/supabase-js';

export const CASE_IMAGES_BUCKET = 'case-images';

export async function uploadItemImage(
  supabase: SupabaseClient,
  userId: string,
  file: File
): Promise<string> {
  const path = `${userId}/${crypto.randomUUID()}-${file.name}`;
  const { error } = await supabase.storage.from(CASE_IMAGES_BUCKET).upload(path, file);
  if (error) throw error;
  return path;
}

export function resolveImageUrl(supabase: SupabaseClient, path: string): string {
  return supabase.storage.from(CASE_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl;
}
