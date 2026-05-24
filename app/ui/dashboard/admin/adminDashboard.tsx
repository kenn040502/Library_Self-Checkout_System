import AdminShell from '@/app/ui/dashboard/adminShell';
import BookCover, { getBookGradient } from '@/app/ui/dashboard/primitives/BookCover';
import BarChartMini from '@/app/ui/dashboard/primitives/BarChartMini';
import { Button } from '@/app/ui/button';
import type { DashboardSummary } from '@/app/lib/supabase/types';
import type { Loan } from '@/app/lib/supabase/types';
import type { TopBorrowedBook } from '@/app/lib/supabase/queries';
import { PlusIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

type ActivityType = 'borrowed' | 'returned' | 'held' | 'overdue';

const ACTIVITY_DOT_CLASSES: Record<ActivityType, string> = {
  borrowed: 'bg-accent-amber',
  returned: 'bg-success',
  held:     'bg-accent-teal',
  overdue:  'bg-primary',
};

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  borrowed: 'borrowed',
  returned: 'returned',
  held:     'placed hold on',
  overdue:  'is overdue on',
};

type AdminDashboardProps = {
  userName: string | null;
  summary: DashboardSummary;
  recentLoans: Loan[];
  chartData: number[];
  topBooks: TopBorrowedBook[];
};

