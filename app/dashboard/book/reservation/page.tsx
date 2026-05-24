import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getDashboardSession } from '@/app/lib/auth/session';
import {
  cancelHoldForPatron,
  fetchActiveHoldsForPatron,
  type PatronHold,
} from '@/app/lib/supabase/queries';
import { createUserNotification } from '@/app/lib/supabase/notifications';
import AdminShell from '@/app/ui/dashboard/adminShell';
import HoldCard from '@/app/ui/dashboard/primitives/HoldCard';
import KpiCard from '@/app/ui/dashboard/primitives/KpiCard';
import CancelHoldButton from '@/app/ui/dashboard/cancelHoldButton';

async function cancelReservation(formData: FormData) {
  'use server';

  const holdId = formData.get('holdId');
  if (typeof holdId !== 'string') return { ok: false, error: 'Invalid hold id.' } as const;
  const bookTitle = formData.get('bookTitle');

  const { user } = await getDashboardSession();
  if (!user) return { ok: false, error: 'Not signed in.' } as const;

  try {
    await cancelHoldForPatron(holdId, user.id);

    const title = 'Reservation cancelled';
    const safeTitle = typeof bookTitle === 'string' && bookTitle.trim() ? bookTitle.trim() : null;
    const message = safeTitle
      ? `You cancelled your reservation for "${safeTitle}".`
      : 'You cancelled your reservation successfully.';

    await createUserNotification(user.id, 'hold_cancelled', title, message, { holdId });
  } catch (error) {
    console.error('Failed to cancel hold', error);
    return { ok: false, error: 'Failed to cancel hold.' } as const;
  }

  revalidatePath('/dashboard/book/reservation');
  return { ok: true } as const;
}

function sortReadyFirst(holds: PatronHold[]): PatronHold[] {
  return [...holds].sort(
    (a, b) => (a.status === 'ready' ? -1 : 1) - (b.status === 'ready' ? -1 : 1),
  );
}

const dateFormatter = new Intl.DateTimeFormat('en-MY', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const dateTimeFormatter = new Intl.DateTimeFormat('en-MY', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const formatDate = (value: string | null) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.valueOf()) ? '—' : dateFormatter.format(d);
};
const formatDateTime = (value: string | null) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.valueOf()) ? '—' : dateTimeFormatter.format(d);
};
const getReadyMessage = (hold: PatronHold): string => {
  if (hold.status === 'ready') {
    return hold.expiresAt
      ? `Collect by ${formatDateTime(hold.expiresAt)} to keep your spot.`
      : 'Collect the book from the service desk.';
  }
  return 'We will notify you once the copy is ready to be picked up.';
};

export default async function MyReservationsPage() {
  const { user } = await getDashboardSession();

  if (!user) redirect('/login');
  if (user.role !== 'user') redirect('/dashboard');

  const holds = await fetchActiveHoldsForPatron(user.id);
  const ready = holds.filter((h) => h.status === 'ready');
  const queued = holds.filter((h) => h.status === 'queued');
  const sorted = sortReadyFirst(holds);

  return (
    <>
      <title>My Reservations | Dashboard</title>

      <AdminShell
        titleSubtitle="Reservations"
        title="Your Reservations"
        description="Track your position in the queue. We will notify you when your hold is ready for pickup."
      >
        {/* Summary strip */}
        <div className="mb-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <KpiCard label="Total holds" value={holds.length} />
          <KpiCard
            label="Ready for pickup"
            value={ready.length}
            danger={ready.length > 0}
            delta={ready.length > 0 ? `${ready.length} ready` : undefined}
            footer="collect at desk"
            className={ready.length > 0 ? 'border-primary/40 dark:border-dark-primary/40' : undefined}
          />
          <KpiCard label="In queue" value={queued.length} />
        </div>

        {holds.length === 0 ? (
          <div className="rounded-card border border-dashed border-hairline dark:border-dark-hairline bg-surface-card dark:bg-dark-surface-card p-10 text-center">
            <p className="font-display text-display-sm tracking-tight text-ink dark:text-on-dark">
              No active reservations
            </p>
            <p className="mt-2 font-sans text-body-sm text-muted-soft dark:text-on-dark-soft">
              You have not reserved any books yet. Browse the catalogue to place a hold.
            </p>
            <Link
              href="/dashboard/book/items"
              className="mt-5 inline-flex rounded-pill bg-primary hover:bg-primary-active px-5 py-2 font-sans text-button text-on-primary transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-dark-canvas"
            >
              Browse catalogue
            </Link>
          </div>
        ) : (
          <>
            <h2 className="mb-3 font-display text-display-md tracking-tight text-ink dark:text-on-dark">
              Active reservations
            </h2>
            <ul className="space-y-4">
              {sorted.map((hold) => {
                const canCancel = hold.status === 'queued' || hold.status === 'ready';
                return (
                  <li
                    key={hold.id}
                    className="overflow-hidden rounded-card border border-hairline dark:border-dark-hairline bg-surface-card dark:bg-dark-surface-card"
                  >
                    <div className="p-1">
                      <HoldCard hold={hold} />
                    </div>

                    {/* Details row */}
                    <dl className="grid grid-cols-1 gap-3 border-t border-hairline-soft dark:border-dark-hairline px-4 py-3 font-sans text-body-sm sm:grid-cols-3">
                      <div>
                        <dt className="font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">
                          Placed on
                        </dt>
                        <dd className="mt-0.5 font-medium text-ink dark:text-on-dark">
                          {formatDate(hold.placedAt)}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">
                          Ready since
                        </dt>
                        <dd className="mt-0.5 font-medium text-ink dark:text-on-dark">
                          {hold.readyAt ? formatDateTime(hold.readyAt) : 'Not yet ready'}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">
                          Expires
                        </dt>
                        <dd className="mt-0.5 font-medium text-ink dark:text-on-dark">
                          {hold.expiresAt ? formatDateTime(hold.expiresAt) : '—'}
                        </dd>
                      </div>
                      {hold.isbn && (
                        <div className="sm:col-span-3">
                          <dt className="font-sans text-caption-uppercase text-muted dark:text-on-dark-soft">
                            ISBN
                          </dt>
                          <dd className="mt-0.5 font-mono text-code text-ink/80 dark:text-on-dark/80">
                            {hold.isbn}
                          </dd>
                        </div>
                      )}
                    </dl>

                    {/* Footer with action + message */}
                    <div
                      className={`flex flex-wrap items-center justify-between gap-3 border-t border-hairline-soft dark:border-dark-hairline px-4 py-3 font-sans text-body-sm ${
                        hold.status === 'ready'
                          ? 'text-primary dark:text-dark-primary'
                          : 'text-muted dark:text-on-dark-soft'
                      }`}
                    >
                      <p>{getReadyMessage(hold)}</p>
                      {canCancel && (
                        <CancelHoldButton
                          holdId={hold.id}
                          bookTitle={hold.title}
                          cancelAction={cancelReservation}
                        />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </AdminShell>
    </>
  );
}
