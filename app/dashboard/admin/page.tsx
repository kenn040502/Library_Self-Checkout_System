import { redirect } from 'next/navigation';
import { getDashboardSession } from '@/app/lib/auth/session';
import {
  fetchDashboardSummary,
  fetchRecentLoans,
  fetchDailyLoanCounts,
  fetchTopBorrowedBooks,
} from '@/app/lib/supabase/queries';
import AdminDashboard from '@/app/ui/dashboard/admin/adminDashboard';

export default async function AdminDashboardPage() {
  const { user } = await getDashboardSession();

  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect('/dashboard');

  const [summary, recentLoans, chartData, topBooks] = await Promise.all([
    fetchDashboardSummary(),
    fetchRecentLoans(6),
    fetchDailyLoanCounts(14),
    fetchTopBorrowedBooks(30, 5),
  ]);

  return (
    <>
      <title>Admin Overview | Swinburne Library</title>
      <AdminDashboard
        userName={user.name}
        summary={summary}
        recentLoans={recentLoans}
        chartData={chartData}
        topBooks={topBooks}
      />
    </>
  );
}
