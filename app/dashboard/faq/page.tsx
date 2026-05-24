import { redirect } from 'next/navigation';
import { getDashboardSession } from '@/app/lib/auth/session';
import AdminShell from '@/app/ui/dashboard/adminShell';
import FaqAccordion from '@/app/ui/dashboard/faqAccordion';

export default async function FaqPage() {
  const { user } = await getDashboardSession();
  if (!user) redirect('/login');

  return (
    <>
      <title>Help Center</title>
      <AdminShell
        titleSubtitle="Student Guide"
        title="Help Center"
        description="Common questions about borrowing, returning, and using the library system."
      >
        <FaqAccordion />
      </AdminShell>
    </>
  );
}
