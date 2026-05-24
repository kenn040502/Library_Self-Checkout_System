import CheckOutForm from '@/app/ui/dashboard/checkOutForm';
import ActiveLoansTable from '@/app/ui/dashboard/activeLoansTable';
import {
  fetchActiveLoans,
  fetchAvailableBooks,
  fetchHoldsForBook,
  countActiveLoansForPatron,
  countOverdueLoansForPatron,
} from '@/app/lib/supabase/queries';
import { getDashboardSession } from '@/app/lib/auth/session';
import AdminShell from '@/app/ui/dashboard/adminShell';
import { STUDENT_LOAN_LIMIT } from '@/app/dashboard/loanPolicy';

const defaultLoanDurationDays = 14;

const buildDefaultDueDate = () => {
  const now = new Date();
  now.setDate(now.getDate() + defaultLoanDurationDays);
  const iso = now.toISOString();
  return iso.split('T')[0] ?? iso;
};

export default async function BorrowBooksPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[]>>;
}) {
  const { user } = await getDashboardSession();
  const role = user?.role ?? 'user';
  const canProcessLoans = role === 'staff' || role === 'admin';

  const params = searchParams ? await searchParams : undefined;
  const raw = params?.q;
  const searchTerm = Array.isArray(raw) ? raw[0]?.trim() ?? '' : raw?.trim() ?? '';

  // Extract bookId for pre-selection
  const rawBookId = params?.bookId;
  const preSelectedBookId = Array.isArray(rawBookId) ? rawBookId[0]?.trim() ?? '' : rawBookId?.trim() ?? '';

  const [books, activeLoans] = await Promise.all([
    fetchAvailableBooks(searchTerm),
    fetchActiveLoans(undefined, canProcessLoans ? undefined : user?.id),
  ]);

  // Hold counts for all books shown (used for pre-flight warnings on the form)
  const holdCountEntries = await Promise.all(
    books.map(async (b) => [b.id, await fetchHoldsForBook(b.id)] as [string, number]),
  );
  const holdCounts = Object.fromEntries(holdCountEntries);

  // For self-checkout students: their current active + overdue counts
  const [selfActiveLoans, selfOverdueCount] = !canProcessLoans && user?.id
    ? await Promise.all([
        countActiveLoansForPatron(user.id),
        countOverdueLoansForPatron(user.id),
      ])
    : [0, 0];

  const defaultDueDate = buildDefaultDueDate();

  return (
    <>
      <title>Borrow Books | Dashboard</title>

      <AdminShell
        titleSubtitle="Check Out"
        title="Borrow Books"
        description={canProcessLoans
          ? 'Lend titles by scanning barcodes or selecting items from the catalogue.'
          : 'Borrow a title by scanning your copy or searching the catalogue, then confirm your details.'}
        showHeader={false}
      >
        <div className="space-y-6">
          <CheckOutForm
            books={books}
            defaultDueDate={defaultDueDate}
            preSelectedBookId={preSelectedBookId}
            selfCheckout={!canProcessLoans}
            selfUserId={!canProcessLoans ? user?.id : undefined}
            selfUserName={!canProcessLoans ? (user?.name ?? user?.email ?? undefined) : undefined}
            holdCounts={holdCounts}
            selfActiveLoans={selfActiveLoans}
            selfHasOverdue={selfOverdueCount > 0}
            loanLimit={STUDENT_LOAN_LIMIT}
          />

          <section className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-display-md tracking-tight text-ink dark:text-on-dark">
                {canProcessLoans ? 'Books currently not available' : 'Your current loans'}
              </h2>
              <p className="font-mono text-code text-muted-soft dark:text-on-dark-soft">
                {canProcessLoans
                  ? `${activeLoans.length} books are with borrowers right now`
                  : `${activeLoans.length} book${activeLoans.length === 1 ? '' : 's'} on loan`}
              </p>
            </div>
            <ActiveLoansTable loans={activeLoans} showActions={canProcessLoans} />
          </section>
        </div>
      </AdminShell>
    </>
  );
}
