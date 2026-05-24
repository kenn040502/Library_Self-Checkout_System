import { notFound, redirect } from 'next/navigation';
import { getDashboardSession } from '@/app/lib/auth/session';
import { fetchManagedUserById, fetchRecentLoansByUser } from '@/app/lib/supabase/queries';
import UserDetailForm from '@/app/ui/dashboard/admin/userDetailForm';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminUserDetailPage({ params }: PageProps) {
  const { user } = await getDashboardSession();
  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect('/dashboard');

  const { id } = await params;
  const target = await fetchManagedUserById(id);
  if (!target) notFound();

  const recentLoans = await fetchRecentLoansByUser(id, 5);

  return <UserDetailForm user={target} recentLoans={recentLoans} />;
}
