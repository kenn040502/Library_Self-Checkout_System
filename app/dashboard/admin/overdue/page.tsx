import { redirect } from 'next/navigation';
import { getDashboardSession } from '@/app/lib/auth/session';
import { fetchOverdueLoans } from '@/app/lib/supabase/queries';
import AdminShell from '@/app/ui/dashboard/adminShell';
import OverdueViewer from '@/app/ui/dashboard/admin/overdueViewer';
import type { OverdueBucket } from '@/app/lib/supabase/types';

interface SearchParams {
  bucket?: string;
  q?: string;
}

const validBucket = (v?: string): OverdueBucket =>
  v === '1-7' || v === '8-30' || v === '30+' ? v : 'all';

export default async function OverduePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { user } = await getDashboardSession();
  if (!user) redirect('/login');
  if (user.role !== 'admin' && user.role !== 'staff') redirect('/dashboard');

  const params = await searchParams;
  const bucket = validBucket(params.bucket);
  const q = params.q;

  const loans = await fetchOverdueLoans({ bucket, search: q });

  return (
    <>
      <title>Overdue loans | Admin</title>
      <AdminShell
        titleSubtitle="Circulation · Action required"
        title="Overdue loans"
        description="Loans past their due date. Send reminders or mark as contacted."
      >
        <OverdueViewer
          loans={loans}
          initialFilters={{ bucket, q: q ?? '' }}
        />
      </AdminShell>
    </>
  );
}
