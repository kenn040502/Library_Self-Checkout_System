import { NextResponse } from 'next/server';
import { getDashboardSession } from '@/app/lib/auth/session';
import { getSupabaseServerClient } from '@/app/lib/supabase/server';
import {
  createNotification,
  createUserNotification,
  holdExpiredNotificationExists,
} from '@/app/lib/supabase/notifications';

type ExpiredHoldRow = {
  id: string;
  patron_id: string;
  book_id: string | null;
  expires_at: string;
  book: { title: string | null } | null;
  patron: { display_name: string | null; email: string | null } | null;
};

/**
 * Sweeper: finds 'ready' holds whose pickup deadline has passed and fires
 * a notification to:
 *   - the patron ("Your pickup window expired")
 *   - the staff/admin broadcast ("[Patron]'s hold on [book] expired — please cancel")
 *
 * Notification is created at most once per hold via
 * `holdExpiredNotificationExists`. Does NOT cancel the hold itself — a staff
 * member still needs to confirm and cancel from the Holds management page.
 */
export async function POST() {
  const { user } = await getDashboardSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabaseServerClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from('Holds')
    .select(
      `
        id,
        patron_id,
        book_id,
        expires_at,
        book:Books(title),
        patron:Users!Holds_patron_id_fkey(display_name, email)
      `,
    )
    .eq('status', 'ready')
    .not('expires_at', 'is', null)
    .lt('expires_at', nowIso)
    .limit(50);

  if (error) {
    console.error('[expire-check] lookup failed:', error.message);
    return NextResponse.json({ error: 'Failed to scan holds' }, { status: 500 });
  }

  const rows = ((data ?? []) as unknown) as ExpiredHoldRow[];
  let notified = 0;

  for (const hold of rows) {
    // Idempotency: skip if we've already created a hold_expired notification.
    const exists = await holdExpiredNotificationExists(hold.id).catch(() => false);
    if (exists) continue;

    const bookTitle = hold.book?.title ?? 'a reserved book';
    const patronName =
      hold.patron?.display_name ?? hold.patron?.email ?? 'A patron';

    // Patron-targeted notification
    try {
      await createUserNotification(
        hold.patron_id,
        'hold_expired',
        'Pickup window expired',
        `Your pickup window for "${bookTitle}" has expired. The reservation will be cancelled by staff so the next person in the queue can collect it.`,
        { holdId: hold.id, bookTitle, expiresAt: hold.expires_at },
      );
    } catch (err) {
      console.warn('[expire-check] patron notification failed', err);
    }

    // Staff/admin broadcast — they need to manually cancel
    try {
      await createNotification(
        'hold_expired',
        'Pickup window expired',
        `${patronName}'s hold on "${bookTitle}" expired. Cancel it from the Holds page to release it to the next patron.`,
        {
          holdId: hold.id,
          bookTitle,
          patronName,
          expiresAt: hold.expires_at,
        },
      );
    } catch (err) {
      console.warn('[expire-check] staff broadcast failed', err);
    }

    notified += 1;
  }

  return NextResponse.json({ ok: true, scanned: rows.length, notified });
}
