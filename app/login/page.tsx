import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import LoginClient from '@/app/login/LoginClient';

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const resolveCallbackUrl = (value?: string | string[]) => {
  const fallback = '/dashboard';
  if (!value) {
    return fallback;
  }
  if (Array.isArray(value)) {
    const [first] = value;
    if (!first) return fallback;
    const trimmed = first.trim();
    return trimmed.length > 0 && trimmed.startsWith('/') ? trimmed : fallback;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.startsWith('/') ? trimmed : fallback;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  const params = searchParams ? await searchParams : undefined;
  const callbackUrl = resolveCallbackUrl(params?.callbackUrl);

  if (session?.user) {
    redirect(callbackUrl);
  }

  const hasLinkedIn = !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET);

  return <LoginClient callbackUrl={callbackUrl} hasLinkedIn={hasLinkedIn} />;
}
