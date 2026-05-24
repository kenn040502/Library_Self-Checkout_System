import { NextResponse } from 'next/server';
import { retrieveCandidateBooks } from '@/app/lib/recommendations/retrieve';
import type { Book } from '@/app/lib/supabase/types';
import { callDeepSeekJson } from '@/app/lib/ai/deepseek';

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

type LLMBookEntry = {
  stage: 'beginner' | 'intermediate' | 'advanced';
  reason: string;
};

const assignWithLLM = async (
  topic: string,
  books: Book[],
): Promise<Stage[] | null> => {
  if (!books.length) return null;

  const keyMap: Record<string, Book> = {};
  const bookList = books
    .map((b, i) => {
      const key = `b${i}`;
      keyMap[key] = b;
      const tags = (b.tags ?? []).slice(0, 5).join(', ');
      return `${key}: "${b.title}" by ${b.author ?? 'Unknown'}${tags ? ` [${tags}]` : ''}`;
    })
    .join('\n');

  const systemPrompt = [
    'You are a librarian assistant that classifies books by difficulty level.',
    'Classify each book into exactly one stage: "beginner", "intermediate", or "advanced".',
    'Write a ONE sentence reason (max 15 words) explaining why it fits that stage.',
    'Return ONLY valid JSON: {"b0": {"stage": "beginner", "reason": "..."}, ...}',
    'No extra text.',
  ].join('\n');

  const userMessage = [
    `Topic: ${topic}`,
    '',
    'Books:',
    bookList,
  ].join('\n');

  const res = await callDeepSeekJson(systemPrompt, userMessage, { temperature: 0.2, maxTokens: 1024 });

  if (!res.ok) return null;

  const parsed = res.data as Record<string, LLMBookEntry> | null;
  if (!parsed || typeof parsed !== 'object') return null;

  const beginner: StageBook[] = [];
  const intermediate: StageBook[] = [];
  const advanced: StageBook[] = [];

  for (const [key, entry] of Object.entries(parsed)) {
    const book = keyMap[key];
    if (!book || typeof entry !== 'object' || !entry) continue;
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
      stages = await assignWithLLM(topic, books);
    } catch (err) {
      console.warn('[learning-path] LLM failed, using fallback', err);
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
