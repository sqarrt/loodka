'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { uploadItemImage } from '@/lib/storage';

export async function createCase(
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Нужно войти через Google.' };
  }

  const title = String(formData.get('title') ?? '').trim();
  const price = Number(formData.get('price'));
  const names = formData.getAll('itemName').map(String);
  const weights = formData.getAll('itemWeight').map(Number);
  const descriptions = formData.getAll('itemDescription').map(String);
  const files = formData.getAll('itemImage').filter((f): f is File => f instanceof File && f.size > 0);
  const coverFile = formData.get('coverImage');

  if (!title) return { error: 'Укажи название кейса.' };
  if (!Number.isInteger(price) || price < 1) return { error: 'Цена крутки должна быть целым числом от 1.' };
  if (names.length < 2) return { error: 'Нужно минимум 2 предмета.' };
  if (files.length !== names.length) return { error: 'Для каждого предмета нужна картинка.' };
  if (weights.some((w) => !Number.isFinite(w) || w <= 0)) return { error: 'Вес каждого предмета должен быть больше 0.' };
  if (!(coverFile instanceof File) || coverFile.size === 0) return { error: 'Нужна обложка кейса.' };

  const coverPath = await uploadItemImage(supabase, user.id, coverFile);

  const items = [];
  for (let i = 0; i < names.length; i++) {
    const imagePath = await uploadItemImage(supabase, user.id, files[i]);
    items.push({
      name: names[i],
      image_path: imagePath,
      weight: weights[i],
      description: descriptions[i]?.trim() || null,
    });
  }

  const { data: caseId, error } = await supabase.rpc('create_case_with_items', {
    p_title: title,
    p_price: price,
    p_items: items,
    p_cover_image_path: coverPath,
  });

  if (error) return { error: error.message };

  redirect(`/case/${caseId}`);
}
