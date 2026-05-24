# Smart Reading Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the reading-assistant chat actually smart — remember the conversation, know the user's profile, see their active loans + due dates, and proactively suggest follow-ups based on books they just returned.

**Architecture:** Single-call enriched-prompt approach. Per request, fetch user profile + active loans + recently-returned loans + last 10 chat turns from Supabase in parallel, build an enriched Gemini `systemInstruction`, send the conversation as multi-turn `contents`. New `loan_status` intent lets the AI answer questions about due dates without triggering a book search.

**Tech Stack:** Next.js 15 App Router, Supabase (Postgres), Gemini 2.5 Flash Lite (no thinking by default), Jest with jsdom/node envs, TypeScript.

**Spec:** `docs/superpowers/specs/2026-05-07-smart-reading-assistant-design.md`

---

## Pre-flight

The working tree may contain uncommitted edits to `app/lib/recommendations/ai.ts` from a prior brainstorming session. Reset to a clean baseline so this plan drives every change via TDD.

- [ ] **Reset `ai.ts` to HEAD**

```bash
git checkout app/lib/recommendations/ai.ts
git status --short
```

Expected: working tree clean (or only the plan file untracked).

---

## Task 1: Add `fetchRecentlyReturnedLoans` query helper

Why: the spec needs a list of loans the user returned in the last N days so the AI can suggest follow-up reads. The existing `fetchActiveLoans` only handles `returned_at IS NULL` loans; we need its mirror.

**Files:**
- Modify: `app/lib/supabase/queries.ts` (add export after `fetchActiveLoans`)
- Test: `__tests__/queries.recentlyReturnedLoans.test.ts` (new)

- [ ] **Step 1.1: Write the failing test**

Create `__tests__/queries.recentlyReturnedLoans.test.ts`:

```ts
/** @jest-environment node */

const mockOrder = jest.fn();
const mockGte = jest.fn(() => ({ order: mockOrder }));
const mockNot = jest.fn(() => ({ gte: mockGte, eq: jest.fn(() => ({ gte: mockGte })) }));
const mockEqAfterNot = jest.fn(() => ({ gte: mockGte }));
const mockSelect = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/app/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({ from: mockFrom }),
}));

beforeEach(() => {
  mockOrder.mockReset();
  mockGte.mockReset().mockReturnValue({ order: mockOrder });
  mockEqAfterNot.mockReset().mockReturnValue({ gte: mockGte });
  mockNot.mockReset().mockReturnValue({ gte: mockGte, eq: mockEqAfterNot });
  mockSelect.mockReset().mockReturnValue({ not: mockNot });
  mockFrom.mockReset().mockReturnValue({ select: mockSelect });
});

test('fetchRecentlyReturnedLoans filters by user, non-null returned_at, and within window', async () => {
  mockOrder.mockResolvedValue({ data: [], error: null });

  const { fetchRecentlyReturnedLoans } = await import('@/app/lib/supabase/queries');
  const result = await fetchRecentlyReturnedLoans('user-uuid', 14, 5);

  expect(result).toEqual([]);
  expect(mockFrom).toHaveBeenCalledWith('Loans');
  expect(mockNot).toHaveBeenCalledWith('returned_at', 'is', null);
  expect(mockEqAfterNot).toHaveBeenCalledWith('user_id', 'user-uuid');
  // gte called with returned_at column and an ISO timestamp
  expect(mockGte).toHaveBeenCalled();
  const [col, value] = mockGte.mock.calls[0];
  expect(col).toBe('returned_at');
  expect(typeof value).toBe('string');
  expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T/);
});

test('fetchRecentlyReturnedLoans maps rows into Loan shape', async () => {
  mockOrder.mockResolvedValue({
    data: [
      {
        id: 'loan-1',
        copy_id: 'copy-1',
        user_id: 'user-uuid',
        borrowed_at: '2026-04-01T00:00:00Z',
        due_at: '2026-04-15T00:00:00Z',
        returned_at: '2026-04-14T00:00:00Z',
        renewed_count: 0,
        handled_by: null,
        created_at: null,
        updated_at: null,
        copy: { id: 'copy-1', barcode: 'B1', book: { id: 'b1', title: 'Sapiens', author: 'Yuval Harari', isbn: '123' } },
        borrower: null,
        handler: null,
      },
    ],
    error: null,
  });

  const { fetchRecentlyReturnedLoans } = await import('@/app/lib/supabase/queries');
  const result = await fetchRecentlyReturnedLoans('user-uuid', 14);

  expect(result).toHaveLength(1);
  expect(result[0].book?.title).toBe('Sapiens');
  expect(result[0].returnedAt).toBe('2026-04-14T00:00:00Z');
  expect(result[0].status).toBe('returned');
});
```

- [ ] **Step 1.2: Run the test and verify it fails**

```bash
pnpm test -- queries.recentlyReturnedLoans.test.ts
```

Expected: FAIL with "fetchRecentlyReturnedLoans is not a function" or similar.

- [ ] **Step 1.3: Implement the helper**

In `app/lib/supabase/queries.ts`, add this export immediately after `fetchActiveLoans`:

