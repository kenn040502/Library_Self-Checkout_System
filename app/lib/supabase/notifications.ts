import { getSupabaseServerClient } from '@/app/lib/supabase/server';

export type NotificationType = 'checkout' | 'checkin' | 'loan_confirmed' | 'due_soon' | 'hold_ready' | 'hold_placed';

export type NotificationFilter = 'all' | 'read' | 'unread' | 'flagged';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  target_roles: string[];
  target_user_id: string | null;
  metadata: Record<string, string> | null;
  created_at: string;
  is_read: boolean;
  is_flagged: boolean;
}

// ----------------------------------------------------------------
// Write — staff/admin broadcast
// ----------------------------------------------------------------

export async function createNotification(
  type: NotificationType,
  title: string,
  message: string,
  metadata?: Record<string, string>,
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from('Notifications').insert({
    type,
    title,
    message,
    metadata: metadata ?? null,
  });
  if (error) console.error('[notifications] createNotification error:', error.message);
}

// ----------------------------------------------------------------
// Write — user-targeted
// ----------------------------------------------------------------

export async function createUserNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  metadata?: Record<string, string>,
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from('Notifications').insert({
    type,
    title,
    message,
    target_user_id: userId,
    metadata: metadata ?? null,
  });
  if (error) console.error('[notifications] createUserNotification error:', error.message);
}

/** Returns true if a due_soon notification was already sent for this loan+user TODAY (idempotency guard). */
export async function dueSoonNotificationExists(loanId: string, userId: string, todayKey: string): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  const { count } = await supabase
    .from('Notifications')
    .select('id', { head: true, count: 'exact' })
    .eq('type', 'due_soon')
    .eq('target_user_id', userId)
    .contains('metadata', { loanId, date: todayKey });
  return (count ?? 0) > 0;
}

// ----------------------------------------------------------------
// Internal helpers
// ----------------------------------------------------------------

function mapRows(
  notifs: Record<string, unknown>[],
  readSet: Set<string>,
  flagSet: Set<string>,
): Notification[] {
  return notifs.map((n) => ({
    id: n.id as string,
    type: n.type as NotificationType,
    title: n.title as string,
    message: n.message as string,
    target_roles: (n.target_roles as string[]) ?? [],
    target_user_id: (n.target_user_id as string | null) ?? null,
    metadata: (n.metadata as Record<string, string> | null) ?? null,
    created_at: n.created_at as string,
    is_read: readSet.has(n.id as string),
    is_flagged: flagSet.has(n.id as string),
  }));
}

async function getReadSet(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  userId: string,
  ids: string[],
): Promise<Set<string>> {
  if (ids.length === 0) return new Set();

  // Chunk to avoid PostgREST URL-length limits with very long IN clauses.
  // 50 UUIDs per chunk keeps the URL well under any practical limit.
  const CHUNK = 50;
  const seen = new Set<string>();

  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK);
    const { data: reads, error } = await supabase
      .from('NotificationReads')
      .select('notification_id')
      .eq('user_id', userId)
      .in('notification_id', slice);

    if (error) {
      console.error('[notifications] getReadSet error:', error.message, {
        userId,
        chunkSize: slice.length,
      });
      continue; // skip this chunk; keep going so we still mark what we can
    }

    for (const r of reads ?? []) {
      seen.add(r.notification_id as string);
    }
  }

  return seen;
}

async function getFlagSet(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  userId: string,
  ids: string[],
): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const { data: flags } = await supabase
    .from('NotificationFlags')
    .select('notification_id')
    .eq('user_id', userId)
    .in('notification_id', ids);
  return new Set((flags ?? []).map((f) => f.notification_id as string));
}

// ----------------------------------------------------------------
// Read — role-broadcast (staff / admin)
// ----------------------------------------------------------------

export async function fetchNotificationsForRole(
  role: string,
  userId: string,
  filter: NotificationFilter = 'all',
  limit = 50,
): Promise<Notification[]> {
  const supabase = getSupabaseServerClient();

  // Flagged: query flag table first for efficiency, then fetch those notifications
  if (filter === 'flagged') {
    const { data: flags } = await supabase
      .from('NotificationFlags')
      .select('notification_id')
      .eq('user_id', userId)
      .order('flagged_at', { ascending: false })
      .limit(200);
    if (!flags?.length) return [];
    const flaggedIds = flags.map((f) => f.notification_id as string);

    const { data: notifs } = await supabase
      .from('Notifications')
      .select('*')
      .in('id', flaggedIds)
      .contains('target_roles', [role])
      .is('target_user_id', null)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (!notifs?.length) return [];

    const ids = notifs.map((n) => n.id as string);
    const readSet = await getReadSet(supabase, userId, ids);
    const flagSet = new Set(flaggedIds);
    return mapRows(notifs as Record<string, unknown>[], readSet, flagSet);
  }

  const { data: notifs, error } = await supabase
    .from('Notifications')
    .select('*')
    .contains('target_roles', [role])
    .is('target_user_id', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !notifs) return [];

  const ids = notifs.map((n) => n.id as string);
  const [readSet, flagSet] = await Promise.all([
    getReadSet(supabase, userId, ids),
    getFlagSet(supabase, userId, ids),
  ]);
  const result = mapRows(notifs as Record<string, unknown>[], readSet, flagSet);

  if (filter === 'read') return result.filter((n) => n.is_read);
  if (filter === 'unread') return result.filter((n) => !n.is_read);
  return result;
}

