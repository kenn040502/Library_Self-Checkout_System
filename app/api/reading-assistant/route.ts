import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabase/server';
import { getSessionUser } from '@/auth';
import { classifyAndExtract } from '@/app/lib/recommendations/ai';
import {
  fetchBooks,
  fetchActiveLoans,
  fetchRecentlyReturnedLoans,
} from '@/app/lib/supabase/queries';
import { fetchUserContext } from '@/app/lib/recommendations/user-context';
import {
  READING_ASSISTANT_HISTORY_LIMIT,
  READING_ASSISTANT_RETURNS_WINDOW_DAYS,
} from '@/app/lib/recommendations/policy';

type ReadingAssistantBook = {
  id: string;
  title: string;
  author: string | null;
  coverImageUrl: string | null;
  classification: string | null;
  isbn: string | null;
};

async function currentUserId(): Promise<string | null> {
  try {
    const user = await getSessionUser();
    return user.id;
  } catch {
    return null;
  }
}

async function persistTurn(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  userId: string,
  sender: 'user' | 'assistant',
  text: string,
): Promise<void> {
  const { error } = await supabase.from('GeneralChatHistory').insert({
    user_id: userId,
    sender,
    text,
  });
  if (error) console.error('[reading-assistant] persist error:', error.message);
}

async function fetchRecentChatTurns(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  userId: string,
): Promise<Array<{ sender: 'user' | 'assistant'; text: string }>> {
  const { data, error } = await supabase
    .from('GeneralChatHistory')
    .select('sender, text, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(READING_ASSISTANT_HISTORY_LIMIT);

  if (error) {
    console.warn('[reading-assistant] history fetch failed:', error.message);
    return [];
  }

  return ((data ?? []) as Array<{ sender: string; text: string }>)
    .reverse()
    .filter((r) => r.sender === 'user' || r.sender === 'assistant')
    .map((r) => ({ sender: r.sender as 'user' | 'assistant', text: r.text }));
}

const safe = async <T>(p: Promise<T>, fallback: T, label: string): Promise<T> => {
  try {
    return await p;
  } catch (err) {
    console.warn(`[reading-assistant] ${label} failed:`, err);
    return fallback;
  }
};

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  if (!message) {
    return NextResponse.json({ error: 'Missing message' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  // 1. Parallel fetch all context
  const [userContext, activeLoans, recentReturns, history] = await Promise.all([
    safe(fetchUserContext(userId), undefined, 'fetchUserContext'),
    safe(fetchActiveLoans(undefined, userId), [], 'fetchActiveLoans'),
    safe(fetchRecentlyReturnedLoans(userId, READING_ASSISTANT_RETURNS_WINDOW_DAYS), [], 'fetchRecentlyReturnedLoans'),
    safe(fetchRecentChatTurns(supabase, userId), [], 'fetchRecentChatTurns'),
  ]);

  // 2. AI classify + reply
  const aiResult = await classifyAndExtract(
    message,
    userContext,
    history,
    activeLoans,
    recentReturns,
  );

  // 3. Search books only when the intent calls for it
  let books: ReadingAssistantBook[] | undefined;
  if (aiResult.intent === 'find_books' || aiResult.intent === 'both') {
    const term = (aiResult.searchTerms ?? [])[0];
    if (term) {
      const rows = await fetchBooks(term);
      if (rows && rows.length > 0) {
        books = rows.slice(0, 5).map((b) => ({
          id: b.id,
          title: b.title,
          author: b.author ?? null,
          coverImageUrl: b.coverImageUrl ?? null,
          classification: b.classification ?? null,
          isbn: b.isbn ?? null,
        }));
      }
    }
  }

  // 4. Persist user msg + assistant msg
  await persistTurn(supabase, userId, 'user', message);
  await persistTurn(supabase, userId, 'assistant', aiResult.reply);

  return NextResponse.json({
    reply: aiResult.reply,
    intent: aiResult.intent,
    ...(books && books.length > 0 ? { books } : {}),
  });
}
