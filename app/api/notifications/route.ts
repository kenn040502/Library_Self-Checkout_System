import { NextResponse } from 'next/server';
import { requireStaff } from '@/auth';
import { isDevAuthBypassed, getDevBypassUserId, getDevBypassRole } from '@/app/lib/auth/env';
import { getDashboardSession } from '@/app/lib/auth/session';
import {
  fetchNotificationsForRole,
  fetchNotificationsForUser,
  markNotificationRead,
  markNotificationsReadByIds,
  markNotificationUnread,
  markAllNotificationsRead,
  markAllUserNotificationsRead,
  toggleNotificationFlag,
} from '@/app/lib/supabase/notifications';
import type { NotificationFilter } from '@/app/lib/supabase/notifications';
import type { DashboardRole } from '@/app/lib/auth/types';

const VALID_FILTERS: NotificationFilter[] = ['all', 'read', 'unread', 'flagged'];

// Resolve the current session for any role
async function getSessionUser(): Promise<{ id: string; role: DashboardRole } | null> {
  if (isDevAuthBypassed) {
    const role = getDevBypassRole();
    return { id: getDevBypassUserId(), role };
  }

  try {
    const user = await requireStaff();
    return { id: user.id, role: user.role };
  } catch {
    // ForbiddenError (user role), UnauthorizedError — fall through
  }

  const { user } = await getDashboardSession();
  if (!user) return null;
  return { id: user.id, role: user.role };
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const rawFilter = searchParams.get('filter') ?? 'all';
  const filter: NotificationFilter = VALID_FILTERS.includes(rawFilter as NotificationFilter)
    ? (rawFilter as NotificationFilter)
    : 'all';
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);

  const notifications =
    user.role === 'staff' || user.role === 'admin'
      ? await fetchNotificationsForRole(user.role, user.id, filter, limit)
      : await fetchNotificationsForUser(user.id, filter, limit);

  return NextResponse.json({ notifications });
}

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();

  if (Array.isArray(body.notificationIds)) {
    // New, source-of-truth contract: client tells us which IDs are unread.
    await markNotificationsReadByIds(user.id, body.notificationIds);
  } else if (body.markAll === true) {
    // Legacy fallback — kept for backward compat with stale clients.
    if (user.role === 'staff' || user.role === 'admin') {
      await markAllNotificationsRead(user.role, user.id);
    } else {
      await markAllUserNotificationsRead(user.id);
    }
  } else if (typeof body.notificationId === 'string') {
    const id = body.notificationId;

    if (body.markUnread === true) {
      await markNotificationUnread(id, user.id);
    } else if (typeof body.flagged === 'boolean') {
      await toggleNotificationFlag(id, user.id, body.flagged);
    } else {
      await markNotificationRead(id, user.id);
    }
  } else {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
