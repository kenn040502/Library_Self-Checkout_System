import { NextResponse } from 'next/server';
import { isSensitiveContent } from '@/app/lib/recommendations/guardrails';
import {
  classifyAndExtract,
  suggestYouTubeCourses,
  facultyToCategory,
  streamLibraryAnswer,
  buildPersonalizedSuggestion,
  detectPresetIntent,
} from '@/app/lib/recommendations/ai';
import { retrieveCandidateBooks } from '@/app/lib/recommendations/retrieve';
import {
  buildAssociationRules,
  recommendBooks,
  type Recommendation,
} from '@/app/lib/recommendations/recommender';
import { getDashboardSession } from '@/app/lib/auth/session';
import { fetchUserContext, type UserContext } from '@/app/lib/recommendations/user-context';

type RecommendationRequest = {
  message?: string;
  limit?: number;
};

type RecommendationItem = {
  id: string;
  title: string;
  author: string | null;
  coverImageUrl: string | null;
  availableCopies: number;
  totalCopies: number;
  reason: string;
};

type RateLimitEntry = {
  windowStart: number;
  count: number;
  lastAt: number;
};

/** Drain a streamLibraryAnswer generator into a plain string. */
async function collectAnswer(input: Parameters<typeof streamLibraryAnswer>[0]): Promise<string> {
  let out = '';
  for await (const ev of streamLibraryAnswer(input)) {
    if (ev.type === 'delta') out += ev.text;
  }
  return out.trim();
}

const RATE_LIMIT_WINDOW_MS = 10_000;
const RATE_LIMIT_MAX = 5;
const MIN_INTERVAL_MS = 1200;
const rateLimiter = new Map<string, RateLimitEntry>();

const GREETING_PATTERNS = [
  /^\s*(hi|hello|hey|yo|hiya|halo|hai|morning|afternoon|evening)\b/i,
  /^\s*(good\s+(morning|afternoon|evening|night))\b/i,
  /^\s*(how\s+are\s+you|what'?s\s+up|how'?s\s+it\s+going)\b/i,
];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const isGreeting = (message: string) =>
  GREETING_PATTERNS.some((p) => p.test(message.trim()));

const getClientKey = (request: Request) => {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get('x-real-ip') ?? request.headers.get('cf-connecting-ip');
  return realIp?.trim() || 'anonymous';
};

const toRecommendationItem = (rec: Recommendation): RecommendationItem => ({
  id: rec.book.id,
  title: rec.book.title,
  author: rec.book.author ?? null,
  coverImageUrl: rec.book.coverImageUrl ?? null,
  availableCopies: rec.book.availableCopies ?? 0,
  totalCopies: rec.book.totalCopies ?? 0,
  reason: rec.reasons[0] ?? 'Matches your interests',
});

const diversify = (recs: Recommendation[], limit: number): Recommendation[] => {
  const seenTitles = new Set<string>();
  const authorCounts = new Map<string, number>();
  const result: Recommendation[] = [];

  for (const rec of recs) {
    const titleKey = rec.book.title?.toLowerCase() ?? '';
    if (titleKey && seenTitles.has(titleKey)) continue;
    const authorKey = rec.book.author?.toLowerCase() ?? '';
    const authorCount = authorKey ? authorCounts.get(authorKey) ?? 0 : 0;
    if (authorKey && authorCount >= 2) continue;
    if (titleKey) seenTitles.add(titleKey);
    if (authorKey) authorCounts.set(authorKey, authorCount + 1);
    result.push(rec);
    if (result.length >= limit) break;
  }

  if (result.length < limit) {
    for (const rec of recs) {
      if (!result.includes(rec)) result.push(rec);
      if (result.length >= limit) break;
    }
  }

  return result;
};

