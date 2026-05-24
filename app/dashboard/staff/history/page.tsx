import { redirect } from 'next/navigation';
import { getDashboardSession } from '@/app/lib/auth/session';
import { fetchAllLoansHistory } from '@/app/lib/supabase/queries';
import AdminShell from '@/app/ui/dashboard/adminShell';
import HistoryViewer from '@/app/ui/dashboard/staff/historyViewer';
import type {
  HistoryStatusFilter,
  HistoryRange,
} from '@/app/lib/supabase/types';

interface SearchParams {
  status?: string;
  range?: string;
  rangeStart?: string;
  rangeEnd?: string;
  borrower?: string;
  book?: string;
  handler?: string;
  page?: string;
  pageSize?: string;
}

const ALLOWED_PAGE_SIZES = [10, 20, 50] as const;
const validPageSize = (v?: string): number => {
  const n = parseInt(v ?? '', 10);
  return ALLOWED_PAGE_SIZES.includes(n as 10 | 20 | 50) ? n : 20;
};

const validStatus = (v?: string): HistoryStatusFilter =>
  v === 'borrowed' || v === 'returned' || v === 'overdue' ? v : 'all';

const validRange = (v?: string): HistoryRange =>
  v === '30d' || v === '6m' || v === 'semester' || v === 'all' || v === 'custom'
    ? v
    : '30d';

export default async function LoanHistoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { user } = await getDashboardSession();
  if (!user) redirect('/login');
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/dashboard');

  const params = await searchParams;
  const filters = {
    status: validStatus(params.status),
    range: validRange(params.range),
    rangeStart: params.rangeStart,
    rangeEnd: params.rangeEnd,
    borrowerQ: params.borrower,
    bookQ: params.book,
    handlerQ: params.handler,
  };
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1);
  const pageSize = validPageSize(params.pageSize);

  // fetchAllLoansHistory uses zero-based paging; UI uses 1-based.
  const result = await fetchAllLoansHistory(filters, page - 1, pageSize);

  return (
    <>
      <title>Loan history | Library</title>
      <AdminShell
        titleSubtitle="Circulation · Archive"
        title="Loan history"
        description="All borrowing records. Filter, search, and export."
      >
        <HistoryViewer result={result} initialFilters={{ ...filters, page, pageSize }} />
      </AdminShell>
    </>
  );
}
