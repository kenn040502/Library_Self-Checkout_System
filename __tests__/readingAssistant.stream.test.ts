/** @jest-environment node */

// --- mocks ---
const classifyMock = jest.fn();
const streamMock = jest.fn();
const checkAvailMock = jest.fn().mockResolvedValue(true);

jest.mock('@/app/lib/recommendations/ai', () => ({
  __esModule: true,
  AiUnavailableError: class AiUnavailableError extends Error {},
  classifyAndExtract: (...a: unknown[]) => classifyMock(...a),
  streamLibraryAnswer: (...a: unknown[]) => streamMock(...a),
  checkAiAvailable: () => checkAvailMock(),
  stripMarkdown: (t: string) => t,
  buildPersonalizedSuggestion: () => ({ kind: 'personalized', searchTerms: [], reply: 'Here are some books.', hasContext: false }),
}));

const sessionUserMock = jest.fn().mockResolvedValue({ id: 'user-1' });
jest.mock('@/auth', () => ({ __esModule: true, getSessionUser: () => sessionUserMock() }));

const insertMock = jest.fn().mockResolvedValue({ error: null });
const fromMock = jest.fn(() => ({
  insert: insertMock,
  select: () => ({ eq: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }) }),
}));
jest.mock('@/app/lib/supabase/server', () => ({ __esModule: true, getSupabaseServerClient: () => ({ from: fromMock }) }));

const fetchBooksMock = jest.fn().mockResolvedValue([
  { id: 'b1', title: 'The Way of Kings', author: 'Brandon Sanderson', coverImageUrl: null, classification: 'Fantasy', isbn: null },
]);
jest.mock('@/app/lib/supabase/queries', () => ({
  __esModule: true,
  fetchBooks: (...a: unknown[]) => fetchBooksMock(...a),
  fetchActiveLoans: jest.fn().mockResolvedValue([]),
  fetchRecentlyReturnedLoans: jest.fn().mockResolvedValue([]),
}));
jest.mock('@/app/lib/recommendations/user-context', () => ({ __esModule: true, fetchUserContext: jest.fn().mockResolvedValue(undefined) }));

async function readSse(res: Response): Promise<Array<{ event: string; data: unknown }>> {
  const text = await res.text();
  const out: Array<{ event: string; data: unknown }> = [];
  for (const frame of text.split('\n\n')) {
    const lines = frame.split('\n');
    const ev = lines.find((l) => l.startsWith('event:'))?.slice(6).trim();
    const dt = lines.find((l) => l.startsWith('data:'))?.slice(5).trim();
    if (ev) out.push({ event: ev, data: dt ? JSON.parse(dt) : undefined });
  }
  return out;
}

beforeEach(() => {
  jest.clearAllMocks();
  sessionUserMock.mockResolvedValue({ id: 'user-1' });
  checkAvailMock.mockResolvedValue(true);
  fetchBooksMock.mockResolvedValue([
    { id: 'b1', title: 'The Way of Kings', author: 'Brandon Sanderson', coverImageUrl: null, classification: 'Fantasy', isbn: null },
  ]);
});

test('find_books message: thinking → delta(s) → meta(with books) → done', async () => {
  classifyMock.mockResolvedValue({ intent: 'find_books', searchTerms: ['fantasy'], followUpQuestion: '', faqSection: null });
  streamMock.mockReturnValue((async function* () {
    yield { type: 'delta', text: 'Here are ' };
    yield { type: 'delta', text: 'some fantasy picks.' };
  })());

  const { POST } = await import('@/app/api/reading-assistant/route');
  const res = await POST(new Request('http://x/api/reading-assistant', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'find me a fantasy book' }),
  }));
  expect(res.headers.get('Content-Type')).toMatch(/text\/event-stream/);

  const events = await readSse(res);
  expect(events[0].event).toBe('thinking');
  const deltas = events.filter((e) => e.event === 'delta').map((e) => (e.data as { text: string }).text).join('');
  expect(deltas).toBe('Here are some fantasy picks.');
  const meta = events.find((e) => e.event === 'meta')!.data as { intent: string; books: unknown[] };
  expect(meta.intent).toBe('find_books');
  expect(meta.books).toHaveLength(1);
  expect(events[events.length - 1].event).toBe('done');
  // user turn + assistant turn persisted
  expect(insertMock).toHaveBeenCalledTimes(2);
});

test('answer message with no books: no fetchBooks call, meta has empty books', async () => {
  classifyMock.mockResolvedValue({ intent: 'answer', searchTerms: [], followUpQuestion: '', faqSection: 'Loans & Renewals' });
  streamMock.mockReturnValue((async function* () { yield { type: 'delta', text: 'You can renew online twice.' }; })());
  const { POST } = await import('@/app/api/reading-assistant/route');
  const res = await POST(new Request('http://x', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'how do I renew?' }) }));
  const events = await readSse(res);
  expect(fetchBooksMock).not.toHaveBeenCalled();
  const meta = events.find((e) => e.event === 'meta')!.data as { books: unknown[]; faqSection: string };
  expect(meta.books).toEqual([]);
  expect(meta.faqSection).toBe('Loans & Renewals');
});

test('classify fails: error/fallback path emits keyword-search books and no model deltas', async () => {
  const { AiUnavailableError } = await import('@/app/lib/recommendations/ai');
  classifyMock.mockRejectedValue(new AiUnavailableError('down'));
  const { POST } = await import('@/app/api/reading-assistant/route');
  const res = await POST(new Request('http://x', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'fantasy please' }) }));
  const events = await readSse(res);
  expect(fetchBooksMock).toHaveBeenCalled();
  const meta = events.find((e) => e.event === 'meta')!.data as { books: unknown[] };
  expect(meta.books).toHaveLength(1);
  const txt = events.filter((e) => e.event === 'delta').map((e) => (e.data as { text: string }).text).join('');
  expect(txt).toMatch(/busy|unavailable|keyword/i);
  expect(streamMock).not.toHaveBeenCalled();
});

test('answer-pass failure: keeps streamed text, then appends a templated opener + books', async () => {
  classifyMock.mockResolvedValue({ intent: 'find_books', searchTerms: ['fantasy'], followUpQuestion: '', faqSection: null });
  streamMock.mockReturnValue((async function* () {
    yield { type: 'delta', text: 'Looking…' };
    yield { type: 'error', kind: 'server' as const };
  })());
  const { POST } = await import('@/app/api/reading-assistant/route');
  const res = await POST(new Request('http://x', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'fantasy' }) }));
  const events = await readSse(res);
  const txt = events.filter((e) => e.event === 'delta').map((e) => (e.data as { text: string }).text).join('');
  expect(txt).toContain('Looking…');
  expect(txt).toMatch(/Here are some books|catalogue|catalog/i);
  expect(events.find((e) => e.event === 'meta')).toBeTruthy();
});

test('over-length message → 400 before any model call', async () => {
  const { POST } = await import('@/app/api/reading-assistant/route');
  const res = await POST(new Request('http://x', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'x'.repeat(2500) }) }));
  expect(res.status).toBe(400);
  expect(classifyMock).not.toHaveBeenCalled();
});

test('missing session → 401', async () => {
  sessionUserMock.mockRejectedValue(new Error('no session'));
  const { POST } = await import('@/app/api/reading-assistant/route');
  const res = await POST(new Request('http://x', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'hi' }) }));
  expect(res.status).toBe(401);
});
