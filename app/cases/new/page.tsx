import { createClient } from '@/lib/supabase/server';
import { GoogleLoginButton } from '@/components/GoogleLoginButton';
import { NewCaseForm } from './NewCaseForm';

export default async function NewCasePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto flex w-full max-w-[1140px] flex-col gap-6 px-10 py-10">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-caps uppercase text-text-muted">новый кейс</span>
        <h1 className="font-display text-display-lg uppercase">Собери кейс</h1>
      </div>
      {user ? (
        <NewCaseForm />
      ) : (
        // The form itself is gated server-side too (createCase rejects
        // anon submissions) — this just avoids showing anonymous visitors
        // a whole multi-field form they can't actually submit.
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-line-strong bg-inset p-10 text-center">
          <p className="font-mono text-caps uppercase text-text-secondary">
            Чтобы собрать кейс, сначала войди
          </p>
          <GoogleLoginButton />
        </div>
      )}
    </main>
  );
}
