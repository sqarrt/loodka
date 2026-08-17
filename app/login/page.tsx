import { GoogleLoginButton } from '@/components/GoogleLoginButton';

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full min-h-screen max-w-[1140px] flex-col items-center justify-center gap-6 px-10">
      <h1 className="font-display text-display-lg uppercase">Loodka</h1>
      <GoogleLoginButton />
    </main>
  );
}
