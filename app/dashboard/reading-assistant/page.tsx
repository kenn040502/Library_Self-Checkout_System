import { redirect } from 'next/navigation';
import { getDashboardSession } from '@/app/lib/auth/session';
import AdminShell from '@/app/ui/dashboard/adminShell';
import ReadingAssistant from '@/app/ui/dashboard/readingAssistant/readingAssistant';

const loginRedirect = encodeURIComponent('/dashboard/reading-assistant');

export default async function ReadingAssistantPage() {
  const { user } = await getDashboardSession();
  if (!user) redirect(`/login?callbackUrl=${loginRedirect}`);
  if (user.role === 'admin') redirect('/dashboard/admin');
  if (user.role === 'staff') redirect('/dashboard');

  const studentName = user.name ?? user.username ?? user.email ?? null;

  return (
    <>
      <title>Reading Assistant | Dashboard</title>
      <AdminShell
        titleSubtitle="Library AI"
        title="Reading Assistant"
        description="Ask anything — find books, get help with loans, holds, fines, and more."
      >
        <ReadingAssistant userId={user.id} studentName={studentName} />
      </AdminShell>
    </>
  );
}
