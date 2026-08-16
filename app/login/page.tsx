'use client';

import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const handleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <main>
      <button onClick={handleLogin}>Войти через Google</button>
    </main>
  );
}
