import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DAILY_BONUS_AMOUNT } from '@/lib/daily-bonus';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('exchangeCodeForSession failed:', error.message, error);
    }
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!profile) {
          const today = new Date().toISOString().slice(0, 10);
          const displayName = user.email?.split('@')[0] ?? 'игрок';
          await supabase.from('profiles').insert({
            user_id: user.id,
            balance: DAILY_BONUS_AMOUNT,
            last_daily_claim_at: today,
            display_name: displayName,
          });
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
