import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/auth';
import { getSupabaseServerClient } from '@/app/lib/supabase/server';
import { callDeepSeekJson } from '@/app/lib/ai/deepseek';

type MinimalBook = {
  id: string;
  title: string;
  author: string | null;
  classification: string | null;
  publisher: string | null;
};

const FACULTY_TAGS = [
  'computer science',
  'engineering',
  'art and design',
  'business',
];

type TagName = (typeof FACULTY_TAGS)[number];

// OpenAI fallback (used when DeepSeek is unavailable/quotaed)
const getOpenAIEnv = () => {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').trim();
  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';
  return { apiKey, baseUrl, model };
};

async function callOpenAI(
  books: MinimalBook[],
): Promise<Record<string, string[]>> {
  const { apiKey, baseUrl, model } = getOpenAIEnv();
  if (!apiKey) throw new Error('OPENAI_API_KEY missing');

  const prompt = buildPrompt(books);

  const response = await fetch(`${baseUrl.replace(/[/]+$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    }),
  });

  const raw = await response.json().catch(async () => ({
    fallbackText: await response.text(),
  }));

  if (!response.ok) {
    const errText = typeof raw === 'string' ? raw : JSON.stringify(raw);
    throw new Error(`OpenAI error ${response.status}: ${errText}`);
  }

  const text: string =
    raw?.choices?.[0]?.message?.content ?? raw?.fallbackText ?? '';

  if (!text) throw new Error('OpenAI returned empty response');

  try {
    return JSON.parse(text) as Record<string, string[]>;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as Record<string, string[]>;
    throw new Error('OpenAI returned non-JSON');
  }
}

function inferFallbackTag(book: MinimalBook): TagName {
  const text = [
    book.title ?? '',
    book.author ?? '',
    book.classification ?? '',
    book.publisher ?? '',
  ]
    .join(' ')
    .toLowerCase();

  const hit = (words: string[]) => words.some((w) => text.includes(w));

  if (
    hit([
      'computer',
      'software',
      'program',
      'code',
      'algorithm',
      'data',
      'ai',
      'machine learning',
      'database',
      'network',
      'cyber',
      'security',
    ])
  ) {
    return 'computer science';
  }

  if (
    hit([
      'engineer',
      'engineering',
      'mechanical',
      'electrical',
      'civil',
      'chemical',
      'mechatronics',
      'robotics',
      'control',
      'thermo',
      'materials',
      'surveying',
      'construction',
    ])
  ) {
    return 'engineering';
  }

  if (
    hit([
      'design',
      'art',
      'creative',
      'graphic',
      'multimedia',
      'visual',
      'ux',
      'ui',
    ])
  ) {
    return 'art and design';
  }

  if (
    hit([
      'business',
      'management',
      'finance',
      'marketing',
      'accounting',
      'economics',
      'entrepreneur',
      'commerce',
    ])
  ) {
    return 'business';
  }

  // If nothing matches, drop into the broadest bucket.
  return 'engineering';
}

const normalizeTags = (tags: string[]): string[] =>
  Array.from(
    new Set(
      tags
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0 && t.length <= 32),
    ),
  ).slice(0, 6);

async function upsertBookTags(
  bookId: string,
  tags: string[],
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const normalized = normalizeTags(tags);

  if (normalized.length === 0) return;

  const { data: existingTags, error: fetchTagsError } = await supabase
    .from('BookTags')
    .select('id, name')
    .in('name', normalized);

  if (fetchTagsError) throw fetchTagsError;

  const tagIdByName = new Map<string, string>();
  (existingTags ?? []).forEach((tag) => {
    if (tag?.name) tagIdByName.set(tag.name.toLowerCase(), tag.id);
  });

  const toCreate = normalized.filter((name) => !tagIdByName.has(name));

  if (toCreate.length > 0) {
    const { data: created, error: createError } = await supabase
      .from('BookTags')
      .insert(toCreate.map((name) => ({ name })))
      .select('id, name');

    if (createError) throw createError;

    (created ?? []).forEach((tag) => {
      if (tag?.name) tagIdByName.set(tag.name.toLowerCase(), tag.id);
    });
  }

  const desiredIds = normalized
    .map((name) => tagIdByName.get(name))
    .filter((id): id is string => Boolean(id));

  const { data: currentLinks, error: fetchLinksError } = await supabase
    .from('BookTagsLinks')
    .select('tag_id')
    .eq('book_id', bookId);

  if (fetchLinksError) throw fetchLinksError;

  const current = new Set(
    (currentLinks ?? [])
      .map((l) => l?.tag_id)
      .filter((id): id is string => Boolean(id)),
  );

  const desired = new Set(desiredIds);
  const toRemove = Array.from(current).filter((id) => !desired.has(id));
  const toAdd = desiredIds.filter((id) => !current.has(id));

  if (toRemove.length > 0) {
    await supabase
      .from('BookTagsLinks')
      .delete()
      .eq('book_id', bookId)
      .in('tag_id', toRemove);
  }

  if (toAdd.length > 0) {
    await supabase
      .from('BookTagsLinks')
      .insert(toAdd.map((tagId) => ({ book_id: bookId, tag_id: tagId })));
  }
}

const buildPrompt = (books: MinimalBook[]): string => {
  const lines = books.map((b, idx) => {
    const parts = [
      `title="${b.title}"`,
      b.author ? `author="${b.author}"` : null,
      b.classification ? `class="${b.classification}"` : null,
      b.publisher ? `pub="${b.publisher}"` : null,
    ].filter(Boolean);
    return `b${idx}: ${parts.join(', ')}`;
  });

  return [
    'Classify each book into at most TWO tags from this exact list:',
    ...FACULTY_TAGS.map((f) => `- ${f}`),
    'Return ONLY JSON like {"b0": ["computer science"], "b1": ["business"]}.',
    'Rules: use only the provided faculty tags; lowercase; no other words; prefer one tag; use two only if genuinely cross-faculty; if unsure, return an empty array.',
    '',
    'Books:',
    ...lines,
  ].join('\n');
};

async function callDeepSeek(books: MinimalBook[]): Promise<Record<string, string[]>> {
  const systemPrompt = 'You are a librarian assistant. Respond only with valid JSON as instructed.';

  const res = await callDeepSeekJson(systemPrompt, buildPrompt(books), { temperature: 0.2, maxTokens: 512 });

  if (!res.ok) throw new Error(`DeepSeek request failed: ${res.kind}`);

  const data = res.data as Record<string, string[]> | null;
  if (!data || typeof data !== 'object') throw new Error('DeepSeek returned non-object JSON');
  return data;
}

async function callLLMWithFallback(books: MinimalBook[]): Promise<Record<string, string[]>> {
  // Try DeepSeek first, then OpenAI fallback, then heuristic.
  try {
    return await callDeepSeek(books);
  } catch (err) {
    console.warn('[auto-tag] deepseek failed, trying openai', err);
    try {
      return await callOpenAI(books);
    } catch (err2) {
      console.error('[auto-tag] openai failed, falling back to heuristics', err2);
      // Fallback: empty tags; caller will apply heuristics.
      const blank: Record<string, string[]> = {};
      books.forEach((_b, idx) => (blank[`b${idx}`] = []));
      return blank;
    }
  }
}

async function loadBooksToTag(
  bookId: string | null,
  retag: boolean,
): Promise<MinimalBook[]> {
  const supabase = getSupabaseServerClient();

  const query = supabase
    .from('Books')
    .select(
      `id, title, author, classification, publisher,
       book_tag_links:BookTagsLinks(tag_id)`,
    )
    .order('title')
    .limit(200);

  const { data, error } = bookId
    ? await query.eq('id', bookId)
    : await query;

  if (error) throw error;

  const books: MinimalBook[] = (data ?? [])
    .filter((b: any) =>
      retag ? true : !(b.book_tag_links && b.book_tag_links.length > 0),
    )
    .map((b: any) => ({
      id: b.id,
      title: b.title ?? 'Untitled',
      author: b.author ?? null,
      classification: b.classification ?? null,
      publisher: b.publisher ?? null,
    }));

  return books;
}

export async function POST(req: NextRequest) {
  try {
    // Only staff/admin may trigger bulk tagging
    await requireStaff();

    const body = await req.json().catch(() => null);
    const bookId: string | null = body?.bookId ?? null;
    const retag: boolean = Boolean(body?.retag);

    const books = await loadBooksToTag(bookId, retag);

    if (books.length === 0) {
      return NextResponse.json({ ok: true, tagged: 0, skipped: Boolean(bookId) });
    }

    let tagged = 0;
    const chunkSize = 20;

    const taggedById = new Map<string, string[]>();

    for (let i = 0; i < books.length; i += chunkSize) {
      const slice = books.slice(i, i + chunkSize);
      const result = await callLLMWithFallback(slice);

      await Promise.all(
        slice.map(async (book, idx) => {
          const key = `b${idx}`;
          let tags = normalizeTags(result?.[key] ?? []).filter((t) =>
            FACULTY_TAGS.includes(t),
          );

          if (tags.length === 0) {
            tags = [inferFallbackTag(book)];
          }

          if (tags.length > 0) {
            await upsertBookTags(book.id, tags);
            taggedById.set(book.id, tags);
            tagged += 1;
          }
        }),
      );
    }

    const responseBody = bookId
      ? { ok: true, tagged, tags: taggedById.get(bookId) ?? [], retag }
      : { ok: true, tagged, retag };

    return NextResponse.json(responseBody);
  } catch (err: unknown) {
    console.error('[auto-tag] error', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = message.toLowerCase().includes('unauthorized') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
