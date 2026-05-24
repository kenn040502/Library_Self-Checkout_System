import { redirect } from 'next/navigation';
import { getDashboardSession } from '@/app/lib/auth/session';

export default async function LearningLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getDashboardSession();
  if (!user) redirect('/login');
  if (user.role !== 'user') redirect('/dashboard');
  return <>{children}</>;
}
