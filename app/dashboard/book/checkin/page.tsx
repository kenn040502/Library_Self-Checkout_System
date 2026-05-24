import CheckInForm from '@/app/ui/dashboard/checkInForm';
import ActiveLoansTable from '@/app/ui/dashboard/activeLoansTable';
import SearchForm from '@/app/ui/dashboard/searchForm';
import { fetchActiveLoans, fetchDashboardSummary } from '@/app/lib/supabase/queries';
import CameraScanButton from '@/app/ui/dashboard/cameraScannerButton';
import { getDashboardSession } from '@/app/lib/auth/session';
import AdminShell from '@/app/ui/dashboard/adminShell';
import { MapPinIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

export default async function ReturningBooksPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[]>>;
}) {
  const { user } = await getDashboardSession();
  const role = user?.role ?? 'user';
  const canProcessReturns = role === 'staff' || role === 'admin';

  const params = searchParams ? await searchParams : undefined;
  const raw = params?.q;
  const searchTerm = Array.isArray(raw) ? raw[0]?.trim() ?? '' : raw?.trim() ?? '';

  const [activeLoans, summary] = await Promise.all([
    fetchActiveLoans(searchTerm, canProcessReturns ? undefined : user?.id),
    fetchDashboardSummary(),
  ]);

  const totalBorrowed = summary.activeLoans;

  return (
    <>
      <title>Returning Books | Dashboard</title>

      <AdminShell
        titleSubtitle="Check In"
        title="Return Books"
        description={canProcessReturns
          ? 'Record completed loans and reconcile returned items with the inventory.'
          : 'Review which books are currently on loan before speaking with library staff.'}
      >
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <SearchForm
              action="/dashboard/book/checkin"
              placeholder="Search borrowed books by borrower, ID, or title"
              defaultValue={searchTerm}
              aria-label="Search borrowed books"
              className="flex-1 min-w-0"
              extraParams={{ mode: 'in' }}
            />
            {canProcessReturns ? <CameraScanButton className="w-full max-w-full md:w-auto" /> : null}
          </div>

          {canProcessReturns ? (
            <CheckInForm activeLoanCount={totalBorrowed} defaultIdentifier={searchTerm} />
          ) : (
            <>
              {/* Returning status — loans due within 48h or overdue */}
              {(() => {
                const now = Date.now();
                const soonCutoff = now + 48 * 60 * 60 * 1000;
                const attention = activeLoans
                  .filter((loan) => loan.dueAt && new Date(loan.dueAt).getTime() <= soonCutoff)
                  .map((loan) => {
                    const dueMs = new Date(loan.dueAt).getTime();
                    const daysDiff = Math.round((dueMs - now) / 86_400_000);
                    return {
                      id: loan.id,
                      title: loan.book?.title ?? 'Unknown title',
                      author: loan.book?.author ?? null,
                      daysDiff,
                      overdue: dueMs < now,
                    };
                  });
                if (attention.length === 0) return null;
                return (
                  <div className="rounded-card border border-warning/40 bg-warning/10 p-5">
                    <p className="font-sans text-caption-uppercase font-semibold text-warning">
                      Returning soon
                    </p>
                    <h3 className="mt-1 font-display text-display-sm font-semibold tracking-tight text-ink dark:text-on-dark">
                      You have {attention.length} book{attention.length === 1 ? '' : 's'} to bring back
                    </h3>
                    <ul className="mt-3 space-y-2">
                      {attention.map((entry) => (
                        <li
                          key={entry.id}
                          className="flex items-center justify-between gap-3 rounded-btn border border-warning/30 bg-surface-card dark:bg-dark-surface-card/40 px-3 py-2 font-sans text-body-sm"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-display font-semibold text-ink dark:text-on-dark">
                              {entry.title}
                            </p>
                            {entry.author && (
                              <p className="truncate font-display text-caption italic text-muted dark:text-on-dark-soft">
                                {entry.author}
                              </p>
                            )}
                          </div>
                          <span
                            className={`flex-shrink-0 rounded-pill px-2.5 py-0.5 font-mono text-code font-bold ${
                              entry.overdue
                                ? 'bg-primary/15 text-primary dark:bg-dark-primary/20 dark:text-dark-primary'
                                : 'bg-warning/20 text-warning'
                            }`}
                          >
                            {entry.overdue
                              ? `${Math.abs(entry.daysDiff)}d overdue`
                              : entry.daysDiff === 0
                                ? 'due today'
                                : `${entry.daysDiff}d left`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}

            </>
          )}

          <section className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-display-md tracking-tight text-ink dark:text-on-dark">
                {canProcessReturns ? 'Books currently not available' : 'Your current loans'}
              </h2>
              <p className="font-mono text-code text-muted-soft dark:text-on-dark-soft">
                {canProcessReturns
                  ? `Showing ${activeLoans.length} of ${totalBorrowed} borrowed books`
                  : `${activeLoans.length} book${activeLoans.length === 1 ? '' : 's'} on loan`}
              </p>
            </div>
            <ActiveLoansTable loans={activeLoans} showActions={canProcessReturns} />
          </section>
        </div>
      </AdminShell>
    </>
  );
}

