import { getSupabaseServerClient } from '@/app/lib/supabase/server';

export type BorrowedBookSummary = {
  title: string;
  author: string | null;
  borrowedAt: string | null;
};

export type UserContext = {
  historyTags: string[];
  recentBorrowedBooks: BorrowedBookSummary[];
  savedInterests: string[];
  faculty: string | null;
  department: string | null;
  intakeYear: number | null;
};

type RawLoanHistoryRow = {
  borrowed_at: string | null;
  copy: {
    book: {
      title: string | null;
      author: string | null;
      book_tag_links: Array<{ tag: { name: string | null } | null }> | null;
    } | null;
  } | null;
};

type RawUserInterestsRow = {
  interests: string[] | null;
};

type RawUserProfileRow = {
  faculty: string | null;
  department: string | null;
  intake_year: number | null;
};

export async function fetchUserContext(userId: string): Promise<UserContext> {
  if (!userId) return { historyTags: [], recentBorrowedBooks: [], savedInterests: [], faculty: null, department: null, intakeYear: null };

  const supabase = getSupabaseServerClient();

  const [loansResult, interestsResult, profileResult] = await Promise.all([
    supabase
      .from('Loans')
      .select(
        `
          borrowed_at,
          copy:Copies(
            book:Books(
              title,
              author,
              book_tag_links:BookTagsLinks(
                tag:BookTags(name)
              )
            )
          )
        `,
      )
      .eq('user_id', userId)
      .order('borrowed_at', { ascending: false })
      .limit(20),

    supabase
      .from('UserInterests')
      .select('interests')
      .eq('user_id', userId)
      .maybeSingle<RawUserInterestsRow>(),

    supabase
      .from('UserProfile')
      .select('faculty, department, intake_year')
      .eq('user_id', userId)
      .maybeSingle<RawUserProfileRow>(),
  ]);

  // Extract and deduplicate history tags + recent borrowed book titles
  const historyTags: string[] = [];
  const tagSeen = new Set<string>();
  const recentBorrowedBooks: BorrowedBookSummary[] = [];
  const titleSeen = new Set<string>();

  if (!loansResult.error && loansResult.data) {
    const rows = loansResult.data as unknown as RawLoanHistoryRow[];
    for (const row of rows) {
      const book = row.copy?.book;
      const title = typeof book?.title === 'string' ? book.title.trim() : '';
      if (title) {
        const titleKey = title.toLowerCase();
        if (!titleSeen.has(titleKey)) {
          titleSeen.add(titleKey);
          recentBorrowedBooks.push({
            title,
            author: typeof book?.author === 'string' && book.author.trim() ? book.author.trim() : null,
            borrowedAt: row.borrowed_at ?? null,
          });
        }
      }

      const links = book?.book_tag_links ?? [];
      for (const link of links) {
        const name = link?.tag?.name;
        if (typeof name === 'string' && name.trim().length > 0) {
          const normalized = name.trim().toLowerCase();
          if (!tagSeen.has(normalized)) {
            tagSeen.add(normalized);
            historyTags.push(normalized);
          }
        }
      }
    }
  }

  // Extract saved interests
  const savedInterests: string[] = [];
  if (!interestsResult.error && interestsResult.data?.interests) {
    const raw = interestsResult.data.interests;
    if (Array.isArray(raw)) {
      savedInterests.push(
        ...raw
          .map((v) => String(v).trim().toLowerCase())
          .filter((v) => v.length > 0),
      );
    }
  }

  // Extract profile info
  const faculty = profileResult.data?.faculty?.trim() || null;
  const department = profileResult.data?.department?.trim() || null;
  const intakeYear = profileResult.data?.intake_year ?? null;

  return { historyTags, recentBorrowedBooks, savedInterests, faculty, department, intakeYear };
}

export async function saveUserInterests(
  userId: string,
  interests: string[],
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const sanitized = interests
    .map((v) => String(v).trim().toLowerCase())
    .filter((v) => v.length > 0 && v.length <= 60)
    .slice(0, 30);

  const { error } = await supabase
    .from('UserInterests')
    .upsert(
      { user_id: userId, interests: sanitized, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );

  if (error) throw error;
}

export async function userNeedsOnboarding(userId: string): Promise<boolean> {
  if (!userId) return true;

  const supabase = getSupabaseServerClient();

  const [interestsResult, loansResult] = await Promise.all([
    supabase
      .from('UserInterests')
      .select('interests')
      .eq('user_id', userId)
      .maybeSingle<RawUserInterestsRow>(),

    supabase
      .from('Loans')
      .select('id', { head: true, count: 'exact' })
      .eq('user_id', userId)
      .limit(1),
  ]);

  const hasSavedInterests =
    !interestsResult.error &&
    Array.isArray(interestsResult.data?.interests) &&
    (interestsResult.data?.interests?.length ?? 0) > 0;

  const hasLoanHistory =
    !loansResult.error && (loansResult.count ?? 0) > 0;

  return !hasSavedInterests && !hasLoanHistory;
}
