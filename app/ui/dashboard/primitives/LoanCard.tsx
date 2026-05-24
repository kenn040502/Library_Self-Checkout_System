'use client';

import type { Loan } from '@/app/lib/supabase/types';
import BookCover, { getBookGradient } from './BookCover';
import Chip from './Chip';
import RenewButton from '@/app/ui/dashboard/renewButton';

function getDaysUntilDue(dueAt: string): number {
  const due = new Date(dueAt);
  const now = new Date();
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

type LoanCardProps = {
  loan: Loan;
  holdCount?: number;
};

export default function LoanCard({ loan, holdCount = 0 }: LoanCardProps) {
  const dueIn = getDaysUntilDue(loan.dueAt);
  const overdue = loan.status === 'overdue' || dueIn < 0;
  const urgent = !overdue && dueIn <= 3;

  const title = loan.book?.title ?? 'Untitled';
  const author = loan.book?.author ?? 'Unknown author';
  const callNumber = loan.book?.isbn ?? loan.copy?.barcode ?? '';
  const gradient = getBookGradient(loan.bookId ?? loan.id);

  const dueTone = overdue ? 'danger' : urgent ? 'warn' : 'default';
  const dueLabel = overdue
    ? `Overdue ${Math.abs(dueIn)}d`
    : dueIn === 0
    ? 'Due today'
    : `${dueIn}d left`;

  return (
    <div className="flex items-center gap-2.5 rounded-card border border-hairline bg-surface-card px-3.5 py-2.5 transition-colors hover:border-primary/20 dark:border-dark-hairline dark:bg-dark-surface-card dark:hover:border-dark-primary/30">
      <BookCover gradient={gradient} w={36} h={48} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-sans text-title-sm text-ink dark:text-on-dark">
          {title}
        </p>
        <p className="truncate font-sans text-body-sm text-muted dark:text-on-dark-soft">
          {author}
        </p>
        <div className="mt-1 flex min-w-0 items-center gap-2 overflow-hidden">
          <Chip tone={dueTone} mono className="flex-shrink-0">{dueLabel}</Chip>
          {callNumber && (
            <span className="min-w-0 truncate font-mono text-code text-muted dark:text-on-dark-soft">
              {callNumber}
            </span>
          )}
        </div>
      </div>
      <div className="flex-shrink-0">
        <RenewButton loan={loan} holdCount={holdCount} />
      </div>
    </div>
  );
}
