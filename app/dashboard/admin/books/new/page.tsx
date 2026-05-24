import { redirect } from 'next/navigation';
import { getDashboardSession } from '@/app/lib/auth/session';
import AdminShell from '@/app/ui/dashboard/adminShell';
import AddBookForm from '@/app/ui/dashboard/admin/addBookForm';

export default async function AddBookPage() {
  const { user } = await getDashboardSession();
  if (!user) redirect('/login');
  if (user.role !== 'admin' && user.role !== 'staff') redirect('/dashboard');

  return (
    <>
      <title>Add new book | Admin</title>
      <AdminShell
        titleSubtitle="Catalog · New title"
        title="Add new book"
        description="Create a new title and its physical copies."
      >
        <AddBookForm />
      </AdminShell>
    </>
  );
}
