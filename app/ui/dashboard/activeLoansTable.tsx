import type { Loan } from '@/app/lib/supabase/types';
import QuickCheckInButton from '@/app/ui/dashboard/quickCheckInButton';

const dateFormatter = new Intl.DateTimeFormat('en-MY', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const formatDate = (value: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return '—';
  return dateFormatter.format(date);
};

const isOverdue = (loan: Loan) => {
  if (loan.status === 'overdue') return true;
  const due = new Date(loan.dueAt);
  return !Number.isNaN(due.valueOf()) && due.getTime() < Date.now();
};

const roleLabel = (role: Loan['borrowerRole']): string => {
  if (role === 'admin') return 'Admin';
  if (role === 'staff') return 'Staff';
  return 'User';
};

export default function ActiveLoansTable({
  loans,
  showActions = true,
}: {
  loans: Loan[];
  showActions?: boolean;
}) {
  if (!loans.length) {
    return (
      <div className="rounded-card border border-hairline bg-surface-card p-6 text-center font-sans text-body-md text-muted dark:border-dark-hairline dark:bg-dark-surface-card dark:text-on-dark-soft">
        No books are currently on loan.
      </div>
    );
  }

  return (
    <div className="rounded-card border border-hairline bg-surface-card overflow-hidden dark:border-dark-hairline dark:bg-dark-surface-card">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-surface-cream-strong dark:bg-dark-surface-strong">
            <tr className="text-left font-sans text-caption-uppercase text-ink dark:text-on-dark">
              <th className="px-4 py-2">Borrower</th>
              <th className="px-4 py-2">Book</th>
              <th className="px-4 py-2">Due</th>
              {showActions ? <th className="px-4 py-2 text-right">Return</th> : null}
            </tr>
          </thead>
          <tbody className="font-sans text-caption text-body dark:text-on-dark/80">
            {loans.map((loan) => {
              const overdue = isOverdue(loan);

              return (
                <tr key={loan.id} className="border-t border-hairline-soft transition hover:bg-surface-cream-strong/50 dark:border-dark-hairline dark:hover:bg-dark-surface-strong/50">
                  <td className="px-4 py-2">
                    <div className="font-sans text-body-sm text-ink dark:text-on-dark">{loan.borrowerName ?? 'Unknown borrower'}</div>
                    <p className="font-sans text-caption-uppercase capitalize text-muted dark:text-on-dark-soft">
                      {roleLabel(loan.borrowerRole)} · ID {loan.borrowerIdentifier ?? '—'}
                    </p>
                  </td>
                  <td className="px-4 py-2">
                    <div className="font-sans text-body-sm text-ink dark:text-on-dark">
                      {loan.book?.title ?? 'Untitled'}
                    </div>
                    <p className="font-mono text-caption-uppercase text-muted dark:text-on-dark-soft">
                      {loan.copy?.barcode
                        ? `Barcode ${loan.copy.barcode}`
                        : loan.book?.isbn
                          ? `ISBN ${loan.book.isbn}`
                          : '—'}
                    </p>
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex items-center rounded-pill px-2 py-0.5 font-sans text-caption-uppercase font-semibold ${
                        overdue
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-cream-strong text-ink dark:bg-dark-surface-strong dark:text-on-dark'
                      }`}
                    >
                      {formatDate(loan.dueAt)}
                    </span>
                  </td>
                  {showActions ? (
                    <td className="px-4 py-2 text-right">
                      <QuickCheckInButton
                        loanId={loan.id}
                        bookTitle={loan.book?.title ?? undefined}
                        borrowerName={loan.borrowerName ?? undefined}
                      />
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