```ts
export async function fetchRecentlyReturnedLoans(
  userId: string,
  withinDays: number,
  limit = 5,
): Promise<Loan[]> {
  if (!userId) return [];

  const supabase = getSupabaseServerClient();
  const cutoff = new Date(Date.now() - withinDays * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('Loans')
    .select(
      `
        id,
        copy_id,
        user_id,
        borrowed_at,
        due_at,
        returned_at,
        renewed_count,
        handled_by,
        created_at,
        updated_at,
        copy:Copies(
          id,
          barcode,
          book:Books(
            id,
            title,
            author,
            isbn
          )
        ),
        borrower:Users!Loans_user_id_fkey(
          id,
          email,
          role,
          profile:UserProfile(
            display_name,
            student_id
          )
        ),
        handler:Users!Loans_handled_by_fkey(
          id,
          email,
          role,
          profile:UserProfile(
            display_name
          )
        )
      `,
    )
    .not('returned_at', 'is', null)
    .eq('user_id', userId)
    .gte('returned_at', cutoff)
    .order('returned_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (((data ?? []) as unknown) as RawLoanRow[]).map(mapLoanRow);
}
```

- [ ] **Step 1.4: Run the test and verify it passes**

```bash
pnpm test -- queries.recentlyReturnedLoans.test.ts
```

Expected: PASS (both tests).

- [ ] **Step 1.5: Commit**

```bash
git add app/lib/supabase/queries.ts __tests__/queries.recentlyReturnedLoans.test.ts
git commit -m "$(cat <<'EOF'
feat(queries): fetchRecentlyReturnedLoans helper

Returns the user's loans whose returned_at falls inside a recent window,
sorted newest-first. Used by the reading-assistant prompt builder.
EOF
)"
```

---

## Task 2: Extend `AiIntent` with `loan_status`

Why: questions like "what's due tomorrow?" should not trigger book search. A separate intent lets the route skip `fetchBooks`.

**Files:**
- Modify: `app/lib/recommendations/ai.ts` (`AiIntent` union + intent allowlist around line 432)
- Test: `__tests__/lib.recommendations.ai.intent.test.ts` (new)

- [ ] **Step 2.1: Write the failing test**

Create `__tests__/lib.recommendations.ai.intent.test.ts`:

```ts
/** @jest-environment node */

import type { AiIntent } from '@/app/lib/recommendations/ai';

test('AiIntent includes loan_status', () => {
  const intent: AiIntent = 'loan_status';
  expect(intent).toBe('loan_status');
});
```

This is a TypeScript-level test — it fails at compile/type-check time if the union doesn't include the literal.

- [ ] **Step 2.2: Run the test and verify it fails**

```bash
pnpm test -- lib.recommendations.ai.intent.test.ts
```

Expected: FAIL with TypeScript error: `Type '"loan_status"' is not assignable to type 'AiIntent'`.

- [ ] **Step 2.3: Add the intent**

In `app/lib/recommendations/ai.ts`, change line 7:

```ts
export type AiIntent = 'find_books' | 'answer' | 'both' | 'greeting' | 'off_topic' | 'loan_status';
```

And update the validation array around line 432 (inside `classifyAndExtract`) to include `'loan_status'`:

```ts
  const intent: AiIntent =
    ['find_books', 'answer', 'both', 'greeting', 'off_topic', 'loan_status'].includes(parsed.intent as string)
      ? (parsed.intent as AiIntent)
      : 'find_books';
```

- [ ] **Step 2.4: Run the test and verify it passes**

```bash
pnpm test -- lib.recommendations.ai.intent.test.ts
```

Expected: PASS.

- [ ] **Step 2.5: Commit**

```bash
git add app/lib/recommendations/ai.ts __tests__/lib.recommendations.ai.intent.test.ts
git commit -m "$(cat <<'EOF'
feat(ai): add loan_status intent

Classifies questions about due dates / overdue / current borrows so the
route can skip book search for those messages.
EOF
)"
```

---

## Task 3: Extend `buildUnifiedSystemPrompt` to render active loans + recent returns

Why: the AI needs to *see* the user's current loan state and recent returns. The existing prompt builder only takes `userContext`; extend it to accept loan data and today's date, then render new sections plus updated rules.

**Files:**
- Modify: `app/lib/recommendations/ai.ts` (`buildUnifiedSystemPrompt`)
- Test: `__tests__/lib.recommendations.ai.prompt.test.ts` (new)

- [ ] **Step 3.1: Write the failing test**

Create `__tests__/lib.recommendations.ai.prompt.test.ts`:

