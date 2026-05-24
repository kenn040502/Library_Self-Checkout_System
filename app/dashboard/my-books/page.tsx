import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getDashboardSession } from '@/app/lib/auth/session';
import {
  fetchActiveLoans,
  fetchActiveHoldsForPatron,
  fetchLoanHistory,
  fetchHoldsForBook,
  cancelHoldForPatron,
} from '@/app/lib/supabase/queries';
import { createUserNotification } from '@/app/lib/supabase/notifications';
import MyBooksTabs from '@/app/ui/dashboard/student/myBooksTabs';

type Tab = 'current' | 'history' | 'reservations';

async function cancelMyHold(formData: FormData) {
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

  revalidatePath('/dashboard/my-books');
  return { ok: true } as const;
}

export default async function MyBooksPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[]>>;
}) {
  const { user } = await getDashboardSession();

  if (!user) {
    redirect('/login');
  }

  // Only students use this page; staff/admin have their own views
  if (user.role !== 'user') {
    redirect('/dashboard');
  }

  const params = searchParams ? await searchParams : undefined;
  const rawTab = params?.tab;
  const tabParam = (Array.isArray(rawTab) ? rawTab[0] : rawTab) as Tab | undefined;
  const defaultTab: Tab =
    tabParam === 'history' || tabParam === 'reservations' ? tabParam : 'current';

  const [activeLoans, loanHistory, holds] = await Promise.all([
    fetchActiveLoans(undefined, user.id),
    fetchLoanHistory(user.id, 30),
    fetchActiveHoldsForPatron(user.id),
  ]);

  // Fetch hold counts for each active loan's book (for renewal validation)
  const uniqueBookIds = [
    ...new Set(activeLoans.map((l) => l.bookId).filter(Boolean) as string[]),
  ];
  const holdCountEntries = await Promise.all(
    uniqueBookIds.map(async (bookId) => {
      const count = await fetchHoldsForBook(bookId);
      return [bookId, count] as [string, number];
    }),
  );
  const holdCounts = Object.fromEntries(holdCountEntries);

  return (
    <main className="space-y-8">
      <title>My Books | Dashboard</title>

      <MyBooksTabs
        activeLoans={activeLoans}
        loanHistory={loanHistory}
        holds={holds}
        defaultTab={defaultTab}
        holdCounts={holdCounts}
        cancelHoldAction={cancelMyHold}
      />
    </main>
  );
}
