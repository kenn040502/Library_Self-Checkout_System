import type { Book } from '@/app/lib/supabase/types';

export type RecommendationOptions = {
  onlyAvailable?: boolean;
  favorNew?: boolean;
  favorPopular?: boolean;
  limit?: number;
  requireMatch?: boolean;
};

export type Recommendation = {
  book: Book;
  score: number;
  reasons: string[];
};

export type AssociationRule = {
  tag: string;
  confidence: number;
  lift: number;
  support: number;
  count: number;
};

const normalizeTag = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length ? trimmed : null;
};

const STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'been',
  'being',
  'but',
  'by',
  'can',
  'could',
  'did',
  'do',
  'does',
  'for',
  'from',
  'have',
  'hey',
  'hi',
  'how',
  'i',
  'im',
  "i'm",
  'if',
  'in',
  'is',
  'it',
  'know',
  'like',
  'me',
  'more',
  'my',
  'of',
  'on',
  'or',
  'our',
  'please',
  'tell',
  'that',
  'the',
  'their',
  'them',
  'this',
  'to',
  'too',
  'not',
  'those',
  'these',
  'book',
  'books',
  'us',
  'want',
  'we',
  'what',
  'with',
  'why',
  'would',
  'you',
  'your',
  'also',
  'about',
  'learn',
  'learning',
  'ask',
  'asking',
  'interest',
  'interested',
  'give',
  'gimme',
  'show',
  'find',
  'finding',
  'need',
  'needs',
  'recommend',
  'recommendation',
  'recommendations',
  'suggest',
  'suggestion',
  'suggestions',
  'looking',
  'look',
  'get',
  'got',
  'some',
  'any',
  'good',
  'best',
  'great',
  'nice',
  'please',
]);

const ACRONYM_EXPANSIONS: Record<string, string> = {
  ai: 'artificial intelligence',
  ml: 'machine learning',
  nlp: 'natural language processing',
  cv: 'computer vision',
  db: 'database',
  os: 'operating system',
  hr: 'human resources',
  ui: 'user interface',
  ux: 'user experience',
  iot: 'internet of things',
  ar: 'augmented reality',
  vr: 'virtual reality',
};

export const expandAcronyms = (tokens: string[]): string[] => {
  const out: string[] = [];
  for (const t of tokens) {
    const expanded = ACRONYM_EXPANSIONS[t.toLowerCase()];
    if (expanded) out.push(expanded);
    else out.push(t);
  }
  return out;
};

const AMBIGUOUS_TEXT_TOKENS = new Set(['code', 'coding']);
const COMPUTING_HINTS = [
  'computer',
  'computing',
  'software',
  'program',
  'programming',
  'algorithm',
  'data',
  'database',
  'network',
  'system',
  'operating',
  'engineering',
  'ai',
  'machine',
];

const SYNONYM_MAP: Record<string, string[]> = {
  code: ['programming', 'software'],
  coding: ['programming', 'software'],
  programing: ['programming', 'software'],
  programmer: ['programming', 'software'],
  programming: ['software'],
  python: ['programming'],
  ai: ['machine', 'learning', 'data', 'intelligence'],
  'artificial intelligence': ['ai', 'machine', 'learning'],
  robotic: ['robotics', 'automation'],
  robotics: ['robotic', 'automation'],
  javascript: ['programming', 'web'],
  typescript: ['programming', 'web'],
  marketing: ['business'],
  finance: ['accounting', 'business'],
  accounting: ['finance', 'business'],
  art: ['design', 'visual'],
  design: ['art', 'creative'],
  multimedia: ['design', 'media'],
};

export const tokenizeInterests = (input: string): string[] =>
  input
    .split(/[,\n]/)
    .flatMap((chunk) => chunk.split(/\s+/))
    .map((token) =>
      token
        .trim()
        .toLowerCase()
        .replace(/\bprograming\b/g, 'programming')
        .replace(/\bstastic\b/g, 'statistics')
        .replace(/\bstatistic\b/g, 'statistics')
        .replace(/\bintelligenct\b/g, 'intelligence')
        .replace(/^[^a-z0-9#]+|[^a-z0-9]+$/gi, ''),
    )
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));

const unique = <T,>(values: T[]): T[] => Array.from(new Set(values));
const normalizeInterestToken = (token: string): string =>
  token.startsWith('#') ? token.slice(1) : token;

const countLoans = (book: Book): number =>
  (book.copies ?? []).reduce((total, copy) => total + (copy.loans?.length ?? 0), 0);