export default function AdminDashboard({
  userName,
  summary,
  recentLoans,
  chartData,
  topBooks,
}: AdminDashboardProps) {
  const firstName = userName?.split(' ')[0] ?? 'Administrator';
  const h = new Date().getHours();
  const tod = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';

  const kpis = [
    { label: 'Total books',      value: summary.totalBooks.toLocaleString() },
    { label: 'Active loans',     value: summary.activeLoans.toLocaleString() },
    { label: 'Overdue',          value: summary.overdueLoans.toLocaleString(), danger: summary.overdueLoans > 0 },
    { label: 'Available copies', value: summary.availableBooks.toLocaleString() },
  ];

  // Compute real trend: last 7 days vs previous 7 days from the chartData window (14 days)
  const recent7 = chartData.slice(-7).reduce((a, b) => a + b, 0);
  const prev7 = chartData.slice(0, Math.max(0, chartData.length - 7)).reduce((a, b) => a + b, 0);
  const trendPct = prev7 > 0 ? Math.round(((recent7 - prev7) / prev7) * 100) : 0;
  const trendPositive = trendPct >= 0;

  // Build activity feed from recent loans
  const recentActivity = recentLoans.slice(0, 6).map(loan => ({
    type: (loan.status === 'returned' ? 'returned' : loan.status === 'overdue' ? 'overdue' : 'borrowed') as ActivityType,
    user: loan.borrowerName ?? 'Patron',
    book: loan.book?.title ?? 'Unknown book',
    time: (() => {
      const diff = Math.round((Date.now() - new Date(loan.borrowedAt).getTime()) / 60000);
      return diff < 60 ? `${diff}m ago` : `${Math.round(diff / 60)}h ago`;
    })(),
    avatar: (loan.borrowerName ?? 'UN').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase(),
  }));

  return (
    <AdminShell
      titleSubtitle="Admin Control Center"
      title={`${tod}, ${firstName}`}
      description="Full catalogue and circulation access enabled. Sarawak Campus library is operating normally."
      primaryAction={
        <Link href="/dashboard/admin/books/new" className="contents">
          <Button>
            <PlusIcon className="mr-1.5 h-3.5 w-3.5" />
            Add book
          </Button>
        </Link>
      }
    >
      {/* KPI grid */}
      <div className="mb-8 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {kpis.map(k => (
          <div
            key={k.label}
            className="rounded-card border border-hairline bg-surface-card p-5 dark:border-dark-hairline dark:bg-dark-surface-card"
          >
            <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[1.8px] text-muted-soft dark:text-on-dark-soft">
              {k.label}
            </p>
            <p className={`font-display text-[38px] font-semibold leading-none tracking-[-1px] ${k.danger ? 'text-primary dark:text-dark-primary' : 'text-ink dark:text-on-dark'}`}>
              {k.value}
            </p>
          </div>
        ))}
      </div>

      {/* Chart + overdue alert */}
      <div className="mb-8 grid grid-cols-1 gap-3.5 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-card border border-hairline bg-surface-card p-7 dark:border-dark-hairline dark:bg-dark-surface-card">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <p className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[1.8px] text-muted-soft dark:text-on-dark-soft">
                Circulation · Last 14 days
              </p>
              <h2 className="font-display text-display-md text-ink dark:text-on-dark">
                {recent7} loans this week
              </h2>
              {prev7 > 0 && (
                <p className="mt-1 font-sans text-body-sm text-muted dark:text-on-dark-soft">
                  <span className={`font-semibold ${trendPositive ? 'text-success' : 'text-primary dark:text-dark-primary'}`}>
                    {trendPositive ? '+' : ''}{trendPct}%
                  </span>{' '}
                  vs previous week
                </p>
              )}
            </div>
          </div>
          <BarChartMini data={chartData} height={120} />
        </div>

        <div className="rounded-card border border-primary border-l-[3px] bg-surface-card p-6 dark:bg-dark-surface-card">
          <div className="mb-3.5 flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[2px] text-primary dark:text-dark-primary">
              ⚠ Attention required
            </span>
          </div>
          <p className="font-display text-[42px] font-semibold leading-none tracking-[-1px] text-ink dark:text-on-dark">
            {summary.overdueLoans}
          </p>
          <p className="mt-1 font-sans text-body-sm text-muted dark:text-on-dark-soft">
            Overdue items{' '}
            <span className="font-semibold text-primary dark:text-dark-primary">· {Math.round(summary.overdueLoans * 0.25)} &gt; 14 days</span>
          </p>
          <div className="mt-4 space-y-2">
            {[
              { n: Math.round(summary.overdueLoans * 0.75), label: 'Under 7 days', color: 'text-warning' },
              { n: Math.round(summary.overdueLoans * 0.25), label: 'Over 14 days', color: 'text-primary dark:text-dark-primary' },
            ].map(r => (
              <div key={r.label} className="flex items-center justify-between border-b border-hairline-soft py-1.5 dark:border-dark-hairline">
                <span className="font-mono text-[11px] text-muted dark:text-on-dark-soft">{r.label}</span>
                <span className={`font-display text-[14px] font-bold ${r.color}`}>{r.n}</span>
              </div>
            ))}
          </div>
          <Link
            href="/dashboard/admin/overdue"
            className="mt-4 block w-full rounded-btn bg-primary py-2.5 text-center font-sans text-button text-on-primary transition hover:bg-primary-active dark:bg-dark-primary"
          >
            Review overdue list
          </Link>
        </div>
      </div>

      {/* Quick actions (admin) */}
      <div className="mb-8 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Link
          href="/dashboard/admin/overdue"
          className="group flex items-center justify-between rounded-card border border-hairline bg-surface-card p-5 transition hover:border-primary/40 hover:bg-primary/5 dark:border-dark-hairline dark:bg-dark-surface-card dark:hover:border-dark-primary/40 dark:hover:bg-dark-primary/10"
        >
          <div>
            <p className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-[1.8px] text-muted-soft dark:text-on-dark-soft">
              Circulation
            </p>
            <p className="font-display text-title-md text-ink dark:text-on-dark">
              View overdue loans
            </p>
          </div>
          <span className="font-mono text-[18px] font-semibold text-primary transition group-hover:translate-x-0.5 dark:text-dark-primary">→</span>
        </Link>
        <Link
          href="/dashboard/admin/books/new"
          className="group flex items-center justify-between rounded-card border border-hairline bg-surface-card p-5 transition hover:border-accent-amber/60 hover:bg-accent-amber/5 dark:border-dark-hairline dark:bg-dark-surface-card dark:hover:border-accent-amber/60 dark:hover:bg-accent-amber/10"
        >
          <div>
            <p className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-[1.8px] text-muted-soft dark:text-on-dark-soft">
              Catalogue
            </p>
            <p className="font-display text-title-md text-ink dark:text-on-dark">
              Add new book
            </p>
          </div>
          <span className="font-mono text-[18px] font-semibold text-accent-amber transition group-hover:translate-x-0.5">→</span>
        </Link>
      </div>

      {/* Recent activity + top books */}
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[3fr_2fr]">
        <div className="rounded-card border border-hairline bg-surface-card p-7 dark:border-dark-hairline dark:bg-dark-surface-card">
          <div className="mb-4 flex items-baseline justify-between">
            <div>
              <h2 className="font-display text-display-md text-ink dark:text-on-dark">
                Recent activity
              </h2>
              <p className="mt-0.5 font-mono text-[11px] text-muted-soft dark:text-on-dark-soft">
                Last {recentActivity.length} transaction{recentActivity.length === 1 ? '' : 's'}
              </p>
            </div>
            <Link
              href="/dashboard/staff/history"
              className="rounded-btn border border-hairline bg-surface-cream-strong px-2.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-muted transition hover:text-ink dark:border-dark-hairline dark:bg-dark-surface-strong dark:text-on-dark-soft dark:hover:text-on-dark"
            >
              Full history
            </Link>
          </div>
          <div>
            {recentActivity.length === 0 ? (
              <p className="py-8 text-center font-sans text-body-sm text-muted-soft dark:text-on-dark-soft">No recent activity.</p>
            ) : (
              recentActivity.map((r, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3.5 py-3 ${i < recentActivity.length - 1 ? 'border-b border-hairline-soft dark:border-dark-hairline' : ''}`}
                >
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-hairline bg-surface-cream-strong font-sans text-[11px] font-semibold text-muted dark:border-dark-hairline dark:bg-dark-surface-strong dark:text-on-dark-soft">
                    {r.avatar}
                  </div>
                  <p className="min-w-0 flex-1 font-sans text-body-sm text-ink dark:text-on-dark">
                    <span className="font-semibold">{r.user}</span>{' '}
                    <span className="text-muted dark:text-on-dark-soft">{ACTIVITY_LABELS[r.type]}</span>{' '}
                    <span className="font-display italic">{r.book}</span>
                  </p>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${ACTIVITY_DOT_CLASSES[r.type]}`} />
                    <span className="font-mono text-[10px] text-muted-soft dark:text-on-dark-soft">{r.time}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-card border border-hairline bg-surface-card p-7 dark:border-dark-hairline dark:bg-dark-surface-card">
          <div className="mb-4">
            <h2 className="font-display text-display-md text-ink dark:text-on-dark">
              Most borrowed
            </h2>
            <p className="mt-0.5 font-mono text-[11px] text-muted-soft dark:text-on-dark-soft">Last 30 days</p>
          </div>
          <div className="space-y-3.5">
            {topBooks.length === 0 ? (
              <p className="py-4 text-center font-sans text-body-sm text-muted-soft dark:text-on-dark-soft">
                No loans in the last 30 days.
              </p>
            ) : (
              topBooks.map((b, idx) => (
                <div key={b.bookId} className="flex items-center gap-3">
                  <span className="w-6 flex-shrink-0 font-display text-[18px] font-semibold leading-none tracking-tight text-muted-soft dark:text-on-dark-soft">
                    {idx + 1}
                  </span>
                  <BookCover gradient={getBookGradient(b.bookId)} w={30} h={42} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-title-md text-ink dark:text-on-dark">
                      {b.title}
                    </p>
                    {b.author && (
                      <p className="truncate font-display text-[11px] italic text-muted dark:text-on-dark-soft">
                        {b.author}
                      </p>
                    )}
                  </div>
                  <span className="flex-shrink-0 font-mono text-[11px] font-bold text-accent-amber">{b.count}×</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