```ts
/** @jest-environment node */

import { buildUnifiedSystemPrompt } from '@/app/lib/recommendations/ai';
import type { Loan } from '@/app/lib/supabase/types';

const makeLoan = (overrides: Partial<Loan>): Loan =>
  ({
    id: 'l1',
    copyId: 'c1',
    bookId: 'b1',
    borrowerId: 'u1',
    borrowerName: null,
    borrowerEmail: null,
    borrowerIdentifier: null,
    borrowerRole: null,
    handledBy: null,
    status: 'borrowed',
    borrowedAt: '2026-04-01T00:00:00Z',
    dueAt: '2026-05-09T00:00:00Z',
    returnedAt: null,
    renewedCount: 0,
    createdAt: null,
    updatedAt: null,
    book: { id: 'b1', title: 'Sapiens', author: 'Yuval Harari', isbn: null, coverImageUrl: null, classification: null },
    ...overrides,
  } as Loan);

test('renders today date and loan_status rule when called with empty extras', () => {
  const prompt = buildUnifiedSystemPrompt(undefined, [], [], new Date('2026-05-07T00:00:00Z'));
  expect(prompt).toMatch(/Today's date: 2026-05-07/);
  expect(prompt).toMatch(/loan_status/);
});

test('renders Currently borrowed block with due-date countdown', () => {
  const today = new Date('2026-05-07T00:00:00Z');
  const loans: Loan[] = [
    makeLoan({ book: { id: 'b1', title: 'Sapiens', author: 'Yuval Harari', isbn: null, coverImageUrl: null, classification: null }, dueAt: '2026-05-09T00:00:00Z' }),
    makeLoan({ id: 'l2', book: { id: 'b2', title: '1Q84', author: 'Haruki Murakami', isbn: null, coverImageUrl: null, classification: null }, dueAt: '2026-05-01T00:00:00Z' }),
  ];

  const prompt = buildUnifiedSystemPrompt(undefined, loans, [], today);
  expect(prompt).toMatch(/Currently borrowed/);
  expect(prompt).toContain('"Sapiens"');
  expect(prompt).toMatch(/in 2 days/);
  expect(prompt).toContain('"1Q84"');
  expect(prompt).toMatch(/OVERDUE/);
});

test('renders Recently returned block', () => {
  const today = new Date('2026-05-07T00:00:00Z');
  const returns: Loan[] = [
    makeLoan({
      id: 'r1',
      status: 'returned',
      returnedAt: '2026-05-04T00:00:00Z',
      book: { id: 'b3', title: 'The Hobbit', author: null, isbn: null, coverImageUrl: null, classification: null },
    }),
  ];

  const prompt = buildUnifiedSystemPrompt(undefined, [], returns, today);
  expect(prompt).toMatch(/Recently returned/);
  expect(prompt).toContain('"The Hobbit"');
  expect(prompt).toMatch(/2026-05-04/);
});

test('omits sections when both arrays are empty', () => {
  const prompt = buildUnifiedSystemPrompt(undefined, [], [], new Date('2026-05-07T00:00:00Z'));
  expect(prompt).not.toMatch(/Currently borrowed:/);
  expect(prompt).not.toMatch(/Recently returned/);
});
```

This requires `buildUnifiedSystemPrompt` to be exported. Add `export` if it isn't already.

- [ ] **Step 3.2: Run the test and verify it fails**

```bash
pnpm test -- lib.recommendations.ai.prompt.test.ts
```

Expected: FAIL — either compile error (signature mismatch) or assertions failing because new sections aren't rendered.

- [ ] **Step 3.3: Implement the prompt extension**

In `app/lib/recommendations/ai.ts`:

1. Export `buildUnifiedSystemPrompt` (if not already): change `const buildUnifiedSystemPrompt =` to `export function buildUnifiedSystemPrompt`.
2. Replace the function with the version below.

```ts
import type { Loan } from '@/app/lib/supabase/types';

const formatDateYMD = (d: Date): string =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;

const renderActiveLoans = (loans: Loan[], today: Date): string => {
  if (!loans.length) return '';
  const todayMs = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const lines = loans.map((l) => {
    const due = new Date(l.dueAt);
    const dueMs = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
    const days = Math.round((dueMs - todayMs) / 86_400_000);
    const title = l.book?.title ?? '(unknown title)';
    const dateStr = formatDateYMD(due);
    if (days < 0) return `- [OVERDUE] "${title}" — was due ${dateStr} (${Math.abs(days)} days ago)`;
    if (days === 0) return `- "${title}" — due today (${dateStr})`;
    if (days === 1) return `- "${title}" — due tomorrow (${dateStr})`;
    return `- "${title}" — due ${dateStr} (in ${days} days)`;
  });
  return `\n\nCurrently borrowed:\n${lines.join('\n')}`;
};

const renderRecentReturns = (returns: Loan[]): string => {
  if (!returns.length) return '';
  const lines = returns.map((l) => {
    const title = l.book?.title ?? '(unknown title)';
    const date = l.returnedAt ? formatDateYMD(new Date(l.returnedAt)) : '(unknown date)';
    return `- "${title}" — returned ${date}`;
  });
  return `\n\nRecently returned (last 14 days):\n${lines.join('\n')}`;
};

export function buildUnifiedSystemPrompt(
  userContext?: UserContext,
  activeLoans: Loan[] = [],
  recentReturns: Loan[] = [],
  today: Date = new Date(),
): string {
  const studentCtx = buildStudentContext(userContext);
  const todayStr = formatDateYMD(today);
  const loansBlock = renderActiveLoans(activeLoans, today);
  const returnsBlock = renderRecentReturns(recentReturns);

  return `You are a helpful university library assistant. Your job is to help students find books and answer academic questions.

You must respond ONLY with a valid JSON object — no markdown, no extra text, no code fences.

Classify the student's message into one of these intents:
- "find_books": student wants book recommendations
- "answer": student has an academic question
- "both": student asks a question AND wants books
- "greeting": hi, hello, how are you, or other small talk
- "off_topic": requests unrelated to studying or books
- "loan_status": questions about the student's current loans, due dates, overdue items ("what's due tomorrow?", "any overdue?", "what books do I have?")