// ----------------------------------------------------------------
// Read — user-targeted
// ----------------------------------------------------------------

export async function fetchNotificationsForUser(
  userId: string,
  filter: NotificationFilter = 'all',
  limit = 50,
): Promise<Notification[]> {
  const supabase = getSupabaseServerClient();

  // Flagged: query flag table first for efficiency
  if (filter === 'flagged') {
    const { data: flags } = await supabase
      .from('NotificationFlags')
      .select('notification_id')
      .eq('user_id', userId)
      .order('flagged_at', { ascending: false })
      .limit(200);
    if (!flags?.length) return [];
    const flaggedIds = flags.map((f) => f.notification_id as string);

    const { data: notifs } = await supabase
      .from('Notifications')
      .select('*')
      .in('id', flaggedIds)
      .eq('target_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (!notifs?.length) return [];

    const ids = notifs.map((n) => n.id as string);
    const readSet = await getReadSet(supabase, userId, ids);
    const flagSet = new Set(flaggedIds);
    return mapRows(notifs as Record<string, unknown>[], readSet, flagSet);
  }

  const { data: notifs, error } = await supabase
    .from('Notifications')
    .select('*')
    .eq('target_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !notifs) return [];

  const ids = notifs.map((n) => n.id as string);
  const [readSet, flagSet] = await Promise.all([
    getReadSet(supabase, userId, ids),
    getFlagSet(supabase, userId, ids),
  ]);
  const result = mapRows(notifs as Record<string, unknown>[], readSet, flagSet);

  if (filter === 'read') return result.filter((n) => n.is_read);
  if (filter === 'unread') return result.filter((n) => !n.is_read);
  return result;
}

// ----------------------------------------------------------------
// Mark read / unread
// ----------------------------------------------------------------

export async function markNotificationRead(notificationId: string, userId: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  await supabase
    .from('NotificationReads')
    .upsert(
      { notification_id: notificationId, user_id: userId },
      { onConflict: 'notification_id,user_id' },
    );
}

export async function markNotificationUnread(notificationId: string, userId: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  await supabase
    .from('NotificationReads')
    .delete()
    .eq('notification_id', notificationId)
    .eq('user_id', userId);
}

export async function markAllNotificationsRead(role: string, userId: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { data: notifs } = await supabase
    .from('Notifications')
    .select('id')
    .contains('target_roles', [role])
    .is('target_user_id', null);

  if (!notifs?.length) return;
  const rows = notifs.map((n) => ({ notification_id: n.id as string, user_id: userId }));
  await supabase.from('NotificationReads').upsert(rows, { onConflict: 'notification_id,user_id' });
}

export async function markAllUserNotificationsRead(userId: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { data: notifs } = await supabase
    .from('Notifications')
    .select('id')
    .eq('target_user_id', userId);

  if (!notifs?.length) return;
  const rows = notifs.map((n) => ({ notification_id: n.id as string, user_id: userId }));
  await supabase.from('NotificationReads').upsert(rows, { onConflict: 'notification_id,user_id' });
}

/**
 * Mark exactly the supplied notification IDs as read for `userId`.
 * Source-of-truth is the IDs the client currently shows — eliminates any
 * read/write filter divergence that the legacy `markAll*` helpers had.
 */
export async function markNotificationsReadByIds(
  userId: string,
  notificationIds: string[],
): Promise<void> {
  if (!notificationIds.length) return;
  const supabase = getSupabaseServerClient();
  const rows = notificationIds.map((id) => ({ notification_id: id, user_id: userId }));
  const { error } = await supabase
    .from('NotificationReads')
    .upsert(rows, { onConflict: 'notification_id,user_id' });
  if (error) console.error('[notifications] markNotificationsReadByIds error:', error.message);
}

// ----------------------------------------------------------------
// Flag / unflag
// ----------------------------------------------------------------

export async function toggleNotificationFlag(
  notificationId: string,
  userId: string,
  flagged: boolean,
): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (flagged) {
    await supabase
      .from('NotificationFlags')
      .upsert(
        { notification_id: notificationId, user_id: userId },
        { onConflict: 'notification_id,user_id' },
      );
  } else {
    await supabase
      .from('NotificationFlags')
      .delete()
      .eq('notification_id', notificationId)
      .eq('user_id', userId);
  }
}
