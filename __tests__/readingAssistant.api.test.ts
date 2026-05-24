/** @jest-environment node */

import { POST } from '@/app/api/reading-assistant/route';

const insertMock = jest.fn().mockResolvedValue({ error: null });

// Chat-history select chain: .select().eq().order().limit()
const historyLimitMock = jest.fn();
const historyOrderMock = jest.fn(() => ({ limit: historyLimitMock }));
const historyEqMock = jest.fn(() => ({ order: historyOrderMock }));
const historySelectMock = jest.fn(() => ({ eq: historyEqMock }));

const fromMock = jest.fn((table: string) => {
  if (table === 'GeneralChatHistory') {
    return { insert: insertMock, select: historySelectMock };
  }
  return { insert: insertMock };
});

const fetchBooksMock = jest.fn();
const classifyAndExtractMock = jest.fn();
const fetchUserContextMock = jest.fn();
const fetchActiveLoansMock = jest.fn();
const fetchRecentlyReturnedLoansMock = jest.fn();

jest.mock('@/app/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({ from: fromMock }),
}));

jest.mock('@/auth', () => ({
  getSessionUser: jest.fn().mockResolvedValue({ id: 'user-uuid', email: 'a@b.com', role: 'user' }),
}));

jest.mock('@/app/lib/recommendations/ai.ts', () => ({
  classifyAndExtract: (...args: unknown[]) => classifyAndExtractMock(...args),
}));

jest.mock('@/app/lib/supabase/queries', () => ({
  fetchBooks: (...args: unknown[]) => fetchBooksMock(...args),
  fetchActiveLoans: (...args: unknown[]) => fetchActiveLoansMock(...args),
  fetchRecentlyReturnedLoans: (...args: unknown[]) => fetchRecentlyReturnedLoansMock(...args),
}));

jest.mock('@/app/lib/recommendations/user-context', () => ({
  fetchUserContext: (...args: unknown[]) => fetchUserContextMock(...args),
}));

beforeEach(() => {
  insertMock.mockClear();
  fromMock.mockClear();
  fetchBooksMock.mockReset();
  classifyAndExtractMock.mockReset();

  fetchUserContextMock.mockReset().mockResolvedValue({
    historyTags: [],
    recentBorrowedBooks: [],
    savedInterests: [],
    faculty: null,
    department: null,
    intakeYear: null,
  });
  fetchActiveLoansMock.mockReset().mockResolvedValue([]);
  fetchRecentlyReturnedLoansMock.mockReset().mockResolvedValue([]);
  historyLimitMock.mockReset().mockResolvedValue({ data: [], error: null });
});

const makeRequest = (body: unknown) =>
  new Request('http://localhost/api/reading-assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

test('answer intent: returns reply, no books', async () => {
  classifyAndExtractMock.mockResolvedValue({
    intent: 'answer',
    reply: 'You can renew up to twice…',
    searchTerms: [],
    followUpQuestion: '',
  });
  const res = await POST(makeRequest({ message: 'how do I renew?' }));
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.intent).toBe('answer');
  expect(body.reply).toMatch(/renew/);
  expect(body.books).toBeUndefined();
  expect(fetchBooksMock).not.toHaveBeenCalled();
  // persistence: 2 inserts (user msg + assistant msg)
  expect(insertMock).toHaveBeenCalledTimes(2);
});

test('find_books intent: returns reply + books', async () => {
  classifyAndExtractMock.mockResolvedValue({
    intent: 'find_books',
    reply: 'Here are some fantasy options:',
    searchTerms: ['fantasy'],
    followUpQuestion: '',
  });
  fetchBooksMock.mockResolvedValue([
    { id: 'b1', title: 'The Way of Kings', author: 'Brandon Sanderson', coverImageUrl: null, classification: 'Fantasy', isbn: '9780765326355' },
    { id: 'b2', title: 'Mistborn', author: 'Brandon Sanderson', coverImageUrl: null, classification: 'Fantasy', isbn: '9780765311788' },
  ]);
  const res = await POST(makeRequest({ message: 'find me a fantasy book' }));
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.intent).toBe('find_books');
  expect(body.books).toHaveLength(2);
  expect(body.books[0].title).toBe('The Way of Kings');
  expect(fetchBooksMock).toHaveBeenCalled();
});

test('both intent: also returns books', async () => {
  classifyAndExtractMock.mockResolvedValue({
    intent: 'both',
    reply: 'You can renew, and meanwhile here are some sci-fi picks:',
    searchTerms: ['sci-fi'],
    followUpQuestion: '',
  });
  fetchBooksMock.mockResolvedValue([
    { id: 'b1', title: 'Dune', author: 'Frank Herbert', coverImageUrl: null, classification: 'Sci-Fi', isbn: '9780441172719' },
  ]);
  const res = await POST(makeRequest({ message: 'how do I renew? Also recommend sci-fi.' }));
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.intent).toBe('both');
  expect(body.books).toHaveLength(1);
});

test('off_topic: returns reply, no books', async () => {
  classifyAndExtractMock.mockResolvedValue({
    intent: 'off_topic',
    reply: 'I can only help with library topics.',
    searchTerms: [],
    followUpQuestion: '',
  });
  const res = await POST(makeRequest({ message: 'tell me about quantum physics' }));
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.intent).toBe('off_topic');
  expect(body.books).toBeUndefined();
  expect(fetchBooksMock).not.toHaveBeenCalled();
});

test('rejects empty message', async () => {
  const res = await POST(makeRequest({ message: '   ' }));
  expect(res.status).toBe(400);
  expect(classifyAndExtractMock).not.toHaveBeenCalled();
});

test('rejects missing message', async () => {
  const res = await POST(makeRequest({}));
  expect(res.status).toBe(400);
});

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