Response format:
{
  "intent": "find_books" | "answer" | "both" | "greeting" | "off_topic" | "loan_status",
  "reply": "Your natural, friendly response. Plain text only — no asterisks, no bullet points, no markdown.",
  "searchTerms": ["term1", "term2"],
  "followUpQuestion": "One short follow-up question (only for find_books or both, else empty string)"
}

Rules:
- reply must always be plain text. Never use **bold**, *italic*, bullet points, or markdown.
- For "find_books" or "both": searchTerms must be the SUBJECT/TOPIC the student wants — proper noun phrases as they would appear in a book title or table of contents. NEVER include filler verbs (give, show, find, recommend, suggest, want), quantifiers (some, any, a few), or pronouns (me, my). Expand acronyms (AI → "artificial intelligence", ML → "machine learning", DB → "database", OOP → "object-oriented programming"). Use 2-6 multi-word phrases when possible.
- For "answer" or "both": give a concise academic explanation (2-4 sentences max).
- For "greeting": reply warmly and invite the student to ask for books or academic help. searchTerms must be empty.
- For "off_topic": politely decline and redirect to books or academic topics. searchTerms must be empty.
- For "loan_status": answer using ONLY the "Currently borrowed" data below. Never invent dates or titles. Use today's date for "due tomorrow", "due soon", "overdue" reasoning. searchTerms must be empty.
- Never recommend a book that appears in "Currently borrowed".
- When the student asks for a recommendation and "Recently returned" books exist, prefer adjacent or follow-up topics to those books and name the connection in reply (e.g. "Since you just finished X, here's something on Y").
- When the student asks for recommendations without specifying a topic, infer topics from "Recently returned", recently borrowed history, and known interests.
- You can answer questions from ALL academic fields.
- Never reveal what AI model you are. You are the library assistant.
- Today's date: ${todayStr}.${studentCtx}${loansBlock}${returnsBlock}`;
}
```

- [ ] **Step 3.4: Run the test and verify it passes**

```bash
pnpm test -- lib.recommendations.ai.prompt.test.ts
```

Expected: PASS (all four tests).

- [ ] **Step 3.5: Commit**

```bash
git add app/lib/recommendations/ai.ts __tests__/lib.recommendations.ai.prompt.test.ts
git commit -m "$(cat <<'EOF'
feat(ai): render active loans + recent returns in system prompt

Adds Currently-borrowed and Recently-returned sections with day-aware
due-date countdowns, today's date stamp, and updated rules for the
loan_status intent and follow-up recommendations.
EOF
)"
```

---

## Task 4: Multi-turn `callGemini` (systemInstruction + history)

Why: Gemini's idiomatic multi-turn shape is `systemInstruction` + alternating `user`/`model` `contents`. The current code stuffs everything into one user turn. Without this fix, the model can't see prior turns even if we pass them.

**Files:**
- Modify: `app/lib/recommendations/ai.ts` (`callGemini` and `callAI`)
- Test: `__tests__/lib.recommendations.ai.gemini.test.ts` (new)

- [ ] **Step 4.1: Write the failing test**

Create `__tests__/lib.recommendations.ai.gemini.test.ts`:

```ts
/** @jest-environment node */

const fetchMock = jest.fn();
(global as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;

beforeEach(() => {
  fetchMock.mockReset();
  process.env.GEMINI_API_KEY = 'test-key';
  process.env.GEMINI_MODEL = 'gemini-2.5-flash-lite';
  process.env.GEMINI_API_BASE_URL = 'https://example.test/v1beta';
  jest.resetModules();
});

const okResponse = (text: string) =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ candidates: [{ content: { parts: [{ text }] } }] }),
  } as unknown as Response);

test('callGemini puts system prompt in systemInstruction (not contents)', async () => {
  fetchMock.mockReturnValueOnce(okResponse('hello'));
  const ai = await import('@/app/lib/recommendations/ai');
  // Use the public surface — classifyAndExtract is the real caller. But we want
  // a focused test, so call via the unexported callGemini through the prompt
  // path: build a minimal Gemini-formatted result and inspect the request body.
  await ai.classifyAndExtract('hi', undefined);

  expect(fetchMock).toHaveBeenCalled();
  const [, init] = fetchMock.mock.calls[0];
  const body = JSON.parse((init as RequestInit).body as string);
  expect(body.systemInstruction).toBeDefined();
  expect(body.systemInstruction.parts[0].text).toMatch(/library assistant/i);
  // No system text inside contents
  expect(body.contents.length).toBeGreaterThan(0);
  body.contents.forEach((c: { role: string }) => {
    expect(['user', 'model']).toContain(c.role);
  });
});

