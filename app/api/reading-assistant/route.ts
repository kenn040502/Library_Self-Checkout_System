import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabase/server';
import { getSessionUser } from '@/auth';
import {
  AiUnavailableError,
  classifyAndExtract,
  streamLibraryAnswer,
  buildPersonalizedSuggestion,
  stripMarkdown,
  type AiResult,
} from '@/app/lib/recommendations/ai';
import { fetchBooks, fetchActiveLoans, fetchRecentlyReturnedLoans } from '@/app/lib/supabase/queries';
import { fetchUserContext } from '@/app/lib/recommendations/user-context';
import {
  READING_ASSISTANT_HISTORY_LIMIT,
  READING_ASSISTANT_RETURNS_WINDOW_DAYS,
  READING_ASSISTANT_MAX_MESSAGE_CHARS,
} from '@/app/lib/recommendations/policy';

type ReadingAssistantBook = {
  id: string;
  title: string;
  author: string | null;
  coverImageUrl: string | null;
  classification: string | null;
  isbn: string | null;
};

const FALLBACK_OPENER =
  'The reading assistant is busy right now — here are keyword matches from our catalogue. For library help, please ask a librarian or check the help articles.';

async function currentUserId(): Promise<string | null> {
  try {
    return (await getSessionUser()).id;
  } catch {
    return null;
  }
}

const safe = async <T>(p: Promise<T>, fallback: T, label: string): Promise<T> => {
  try {
    return await p;
  } catch (err) {
    console.warn(`[reading-assistant] ${label} failed:`, err);
    return fallback;
  }
};

async function loadHistory(
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

async function persistTurn(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  userId: string,
  sender: 'user' | 'assistant',
  text: string,
): Promise<void> {
  const { error } = await supabase.from('GeneralChatHistory').insert({ user_id: userId, sender, text });
  if (error) console.error('[reading-assistant] persist error:', error.message);
}

async function searchBooks(term: string | undefined): Promise<ReadingAssistantBook[]> {
  if (!term) return [];
  const rows = await safe(fetchBooks(term), [], 'fetchBooks');
  return (rows ?? []).slice(0, 5).map((b) => ({
    id: b.id,
    title: b.title,
    author: b.author ?? null,
    coverImageUrl: b.coverImageUrl ?? null,
    classification: b.classification ?? null,
    isbn: b.isbn ?? null,
  }));
}

export async function POST(request: Request) {
  // ---- Step 0: validate before opening a stream ----
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  if (!message) return NextResponse.json({ error: 'Missing message' }, { status: 400 });
  if (message.length > READING_ASSISTANT_MAX_MESSAGE_CHARS) {
    return NextResponse.json(
      { error: 'Message too long', max: READING_ASSISTANT_MAX_MESSAGE_CHARS },
      { status: 400 },
    );
  }

  const supabase = getSupabaseServerClient();

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data?: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data ?? {})}\n\n`));
      };
      let assembled = '';
      const pushText = (t: string) => {
        assembled += t;
        send('delta', { text: t });
      };

      try {
        send('thinking');
        await persistTurn(supabase, userId, 'user', message);

        const [userContext, activeLoans, recentReturns, history] = await Promise.all([
          safe(fetchUserContext(userId), undefined, 'fetchUserContext'),
          safe(fetchActiveLoans(undefined, userId), [], 'fetchActiveLoans'),
          safe(
            fetchRecentlyReturnedLoans(userId, READING_ASSISTANT_RETURNS_WINDOW_DAYS),
            [],
            'fetchRecentlyReturnedLoans',
          ),
          safe(loadHistory(supabase, userId), [], 'loadHistory'),
        ]);

        // ---- Step 1: classify ----
        let classified: AiResult | null = null;
        try {
          classified = await classifyAndExtract(message, userContext, history, activeLoans, recentReturns);
        } catch (err) {
          if (!(err instanceof AiUnavailableError)) console.error('[reading-assistant] classify error:', err);
        }

        if (!classified) {
          // ---- Degrade: keyword search, no model prose ----
          const books = await searchBooks(message);
          pushText(FALLBACK_OPENER);
          await persistTurn(supabase, userId, 'assistant', assembled);
          send('meta', { intent: 'find_books', books, followUpQuestion: '', faqSection: null });
          send('done');
          controller.close();
          return;
        }

        // ---- Step 2: book search (our catalogue only) ----
        let books: ReadingAssistantBook[] = [];
        if (classified.intent === 'find_books' || classified.intent === 'both') {
          books = await searchBooks(classified.searchTerms[0]);
        }

        // ---- Step 3: stream the prose ----
        let streamFailed = false;
        for await (const ev of streamLibraryAnswer({
          message,
          intent: classified.intent,
          faqSection: classified.faqSection,
          bookTitles: books.map((b) => b.title),
          userContext,
          history,
          activeLoans,
          recentReturns,
        })) {
          if (ev.type === 'delta') pushText(ev.text);
          else if (ev.type === 'error') {
            streamFailed = true;
            break;
          }
        }
        if (streamFailed || !assembled.trim()) {
          const opener = buildPersonalizedSuggestion({
            faculty: null,
            department: null,
            intakeYear: null,
            savedInterests: [],
            historyTags: [],
            recentBorrowedBooks: [],
          } as unknown as Parameters<typeof buildPersonalizedSuggestion>[0]).reply;
          pushText((assembled.trim() ? ' ' : '') + opener);
        }

        const finalReply = stripMarkdown(assembled).trim() || FALLBACK_OPENER;
        await persistTurn(supabase, userId, 'assistant', finalReply);
        send('meta', {
          intent: classified.intent,
          books,
          followUpQuestion: classified.followUpQuestion,
          faqSection: classified.faqSection,
        });
        send('done');
        controller.close();
      } catch (err) {
        console.error('[reading-assistant] stream error:', err);
        try {
          send('error', {
            message: 'Sorry — something went wrong. Please try again or ask a librarian.',
            books: [],
          });
          send('done');
        } catch {
          /* controller already closed */
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