const applyRateLimit = (
  clientKey: string,
  now: number,
): { limited: boolean; reply?: string; status?: number } => {
  const existing = rateLimiter.get(clientKey);
  const entry: RateLimitEntry = existing
    ? { ...existing }
    : { windowStart: now, count: 0, lastAt: 0 };

  if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    entry.windowStart = now;
    entry.count = 0;
  }

  if (entry.lastAt && now - entry.lastAt < MIN_INTERVAL_MS) {
    return { limited: true, reply: 'Please wait a moment before sending another message.', status: 429 };
  }

  entry.count += 1;
  entry.lastAt = now;
  rateLimiter.set(clientKey, entry);

  if (rateLimiter.size > 1000) {
    for (const [key, value] of rateLimiter.entries()) {
      if (now - value.windowStart > RATE_LIMIT_WINDOW_MS * 2) rateLimiter.delete(key);
    }
  }

  if (entry.count > RATE_LIMIT_MAX) {
    return { limited: true, reply: 'Too many messages in a short time. Please wait and try again.', status: 429 };
  }

  return { limited: false };
};

const findBooks = async (
  searchTerms: string[],
  userContext: UserContext,
  requestedLimit: number,
): Promise<{ items: RecommendationItem[]; youtube: Awaited<ReturnType<typeof suggestYouTubeCourses>> }> => {
  const searchInput = searchTerms.join(', ');
  const preferredCategory = facultyToCategory(userContext.faculty);
  const intakeYear = userContext.intakeYear;

  const books = await retrieveCandidateBooks(searchInput, 200, preferredCategory, intakeYear);
  const associations = buildAssociationRules(books);
  const ranked = recommendBooks(
    books,
    searchInput,
    { onlyAvailable: true, favorPopular: true, limit: Math.max(12, requestedLimit * 2), requireMatch: true },
    associations,
  );

  const finalList = diversify(ranked, requestedLimit);
  const items = finalList.map(toRecommendationItem);
  const youtube = await suggestYouTubeCourses(searchTerms);

  return { items, youtube };
};