test('callGemini emits alternating user/model turns when history provided', async () => {
  fetchMock.mockReturnValueOnce(okResponse('{"intent":"answer","reply":"ok","searchTerms":[],"followUpQuestion":""}'));
  const ai = await import('@/app/lib/recommendations/ai');
  await ai.classifyAndExtract(
    'history!',
    undefined,
    [
      { sender: 'user', text: 'recommend a Japan book' },
      { sender: 'assistant', text: 'What aspect of Japan?' },
    ],
  );

  const [, init] = fetchMock.mock.calls[0];
  const body = JSON.parse((init as RequestInit).body as string);
  expect(body.contents).toHaveLength(3);
  expect(body.contents[0]).toEqual({ role: 'user', parts: [{ text: 'recommend a Japan book' }] });
  expect(body.contents[1]).toEqual({ role: 'model', parts: [{ text: 'What aspect of Japan?' }] });
  expect(body.contents[2]).toEqual({ role: 'user', parts: [{ text: 'history!' }] });
});
```

- [ ] **Step 4.2: Run the test and verify it fails**

```bash
pnpm test -- lib.recommendations.ai.gemini.test.ts
```

Expected: FAIL — current `callGemini` puts the system prompt inside `contents` and doesn't emit `systemInstruction`.

- [ ] **Step 4.3: Update `callGemini` and `callAI`**

In `app/lib/recommendations/ai.ts`:

```ts
type GeminiTurn = { role: 'user' | 'model'; text: string };

const callGemini = async (
  systemPrompt: string,
  userMessage: string,
  options?: { temperature?: number; maxOutputTokens?: number; history?: GeminiTurn[] },
): Promise<string | null> => {
  const { geminiBaseUrl, geminiApiKey, geminiModel } = getEnv();
  if (!geminiApiKey) {
    console.error('[Gemini] GEMINI_API_KEY is empty — env var not loaded. Check .env.local and restart pnpm dev.');
    return null;
  }
  if (!geminiModel) {
    console.error('[Gemini] geminiModel is empty.');
    return null;
  }
  if (geminiDisabled) {
    console.error('[Gemini] geminiDisabled flag is set (a previous request got 403). Restart pnpm dev to reset.');
    return null;
  }

  const url = `${geminiBaseUrl.replace(/\/+$/, '')}/models/${encodeURIComponent(
    geminiModel,
  )}:generateContent?key=${encodeURIComponent(geminiApiKey)}`;

  const history = options?.history ?? [];
  const body = {
    systemInstruction: {
      role: 'system',
      parts: [{ text: systemPrompt }],
    },
    contents: [
      ...history.map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
      { role: 'user', parts: [{ text: userMessage }] },
    ],
    generationConfig: {
      temperature: options?.temperature ?? 0.3,
      ...(options?.maxOutputTokens ? { maxOutputTokens: options.maxOutputTokens } : {}),
    },
  };

  // (rest of the function unchanged — fetch, error handling, response parsing)
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      if (response.status === 403) {
        geminiDisabled = true;
        console.error('Gemini API disabled:', errorText);
      } else {
        console.error('[Gemini] non-ok status', response.status, errorText.slice(0, 400));
      }
      return null;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('').trim() ?? null;
    if (!text) {
      console.error('[Gemini] returned 200 but empty content. Full response:', JSON.stringify(data).slice(0, 400));
      return null;
    }
    return text;
  } catch (err) {
    console.error('[Gemini] fetch error', err);
    return null;
  }
};

const callAI = async (
  systemPrompt: string,
  userMessage: string,
  options?: { temperature?: number; maxTokens?: number; history?: GeminiTurn[] },
): Promise<string | null> => {
  return callGemini(systemPrompt, userMessage, {
    temperature: options?.temperature,
    maxOutputTokens: options?.maxTokens,
    history: options?.history,
  });
};
```

- [ ] **Step 4.4: Run the test and verify it passes**

```bash
pnpm test -- lib.recommendations.ai.gemini.test.ts
```

Expected: PASS (both tests).

- [ ] **Step 4.5: Commit**

```bash
git add app/lib/recommendations/ai.ts __tests__/lib.recommendations.ai.gemini.test.ts
git commit -m "$(cat <<'EOF'
feat(ai): multi-turn Gemini contents + systemInstruction

Moves the system prompt to systemInstruction and renders prior chat
turns as alternating user/model entries in contents. This is what
makes the assistant remember what was just said.
EOF
)"
```

---

## Task 5: Extend `classifyAndExtract` signature

Why: it must accept the active-loans, recent-returns, and chat history, and forward all of them to the prompt builder + Gemini call.

**Files:**
- Modify: `app/lib/recommendations/ai.ts` (`classifyAndExtract`)
- Test: `__tests__/lib.recommendations.ai.classify.test.ts` (new)

- [ ] **Step 5.1: Write the failing test**

Create `__tests__/lib.recommendations.ai.classify.test.ts`:

```ts
/** @jest-environment node */

const fetchMock = jest.fn();
(global as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;

beforeEach(() => {
  fetchMock.mockReset();
  process.env.GEMINI_API_KEY = 'test-key';
  process.env.GEMINI_MODEL = 'gemini-2.5-flash-lite';
  process.env.GEMINI_API_BASE_URL = 'https://example.test/v1beta';
  jest.resetModules();
});

const okResponse = (text: string) =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ candidates: [{ content: { parts: [{ text }] } }] }),
  } as unknown as Response);

