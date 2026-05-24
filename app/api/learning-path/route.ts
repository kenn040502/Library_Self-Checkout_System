import { NextResponse } from 'next/server';
import { retrieveCandidateBooks } from '@/app/lib/recommendations/retrieve';
import type { Book } from '@/app/lib/supabase/types';

type StageBook = {
  id: string;
  title: string;
  author: string | null;
  availableCopies: number;
  totalCopies: number;
  reason: string;
};

type Stage = {
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  books: StageBook[];
};

type LearningPathRequest = {
  topic?: string;
};

const getEnv = () => ({
  geminiApiKey: process.env.GEMINI_API_KEY?.trim(),
  geminiModel: process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash',
  geminiBaseUrl:
    process.env.GEMINI_API_BASE_URL?.trim() ||
    'https://generativelanguage.googleapis.com/v1beta',
});

const toStageBook = (book: Book, reason: string): StageBook => ({
  id: book.id,
  title: book.title,
  author: book.author ?? null,
  availableCopies: book.availableCopies ?? 0,
  totalCopies: book.totalCopies ?? 0,
  reason,
});

const MAX_BOOKS_PER_STAGE = 3;

const fallbackSplit = (books: Book[]): Stage[] => {
  const total = books.length;
  const third = Math.ceil(total / 3);
  const beginner = books.slice(0, third).slice(0, MAX_BOOKS_PER_STAGE);
  const intermediate = books.slice(third, third * 2).slice(0, MAX_BOOKS_PER_STAGE);
  const advanced = books.slice(third * 2).slice(0, MAX_BOOKS_PER_STAGE);

  const stages: Stage[] = [
    {
      level: 'Beginner',
      description: 'Start here — no prior knowledge needed',
      books: beginner.map((b) => toStageBook(b, 'Recommended for this level')),
    },
    {
      level: 'Intermediate',
      description: 'Build on the basics — some experience helpful',
      books: intermediate.map((b) => toStageBook(b, 'Recommended for this level')),
    },
    {
      level: 'Advanced',
      description: 'Deep dive — for those with solid foundations',
      books: advanced.map((b) => toStageBook(b, 'Recommended for this level')),
    },
  ];
  return stages.filter((stage) => stage.books.length > 0);
};

type GeminiBookEntry = {
  stage: 'beginner' | 'intermediate' | 'advanced';
  reason: string;
};

const assignWithGemini = async (
  topic: string,
  books: Book[],
): Promise<Stage[] | null> => {
  const { geminiApiKey, geminiModel, geminiBaseUrl } = getEnv();
  if (!geminiApiKey || !books.length) return null;

  const keyMap: Record<string, Book> = {};
  const bookList = books
    .map((b, i) => {
      const key = `b${i}`;
      keyMap[key] = b;
      const tags = (b.tags ?? []).slice(0, 5).join(', ');
      return `${key}: "${b.title}" by ${b.author ?? 'Unknown'}${tags ? ` [${tags}]` : ''}`;
    })
    .join('\n');

  const prompt = [
    `Topic: ${topic}`,
    '',
    'Classify each book below into exactly one stage: "beginner", "intermediate", or "advanced".',
    'Write a ONE sentence reason (max 15 words) explaining why it fits that stage.',
    'Return ONLY valid JSON: {"b0": {"stage": "beginner", "reason": "..."}, ...}',
    'No extra text.',
    '',
    'Books:',
    bookList,
  ].join('\n');

  const url = `${geminiBaseUrl.replace(/\/+$/, '')}/models/${encodeURIComponent(geminiModel)}:generateContent?key=${encodeURIComponent(geminiApiKey)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2 },
    }),
  });

  if (!res.ok) throw new Error(`Gemini ${res.status}`);

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const text =
    data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  if (!text.trim()) return null;

  let parsed: Record<string, GeminiBookEntry> | null = null;
  try {
    parsed = JSON.parse(text.trim()) as Record<string, GeminiBookEntry>;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]) as Record<string, GeminiBookEntry>;
      } catch {
        return null;
      }
    }
  }

  if (!parsed) return null;

  const beginner: StageBook[] = [];
  const intermediate: StageBook[] = [];
  const advanced: StageBook[] = [];

  for (const [key, entry] of Object.entries(parsed)) {
    const book = keyMap[key];
    if (!book) continue;
    const stageBook = toStageBook(book, entry.reason ?? 'Recommended for this level');
    if (entry.stage === 'beginner') beginner.push(stageBook);
    else if (entry.stage === 'intermediate') intermediate.push(stageBook);
    else advanced.push(stageBook);
  }

  const stages: Stage[] = [
    { level: 'Beginner', description: 'Start here — no prior knowledge needed', books: beginner.slice(0, MAX_BOOKS_PER_STAGE) },
    { level: 'Intermediate', description: 'Build on the basics — some experience helpful', books: intermediate.slice(0, MAX_BOOKS_PER_STAGE) },
    { level: 'Advanced', description: 'Deep dive — for those with solid foundations', books: advanced.slice(0, MAX_BOOKS_PER_STAGE) },
  ];
  return stages.filter((stage) => stage.books.length > 0);
};

export async function POST(request: Request) {
  let body: LearningPathRequest;
  try {
    body = (await request.json()) as LearningPathRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
  }

  const topic = String(body.topic ?? '').trim();
  if (!topic) {
    return NextResponse.json({ error: 'Topic is required.' }, { status: 400 });
  }

  try {
    const books = await retrieveCandidateBooks(topic, 30);

    if (!books.length) {
      return NextResponse.json({
        ok: false,
        error: 'No books found for that topic in the catalog.',
      });
    }

    let stages: Stage[] | null = null;

    try {
      stages = await assignWithGemini(topic, books);
    } catch (err) {
      console.warn('[learning-path] Gemini failed, using fallback', err);
    }

    if (!stages || !stages.length) {
      stages = fallbackSplit(books);
    }

    return NextResponse.json({ ok: true, topic, stages });
  } catch (error) {
    console.error('[learning-path] error', error);
    return NextResponse.json(
      { ok: false, error: 'Learning path generation failed.' },
      { status: 500 },
    );
  }
}