export async function POST(request: Request) {
  let body: RecommendationRequest;

  try {
    body = (await request.json()) as RecommendationRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
  }

  const message = String(body.message ?? '').trim();
  if (!message) {
    return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
  }

  // Step 1: Rate limiting
  const clientKey = getClientKey(request);
  const now = Date.now();
  const rateResult = applyRateLimit(clientKey, now);
  if (rateResult.limited) {
    return NextResponse.json(
      { ok: false, kind: 'rate_limited', reply: rateResult.reply },
      { status: rateResult.status },
    );
  }

  // Step 2: Instant greeting check — no AI needed
  if (isGreeting(message)) {
    return NextResponse.json({
      ok: true,
      kind: 'chat',
      reply: 'Hi there! I can help you find books from the library catalog or answer academic questions. What are you looking for today?',
      recommendations: [],
      interests: [],
      summary: null,
      followUpQuestion: null,
    });
  }

  // Step 3: Sensitive content check — no AI needed
  if (isSensitiveContent(message)) {
    return NextResponse.json({
      ok: true,
      kind: 'reject',
      reply: 'Sorry, I cannot help with that topic. Feel free to ask about books or academic subjects.',
      recommendations: [],
      interests: [],
      summary: null,
      followUpQuestion: null,
    });
  }

  // Step 4: Fetch user context
  let userContext: UserContext = { historyTags: [], recentBorrowedBooks: [], savedInterests: [], faculty: null, department: null, intakeYear: null };
  try {
    const { user } = await getDashboardSession();
    if (user) userContext = await fetchUserContext(user.id);
  } catch {
    // Non-fatal
  }

  // Step 5: Single AI call — classify intent + extract everything
  const requestedLimit = clamp(Number(body.limit ?? 3), 1, 6);

  try {
    const aiResult = await classifyAndExtract(message, userContext);

    switch (aiResult.intent) {
      case 'greeting': {
        return NextResponse.json({
          ok: true,
          kind: 'chat',
          reply: 'Hi there! I can help you find books from the library catalog or answer academic questions. What are you looking for today?',
          recommendations: [],
          interests: [],
          summary: null,
          followUpQuestion: null,
        });
      }

      case 'off_topic': {
        return NextResponse.json({
          ok: true,
          kind: 'reject',
          reply: 'Sorry, I cannot help with that topic. Feel free to ask about books or academic subjects.',
          recommendations: [],
          interests: [],
          summary: null,
          followUpQuestion: null,
        });
      }

      case 'answer': {
        // Answer the question and try to find a few related books
        const [{ items, youtube }, answerText] = await Promise.all([
          findBooks(
            aiResult.searchTerms.length ? aiResult.searchTerms : [message],
            userContext,
            3,
          ),
          collectAnswer({
            message,
            intent: aiResult.intent,
            faqSection: aiResult.faqSection ?? null,
            bookTitles: [],
            userContext,
          }),
        ]);

        const reply = answerText || 'I was unable to generate an answer. Please try again or ask a librarian.';

        return NextResponse.json({
          ok: true,
          kind: items.length ? 'recommendations' : 'chat',
          reply,
          recommendations: items,
          youtubeSuggestions: youtube,
          interests: aiResult.searchTerms,
          summary: reply,
          followUpQuestion: aiResult.followUpQuestion,
        });
      }

      case 'find_books':
      case 'both': {
        if (!aiResult.searchTerms.length) {
          // Try to derive a personalized opener; fall back to a static prompt
          const presetKind = detectPresetIntent(message);
          const clarifyReply = presetKind
            ? buildPersonalizedSuggestion(userContext, presetKind).reply
            : 'Could you tell me more about what topics or subjects you are interested in?';
          return NextResponse.json({
            ok: true,
            kind: 'clarify',
            reply: clarifyReply,
            recommendations: [],
            interests: [],
            summary: null,
            followUpQuestion: null,
          });
        }

        const { items, youtube } = await findBooks(aiResult.searchTerms, userContext, requestedLimit);

        if (!items.length) {
          return NextResponse.json({
            ok: true,
            kind: 'no_matches',
            reply: `I could not find matching books in the catalog for "${aiResult.searchTerms.slice(0, 3).join(', ')}". Try broader topic keywords.`,
            recommendations: [],
            youtubeSuggestions: youtube,
            interests: aiResult.searchTerms,
            summary: null,
            followUpQuestion: aiResult.followUpQuestion,
          });
        }

        // For 'both', produce a streaming prose intro; for 'find_books', use a simple opener.
        let introReply: string;
        if (aiResult.intent === 'both') {
          introReply = await collectAnswer({
            message,
            intent: aiResult.intent,
            faqSection: aiResult.faqSection ?? null,
            bookTitles: items.slice(0, 5).map((i) => i.title),
            userContext,
          });
          if (!introReply) introReply = `Here are some books on ${aiResult.searchTerms.slice(0, 3).join(', ')} from our catalog.`;
        } else {
          const presetKind = detectPresetIntent(message);
          introReply = presetKind
            ? buildPersonalizedSuggestion(userContext, presetKind).reply
            : `Here are some books on ${aiResult.searchTerms.slice(0, 3).join(', ')} from our catalog.`;
        }

        return NextResponse.json({
          ok: true,
          kind: 'recommendations',
          reply: introReply,
          recommendations: items,
          youtubeSuggestions: youtube,
          interests: aiResult.searchTerms,
          summary: introReply,
          followUpQuestion: aiResult.followUpQuestion,
        });
      }

      default: {
        return NextResponse.json({
          ok: true,
          kind: 'clarify',
          reply: 'Could you tell me what topic or subject you are looking for? I can recommend books or answer academic questions.',
          recommendations: [],
          interests: [],
          summary: null,
          followUpQuestion: null,
        });
      }
    }
  } catch (error) {
    console.error('Recommendation service failed', error);
    return NextResponse.json(
      { ok: false, kind: 'error', reply: 'The recommendation service is temporarily unavailable. Please try again.' },
      { status: 500 },
    );
  }
}