test('classifyAndExtract injects active loans + recent returns into systemInstruction', async () => {
  fetchMock.mockReturnValueOnce(okResponse('{"intent":"loan_status","reply":"You have one due in 2 days","searchTerms":[],"followUpQuestion":""}'));
  const ai = await import('@/app/lib/recommendations/ai');
  const today = new Date('2026-05-07T00:00:00Z');

  await ai.classifyAndExtract(
    "what's due tomorrow?",
    undefined,
    [],
    [
      {
        id: 'l1',
        copyId: 'c1',
        bookId: 'b1',
        borrowerId: 'u1',
        borrowerName: null,
        borrowerEmail: null,
        borrowerIdentifier: null,
        borrowerRole: null,
        handledBy: null,
        status: 'borrowed',
        borrowedAt: '2026-04-01T00:00:00Z',
        dueAt: '2026-05-09T00:00:00Z',
        returnedAt: null,
        renewedCount: 0,
        createdAt: null,
        updatedAt: null,
        book: { id: 'b1', title: 'Sapiens', author: 'Yuval Harari', isbn: null, coverImageUrl: null, classification: null },
      },
    ] as unknown as Parameters<typeof ai.classifyAndExtract>[3],
    [],
    today,
  );

  const [, init] = fetchMock.mock.calls[0];
  const body = JSON.parse((init as RequestInit).body as string);
  expect(body.systemInstruction.parts[0].text).toContain('"Sapiens"');
  expect(body.systemInstruction.parts[0].text).toMatch(/Today's date: 2026-05-07/);
});

test('classifyAndExtract returns loan_status intent verbatim', async () => {
  fetchMock.mockReturnValueOnce(okResponse('{"intent":"loan_status","reply":"You have 1 book due","searchTerms":[],"followUpQuestion":""}'));
  const ai = await import('@/app/lib/recommendations/ai');
  const result = await ai.classifyAndExtract("what's due?");
  expect(result.intent).toBe('loan_status');
});
```

- [ ] **Step 5.2: Run the test and verify it fails**

```bash
pnpm test -- lib.recommendations.ai.classify.test.ts
```

Expected: FAIL — signature mismatch (extra args) or systemInstruction missing the loan title.

- [ ] **Step 5.3: Implement the signature extension**

In `app/lib/recommendations/ai.ts`, replace `classifyAndExtract`:

```ts
export type ChatTurn = { sender: 'user' | 'assistant'; text: string };

export async function classifyAndExtract(
  message: string,
  userContext?: UserContext,
  history?: ChatTurn[],
  activeLoans?: Loan[],
  recentReturns?: Loan[],
  today: Date = new Date(),
): Promise<AiResult> {
  const systemPrompt = buildUnifiedSystemPrompt(userContext, activeLoans ?? [], recentReturns ?? [], today);
  const geminiHistory: GeminiTurn[] = (history ?? []).map((h) => ({
    role: h.sender === 'user' ? 'user' : 'model',
    text: h.text,
  }));
  const raw = await callAI(systemPrompt, message, {
    temperature: 0.3,
    maxTokens: 1024,
    history: geminiHistory,
  });

  if (!raw) throw new AiUnavailableError();

  const jsonStr = extractJson(raw);
  let parsed: Partial<AiResult> | null = null;

  try {
    parsed = JSON.parse(jsonStr) as Partial<AiResult>;
  } catch {
    console.error('[AI] JSON parse failed:', jsonStr);
    throw new AiUnavailableError('AI returned invalid response');
  }

  const intent: AiIntent =
    ['find_books', 'answer', 'both', 'greeting', 'off_topic', 'loan_status'].includes(parsed.intent as string)
      ? (parsed.intent as AiIntent)
      : 'find_books';

  const reply = stripMarkdown(
    typeof parsed.reply === 'string' && parsed.reply.trim()
      ? parsed.reply.trim()
      : 'Here are some books that might help you.',
  );

  const searchTerms = Array.isArray(parsed.searchTerms)
    ? expandAcronyms(parsed.searchTerms.map((t) => String(t).trim()).filter(Boolean)).slice(0, 8)
    : [];

  const followUpQuestion =
    typeof parsed.followUpQuestion === 'string' ? parsed.followUpQuestion.trim() : '';

  return { intent, reply, searchTerms, followUpQuestion };
}
```

- [ ] **Step 5.4: Run the test and verify it passes**

```bash
pnpm test -- lib.recommendations.ai.classify.test.ts
```

Expected: PASS (both tests).

- [ ] **Step 5.5: Run the full Jest suite to catch regressions**

```bash
pnpm test
```

Expected: every existing test still passes (the function still has its old behavior when called with 1 arg).

- [ ] **Step 5.6: Commit**

```bash
git add app/lib/recommendations/ai.ts __tests__/lib.recommendations.ai.classify.test.ts
git commit -m "$(cat <<'EOF'
feat(ai): classifyAndExtract accepts history, active loans, recent returns

Threads multi-turn chat history into Gemini contents, and forwards
loan state into the system prompt builder so the model can answer
loan_status queries and avoid recommending books the student has out.
EOF
)"
```

---

## Task 6: Wire the API route to fetch context in parallel

Why: this is the change that actually makes the chat smart end-to-end. Fetch profile + active loans + recent returns + last 10 chat turns in parallel, then call the now-context-aware `classifyAndExtract`.

**Files:**
- Modify: `app/api/reading-assistant/route.ts`
- Modify: `__tests__/readingAssistant.api.test.ts` (extend mocks for new helpers + add loan_status case)

- [ ] **Step 6.1: Write the failing test (extend existing test file)**

Append these tests to `__tests__/readingAssistant.api.test.ts`. Also add new mocks for `fetchUserContext`, `fetchActiveLoans`, `fetchRecentlyReturnedLoans`, and the chat-history select. Replace the `jest.mock` block for queries to include the new functions, and the `from` mock to support `select(...).eq(...).order(...).limit(...)` for chat history.

```ts
const fetchUserContextMock = jest.fn();
const fetchActiveLoansMock = jest.fn();
const fetchRecentlyReturnedLoansMock = jest.fn();

