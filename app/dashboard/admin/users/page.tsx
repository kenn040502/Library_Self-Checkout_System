import { redirect } from 'next/navigation';
import { getDashboardSession } from '@/app/lib/auth/session';
import { fetchManagedUsers } from '@/app/lib/supabase/queries';
import UsersList from '@/app/ui/dashboard/admin/usersList';

export default async function UsersPage() {
  const { user } = await getDashboardSession();
  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect('/dashboard');

  const initialUsers = await fetchManagedUsers();

  return <UsersList initialUsers={initialUsers} />;
}
