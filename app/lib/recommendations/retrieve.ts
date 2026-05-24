import type { Book } from '@/app/lib/supabase/types';
import { fetchBooks } from '@/app/lib/supabase/queries';
import { getSupabaseServerClient } from '@/app/lib/supabase/server';
import { embed } from '@/app/lib/recommendations/embeddings';
import { tokenizeInterests, expandAcronyms } from '@/app/lib/recommendations/recommender';

const DEFAULT_LIMIT = 200;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const studyYearFromIntake = (intakeYear: number | null): number | null => {
  if (!intakeYear) return null;
  const year = new Date().getFullYear() - intakeYear + 1;
  return Math.min(Math.max(year, 1), 4);
};

const studyYearToLevel = (studyYear: number): number => {
  if (studyYear <= 1) return 1;
  if (studyYear <= 2) return 2;
  return 3;
};

// Re-rank vector matches with category/level bonuses so faculty-aligned books bubble up.
const applyContextBoost = (
  base: { book: Book; score: number }[],
  preferredCategory: string | null,
  studyYear: number | null,
): { book: Book; score: number }[] => {
  return base
    .map(({ book, score }) => {
      let boosted = score;
      if (preferredCategory && book.category === preferredCategory) {
        boosted += 0.05;
      }
      if (studyYear && book.level) {
        const expected = studyYearToLevel(studyYear);
        if (book.level === expected) boosted += 0.03;
        else if (Math.abs(book.level - expected) === 1) boosted += 0.015;
      }
      return { book, score: boosted };
    })
    .sort((a, b) => b.score - a.score);
};

// Extract phrases (comma/period-separated) and individual content words from a query.
// Returns both granularities so a book tagged "artificial intelligence" matches the phrase,
// and a book tagged just "ai" still matches the token.
const buildQueryTerms = (query: string): { phrases: string[]; tokens: string[] } => {
  const phrases = query
    .split(/[,.;]+/)
    .map((p) => p.trim().toLowerCase())
    .filter((p) => p.length > 1);

  const tokens = expandAcronyms(tokenizeInterests(query)).map((t) => t.toLowerCase());
  const expandedPhrases = expandAcronyms(phrases).map((t) => t.toLowerCase());

  return {
    phrases: Array.from(new Set([...phrases, ...expandedPhrases])),
    tokens: Array.from(new Set(tokens)),
  };
};

// Tag-first / text-fallback retrieval against the full in-memory catalog.
// Scores books by:
//   +3.0 exact tag match to a query phrase (e.g. tag "artificial intelligence" == phrase "artificial intelligence")
//   +2.0 tag contains / is contained in a query phrase or token
//   +1.5 query token appears in tag
//   +1.0 query phrase appears in title
//   +0.6 query token appears in title
//   +0.4 query token appears in author / classification / publisher
const tagAndTextScore = (book: Book, phrases: string[], tokens: string[]): number => {
  const tags = (book.tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean);
  const title = (book.title ?? '').toLowerCase();
  const author = (book.author ?? '').toLowerCase();
  const classification = (book.classification ?? '').toLowerCase();
  const publisher = (book.publisher ?? '').toLowerCase();

  let score = 0;

  for (const phrase of phrases) {
    if (!phrase) continue;
    if (tags.includes(phrase)) score += 3.0;
    else if (tags.some((tag) => tag.includes(phrase) || phrase.includes(tag))) score += 2.0;
    if (title.includes(phrase)) score += 1.0;
  }

  for (const token of tokens) {
    if (!token || token.length < 2) continue;
    if (tags.some((tag) => tag.includes(token))) score += 1.5;
    if (title.includes(token)) score += 0.6;
    if (author.includes(token)) score += 0.4;
    if (classification.includes(token)) score += 0.4;
    if (publisher.includes(token)) score += 0.3;
  }

  return score;
};

export async function retrieveCandidateBooks(
  searchTerm: string,
  limit = DEFAULT_LIMIT,
  preferredCategory: string | null = null,
  intakeYear: number | null = null,
): Promise<Book[]> {
  const sanitizedLimit = clamp(limit, 20, DEFAULT_LIMIT);
  const trimmed = searchTerm.trim();
  const studyYear = studyYearFromIntake(intakeYear);

  const allBooks = await fetchBooks();

  if (!trimmed) {
    return allBooks.slice(0, sanitizedLimit);
  }

  const supabase = getSupabaseServerClient();

  // Vector search (semantic) and tag/text pass run in parallel.
  const vectorPromise = (async () => {
    try {
      const queryVector = await embed(trimmed);
      const { data, error } = await supabase.rpc('match_books', {
        query_embedding: queryVector,
        match_count: sanitizedLimit,
      });
      if (error) {
        console.error('[recommendations] vector search failed', error);
        return [] as Array<{ id: string; score: number }>;
      }
      return ((data ?? []) as Array<{ id: string; score: number }>).map((row) => ({
        id: row.id,
        score: row.score ?? 0,
      }));
    } catch (err) {
      console.error('[recommendations] embedding failed', err);
      return [] as Array<{ id: string; score: number }>;
    }
  })();

  const { phrases, tokens } = buildQueryTerms(trimmed);
  const tagScored = allBooks
    .map((book) => ({ book, score: tagAndTextScore(book, phrases, tokens) }))
    .filter((entry) => entry.score > 0);

  const vectorScored = await vectorPromise;

  console.info(
    '[recommendations] catalog size:', allBooks.length,
    '| query:', trimmed,
    '| vector matches:', vectorScored.length,
    '| tag/text matches:', tagScored.length,
    '| category:', preferredCategory ?? 'any',
    '| study year:', studyYear ?? 'unknown',
  );

  // Merge vector + tag/text scores. Tag/text matches get a small baseline bonus so
  // that a directly-tagged book always out-ranks a weak vector match.
  const bookById = new Map(allBooks.map((b) => [b.id, b]));
  const mergedScore = new Map<string, { book: Book; score: number }>();

  for (const { id, score } of vectorScored) {
    const book = bookById.get(id);
    if (!book) continue;
    mergedScore.set(id, { book, score });
  }

  for (const { book, score } of tagScored) {
    const existing = mergedScore.get(book.id);
    // Normalize tag/text score onto roughly the same scale as cosine similarity (0..1).
    // A fully-matched tag phrase (score ~3) becomes ~0.9, weaker matches scale down.
    const normalized = Math.min(1, 0.3 + score * 0.2);
    if (existing) {
      existing.score = Math.max(existing.score, normalized) + 0.1;
    } else {
      mergedScore.set(book.id, { book, score: normalized });
    }
  }

  const merged = Array.from(mergedScore.values());

  // If we found NOTHING (no vector match, no tag match), fall back to whole catalog
  // so the caller can still surface popular/available books.
  if (!merged.length) {
    return allBooks.slice(0, sanitizedLimit);
  }

  const reranked = applyContextBoost(merged, preferredCategory, studyYear);
  return reranked.slice(0, sanitizedLimit).map((e) => e.book);
}