// Replace the existing jest.mock('@/app/lib/supabase/queries', ...) with:
jest.mock('@/app/lib/supabase/queries', () => ({
  fetchBooks: (...args: unknown[]) => fetchBooksMock(...args),
  fetchActiveLoans: (...args: unknown[]) => fetchActiveLoansMock(...args),
  fetchRecentlyReturnedLoans: (...args: unknown[]) => fetchRecentlyReturnedLoansMock(...args),
}));

jest.mock('@/app/lib/recommendations/user-context', () => ({
  fetchUserContext: (...args: unknown[]) => fetchUserContextMock(...args),
}));

// Replace the existing fromMock setup with one that supports the chat-history read:
const historyLimitMock = jest.fn();
const historyOrderMock = jest.fn(() => ({ limit: historyLimitMock }));
const historyEqMock = jest.fn(() => ({ order: historyOrderMock }));
const historySelectMock = jest.fn(() => ({ eq: historyEqMock }));

beforeEach(() => {
  // existing resets...
  fetchUserContextMock.mockReset().mockResolvedValue({
    historyTags: [], recentBorrowedBooks: [], savedInterests: [], faculty: null, department: null, intakeYear: null,
  });
  fetchActiveLoansMock.mockReset().mockResolvedValue([]);
  fetchRecentlyReturnedLoansMock.mockReset().mockResolvedValue([]);
  historyLimitMock.mockReset().mockResolvedValue({ data: [], error: null });
});

// new test cases:

test('passes prior chat history to classifyAndExtract', async () => {
  historyLimitMock.mockResolvedValueOnce({
    data: [
      { sender: 'assistant', text: 'What aspect of Japan?', created_at: '2026-05-07T11:00:00Z' },
      { sender: 'user', text: 'recommend a Japan book', created_at: '2026-05-07T10:59:00Z' },
    ],
    error: null,
  });
  classifyAndExtractMock.mockResolvedValue({ intent: 'find_books', reply: '...', searchTerms: ['japan history'], followUpQuestion: '' });
  fetchBooksMock.mockResolvedValue([]);

  await POST(makeRequest({ message: 'history!' }));

  const args = classifyAndExtractMock.mock.calls[0];
  // signature: (message, userContext, history, activeLoans, recentReturns)
  const [msg, , history] = args;
  expect(msg).toBe('history!');
  expect(history).toEqual([
    { sender: 'user', text: 'recommend a Japan book' },
    { sender: 'assistant', text: 'What aspect of Japan?' },
  ]);
});

test('skips fetchBooks when intent is loan_status', async () => {
  classifyAndExtractMock.mockResolvedValue({
    intent: 'loan_status',
    reply: 'You have one due in 2 days.',
    searchTerms: [],
    followUpQuestion: '',
  });

  const res = await POST(makeRequest({ message: "what's due tomorrow?" }));
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.intent).toBe('loan_status');
  expect(body.books).toBeUndefined();
  expect(fetchBooksMock).not.toHaveBeenCalled();
});

test('passes active loans + recent returns to classifyAndExtract', async () => {
  const activeLoan = { id: 'l1', book: { title: 'Sapiens' } };
  const returned = { id: 'r1', book: { title: 'The Hobbit' }, returnedAt: '2026-05-04T00:00:00Z' };
  fetchActiveLoansMock.mockResolvedValueOnce([activeLoan]);
  fetchRecentlyReturnedLoansMock.mockResolvedValueOnce([returned]);
  classifyAndExtractMock.mockResolvedValue({ intent: 'answer', reply: 'ok', searchTerms: [], followUpQuestion: '' });

  await POST(makeRequest({ message: 'hi' }));

  const [, , , active, returns] = classifyAndExtractMock.mock.calls[0];
  expect(active).toEqual([activeLoan]);
  expect(returns).toEqual([returned]);
});

