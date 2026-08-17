'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { uploadItemImage } from '@/lib/storage';

const ERROR_MESSAGES: Record<string, string> = {
  'not authenticated': 'Нужно войти через Google.',
  'case not found': 'Кейс не найден.',
  'not the case author': 'Изменить кейс может только автор.',
};

type EditItemInput = {
  id: string | null;
  name: string;
  weight: number;
  removed: boolean;
  imageIndex: number | null;
  description: string | null;
};

export async function updateCase(
  caseId: string,
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: ERROR_MESSAGES['not authenticated'] };

  const title = String(formData.get('title') ?? '').trim();
  const price = Number(formData.get('price'));
  const itemsRaw = String(formData.get('items') ?? '[]');
  const newImages = formData.getAll('newItemImage').filter((f): f is File => f instanceof File && f.size > 0);

  if (!title) return { error: 'Укажи название кейса.' };
  if (!Number.isInteger(price) || price < 1) return { error: 'Цена крутки должна быть целым числом от 1.' };

  let items: EditItemInput[];
  try {
    items = JSON.parse(itemsRaw);
  } catch {
    return { error: 'Некорректные данные предметов.' };
  }

  const active = items.filter((item) => !item.removed);
  if (active.length < 2) return { error: 'Нужно минимум 2 предмета, которые не удалены.' };
  if (items.some((item) => !Number.isFinite(item.weight) || item.weight <= 0)) {
    return { error: 'Вес каждого предмета должен быть больше 0.' };
  }
  if (items.some((item) => !item.name.trim())) {
    return { error: 'У каждого предмета должно быть название.' };
  }

  const itemsWithImages = [];
  for (const item of items) {
    if (item.id) {
      itemsWithImages.push({
        id: item.id,
        name: item.name,
        weight: item.weight,
        removed: item.removed,
        description: item.description,
      });
    } else {
      if (item.imageIndex === null || !newImages[item.imageIndex]) {
        return { error: 'Для каждого нового предмета нужна картинка.' };
      }
      const imagePath = await uploadItemImage(supabase, user.id, newImages[item.imageIndex]);
      itemsWithImages.push({
        id: null,
        name: item.name,
        weight: item.weight,
        image_path: imagePath,
        description: item.description,
      });
    }
  }

  const { error } = await supabase.rpc('update_case_with_items', {
    p_case_id: caseId,
    p_title: title,
    p_price: price,
    p_items: itemsWithImages,
  });

  if (error) return { error: ERROR_MESSAGES[error.message] ?? error.message };

  redirect(`/case/${caseId}`);
}

export async function deleteCase(caseId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: ERROR_MESSAGES['not authenticated'] };

  const { error } = await supabase.rpc('delete_case_soft', { p_case_id: caseId });
  if (error) return { error: ERROR_MESSAGES[error.message] ?? error.message };

  redirect(`/u/${user.id}`);
}
