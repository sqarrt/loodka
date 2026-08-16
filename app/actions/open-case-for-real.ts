'use server';

import { createClient } from '@/lib/supabase/server';

const ERROR_MESSAGES: Record<string, string> = {
  'not authenticated': 'Нужно войти через Google.',
  'case not found': 'Кейс не найден.',
  'cannot open your own case for real': 'Нельзя открывать свой кейс за лудки — только демо.',
  'insufficient balance': 'Недостаточно лудок.',
};

export async function openCaseForReal(caseId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('open_case_for_real', { p_case_id: caseId });

  if (error) {
    return { error: ERROR_MESSAGES[error.message] ?? error.message };
  }

  const result = data![0];
  return {
    itemId: result.item_id as string,
    cashbackValue: result.cashback_value as number,
    newBalance: result.new_balance as number,
  };
}