test('still works when context fetches fail (degraded mode)', async () => {
  fetchUserContextMock.mockRejectedValueOnce(new Error('db down'));
  fetchActiveLoansMock.mockRejectedValueOnce(new Error('db down'));
  fetchRecentlyReturnedLoansMock.mockRejectedValueOnce(new Error('db down'));
  historyLimitMock.mockRejectedValueOnce(new Error('db down'));
  classifyAndExtractMock.mockResolvedValue({ intent: 'answer', reply: 'ok', searchTerms: [], followUpQuestion: '' });

  const res = await POST(makeRequest({ message: 'hi' }));
  expect(res.status).toBe(200);
  // classifyAndExtract still called, with undefined context
  const [, ctx, hist, active, returns] = classifyAndExtractMock.mock.calls[0];
  expect(ctx).toBeUndefined();
  expect(hist).toEqual([]);
  expect(active).toEqual([]);
  expect(returns).toEqual([]);
});
```

Update the `fromMock` so chat-history reads route through `historySelectMock` while inserts continue to work:

```ts
const fromMock = jest.fn((table: string) => {
  if (table === 'GeneralChatHistory') {
    return { insert: insertMock, select: historySelectMock };
  }
  return { insert: insertMock };
});
```

- [ ] **Step 6.2: Run the test and verify it fails**

```bash
pnpm test -- readingAssistant.api.test.ts
```

Expected: FAIL — the route doesn't yet call the new mocks.

- [ ] **Step 6.3: Update the route**

Replace `app/api/reading-assistant/route.ts` with:

```ts
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

type ReadingAssistantBook = {
  id: string;
  title: string;
  author: string | null;
  coverImageUrl: string | null;
  classification: string | null;
  isbn: string | null;
};

const HISTORY_LIMIT = 10;
const RETURNS_WINDOW_DAYS = 14;

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
    .limit(HISTORY_LIMIT);

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
    safe(fetchRecentlyReturnedLoans(userId, RETURNS_WINDOW_DAYS), [], 'fetchRecentlyReturnedLoans'),
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
```

- [ ] **Step 6.4: Run the test and verify it passes**

```bash
pnpm test -- readingAssistant.api.test.ts
```

Expected: PASS — all old tests + four new tests.

- [ ] **Step 6.5: Run the full Jest suite**

```bash
pnpm test
```

Expected: every test passes.

- [ ] **Step 6.6: Commit**

```bash
git add app/api/reading-assistant/route.ts __tests__/readingAssistant.api.test.ts
git commit -m "$(cat <<'EOF'
feat(reading-assistant): wire profile + loans + history into AI call

Parallel-fetch user profile, active loans, recently-returned loans,
and the last 10 chat turns; pass them all into classifyAndExtract.
Skip the book search when the AI classifies as loan_status. Each
fetch is independently safe-wrapped so a single Supabase failure
degrades context but doesn't break the chat.
EOF
)"
```

---

## Task 7: Switch dev model to Flash Lite + manual smoke test

Why: Flash Lite is 6× cheaper on output, doesn't think by default (so it never burns the token budget reasoning instead of replying), and is the right tier for this classification + short-reply workload.

**Files:**
- Modify: `.env.local` (LOCAL ONLY — not committed; gitignored)

- [ ] **Step 7.1: Update local env**

Open `.env.local` and change:

```
GEMINI_MODEL=gemini-2.5-flash-lite
```

(Save the file. Watch for trailing CR/whitespace — keep it a clean LF line ending.)

- [ ] **Step 7.2: Restart the dev server**

```bash
pnpm dev
```

Wait for `Ready in ...`.

- [ ] **Step 7.3: Manual smoke test — multi-turn continuity**

In the browser, open `/dashboard/reading-assistant`. Type these messages in order, one per turn:

1. "Recommend me a book"
2. "I kinda like Japan related books"
3. "history!"

Expected: the third reply is about Japanese-history books (not "Hello there!"). It should reference the prior turns, e.g. "Since you mentioned Japan, here's a book on Japanese history…".

- [ ] **Step 7.4: Manual smoke test — loan_status intent**

In the same chat session, type:

```
What's due tomorrow?
```

Expected: a reply that references your actual due dates (or "you have nothing due in the next day" if you have no loans). No book results.

- [ ] **Step 7.5: Manual smoke test — post-return follow-up**

If you have a recently returned loan in your account: ask "Recommend me something based on what I just finished." The reply should name the returned book and suggest an adjacent topic.

If you don't have a recent return, skip this check.

- [ ] **Step 7.6: No commit — env file is gitignored**

Verify:

```bash
git status --short
```

Expected: clean (env file is in .gitignore, no production code changes).

---

## Self-Review Notes

Plan covered against spec sections:

- **Conversation memory** → Tasks 4 (multi-turn contents) + 6 (history fetch + pass).
- **Profile-aware** → Task 6 (`fetchUserContext` parallel-fetched and passed). Task 3 already routes it through `buildUnifiedSystemPrompt`.
- **Active loans / loan_status answers** → Tasks 2 (intent) + 3 (prompt block) + 5 (signature) + 6 (route fetch + skip-search).
- **Recently returned follow-ups** → Tasks 1 (query helper) + 3 (prompt block) + 5 (signature) + 6 (route fetch).
- **Error handling** → Task 6 (`safe()` wrapper around each fetch).
- **`maxOutputTokens: 1024`** → Task 5 (`classifyAndExtract` call site).
- **`gemini-2.5-flash-lite`** → Task 7 (env switch).
- **Spec testing section** → Tasks 1, 3, 4, 5, 6 each include unit tests; Task 7 covers manual flow.

No placeholders. Type signatures consistent (`ChatTurn`, `Loan`, `AiIntent`, `GeminiTurn` defined once and reused). Function names match across tasks (`classifyAndExtract`, `buildUnifiedSystemPrompt`, `fetchRecentlyReturnedLoans`).