export function buildAssociationRules(books: Book[]): Record<string, AssociationRule[]> {
  const tagCounts = new Map<string, number>();
  const pairCounts = new Map<string, Map<string, number>>();

  books.forEach((book) => {
    const tags = unique(
      (book.tags ?? [])
        .map(normalizeTag)
        .filter((tag): tag is string => !!tag),
    );

    tags.forEach((tag) => {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    });

    for (let i = 0; i < tags.length; i += 1) {
      for (let j = 0; j < tags.length; j += 1) {
        if (i === j) continue;
        const a = tags[i];
        const b = tags[j];
        const map = pairCounts.get(a) ?? new Map<string, number>();
        map.set(b, (map.get(b) ?? 0) + 1);
        pairCounts.set(a, map);
      }
    }
  });

  const totalBooks = books.length || 1;
  const rules: Record<string, AssociationRule[]> = {};

  pairCounts.forEach((targets, source) => {
    const sourceCount = tagCounts.get(source) ?? 1;
    const derived = Array.from(targets.entries())
      .map(([tag, coCount]) => {
        const targetCount = tagCounts.get(tag) ?? 1;
        const support = coCount / totalBooks;
        const confidence = coCount / sourceCount;
        const lift = confidence / (targetCount / totalBooks);
        return { tag, confidence, lift, support, count: coCount };
      })
      .filter((rule) => rule.support >= 0.02 || rule.confidence >= 0.15)
      .sort((a, b) => b.confidence * b.lift - a.confidence * a.lift)
      .slice(0, 4);

    if (derived.length) {
      rules[source] = derived;
    }
  });

  return rules;
}

const collectTextCorpus = (book: Book): string =>
  [
    book.title,
    book.author,
    book.classification,
    book.publisher,
    book.tags?.join(' ') ?? '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

export function recommendBooks(
  books: Book[],
  interestInput: string,
  options: RecommendationOptions = {},
  associations?: Record<string, AssociationRule[]>,
): Recommendation[] {
  const {
    onlyAvailable = true,
    favorNew = false,
    favorPopular = true,
    limit = 12,
  } = options;
  const { requireMatch = false } = options;

  const rawTokens = tokenizeInterests(interestInput);
  const normalizedTokens = rawTokens
    .map(normalizeInterestToken)
    .map((t) => t.trim())
    .filter((t) => t.length > 1);
  const expandedTokens = unique(
    normalizedTokens.flatMap((token) => [token, ...(SYNONYM_MAP[token] ?? [])]),
  );
  const interestTokens = expandedTokens;
  const interestSet = new Set(interestTokens);

  const associationDerived = new Set<string>();
  if (associations) {
    interestTokens.forEach((token) => {
      associations[token]?.forEach((rule) => associationDerived.add(rule.tag));
    });
  }

  const recommendations: Recommendation[] = [];

  books.forEach((book) => {
    if (onlyAvailable && book.availableCopies <= 0) return;

    const tags = unique(
      (book.tags ?? [])
        .map(normalizeTag)
        .filter((tag): tag is string => !!tag),
    );

    const textCorpus = collectTextCorpus(book);
    const hasComputingHint =
      COMPUTING_HINTS.some((hint) => textCorpus.includes(hint)) ||
      tags.some((tag) => COMPUTING_HINTS.some((hint) => tag.includes(hint)));
    const matchedTags = tags.filter((tag) => interestSet.has(tag));
    const relatedTags = tags.filter((tag) => associationDerived.has(tag) && !interestSet.has(tag));
    const safeMatchedTags = matchedTags.filter(
      (tag) => !AMBIGUOUS_TEXT_TOKENS.has(tag) || hasComputingHint,
    );
    const safeRelatedTags = relatedTags.filter(
      (tag) => !AMBIGUOUS_TEXT_TOKENS.has(tag) || hasComputingHint,
    );

    const textMatches = interestTokens.filter(
      (token) =>
        token.length > 2 &&
        textCorpus.includes(token) &&
        (!AMBIGUOUS_TEXT_TOKENS.has(token) || hasComputingHint),
    );

    if (
      requireMatch &&
      interestTokens.length > 0 &&
      safeMatchedTags.length === 0 &&
      safeRelatedTags.length === 0 &&
      textMatches.length === 0
    ) {
      return;
    }

    let score = 0;
    const reasons: string[] = [];

    if (safeMatchedTags.length) {
      score += safeMatchedTags.length * 3;
      reasons.push(`Matches your interests: ${safeMatchedTags.slice(0, 3).join(', ')}`);
    }

    if (safeRelatedTags.length) {
      score += safeRelatedTags.length * 2;
      reasons.push(`Related via association rules: ${safeRelatedTags.slice(0, 3).join(', ')}`);
    }

    if (textMatches.length) {
      score += textMatches.length * 1.5;
      reasons.push(`Appears in title/description: ${textMatches.slice(0, 3).join(', ')}`);
    }

    if (book.availableCopies > 0) {
      score += 1;
      reasons.push('Available on shelf now');
    } else if (!onlyAvailable) {
      score -= 1;
      reasons.push('Currently on loan');
    }

    if (favorPopular) {
      const loanBoost = Math.min(
        2.5,
        Math.log1p(countLoans(book) + (book.totalCopies - book.availableCopies)),
      );
      if (loanBoost > 0) {
        score += loanBoost;
        reasons.push('Popular with other readers');
      }
    }

    if (favorNew && book.publicationYear) {
      const parsedYear = Number(book.publicationYear);
      if (!Number.isNaN(parsedYear)) {
        const recencyBoost = Math.max(0, (parsedYear - 2015) / 10);
        score += recencyBoost;
        reasons.push('Recent publication');
      }
    }

    if (!reasons.length) {
      reasons.push('Top pick based on availability and circulation');
    }

    recommendations.push({ book, score, reasons });
  });

  return recommendations
    .sort((a, b) => {
      if (b.score === a.score) {
        return a.book.title.localeCompare(b.book.title);
      }
      return b.score - a.score;
    })
    .slice(0, limit);
}
