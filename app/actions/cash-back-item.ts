'use server';

import { createClient } from '@/lib/supabase/server';

const ERROR_MESSAGES: Record<string, string> = {
  'not authenticated': 'Нужно войти через Google.',
  'item not found': 'Предмет не найден.',
};

export async function cashBackItem(inventoryId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('cash_back_item', { p_inventory_id: inventoryId });

  if (error) {
    return { error: ERROR_MESSAGES[error.message] ?? error.message };
  }

  return { creditedAmount: data as number };
}
