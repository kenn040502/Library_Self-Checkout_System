/** @jest-environment node */
export {};

const fetchMock = jest.fn();
(global as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;

beforeEach(() => {
  fetchMock.mockReset();
  process.env.DEEPSEEK_API_KEY = 'test-key';
  process.env.DEEPSEEK_MODEL = 'deepseek-v4-flash';
  process.env.DEEPSEEK_API_BASE_URL = 'https://example.test';
  process.env.DEEPSEEK_TIMEOUT_MS = '200';
  jest.resetModules();
});

const chatResponse = (content: string) =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ choices: [{ message: { content } }] }),
    text: () => Promise.resolve(content),
  } as unknown as Response);

test('classifyAndExtract returns the validated, classify-only shape', async () => {
  fetchMock.mockReturnValueOnce(
    chatResponse('{"intent":"find_books","searchTerms":["machine learning","AI"],"followUpQuestion":"Any authors?","faqSection":null}'),
  );
  const ai = await import('@/app/lib/recommendations/ai');
  const result = await ai.classifyAndExtract('give me AI books');
  expect(result.intent).toBe('find_books');
  expect(result.searchTerms).toEqual(expect.arrayContaining(['machine learning']));
  expect(result.followUpQuestion).toBe('Any authors?');
  expect(result.faqSection).toBeNull();
  expect('reply' in result).toBe(false);

  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('https://example.test/chat/completions');
  const body = JSON.parse((init as RequestInit).body as string);
  expect(body.response_format).toEqual({ type: 'json_object' });
  expect(body.messages[0].role).toBe('system');
  expect(body.messages[0].content).toMatch(/untrusted input/i); // anti-injection clause present
});

test('classifyAndExtract coerces an illegal intent to find_books', async () => {
  fetchMock.mockReturnValueOnce(chatResponse('{"intent":"weird","searchTerms":[]}'));
  const ai = await import('@/app/lib/recommendations/ai');
  expect((await ai.classifyAndExtract('hello')).intent).toBe('find_books');
});

test('classifyAndExtract retries once on a 5xx then succeeds', async () => {
  fetchMock
    .mockReturnValueOnce(Promise.resolve({ ok: false, status: 503, text: () => Promise.resolve('x') } as unknown as Response))
    .mockReturnValueOnce(chatResponse('{"intent":"greeting","searchTerms":[]}'));
  const ai = await import('@/app/lib/recommendations/ai');
  const result = await ai.classifyAndExtract('hi');
  expect(result.intent).toBe('greeting');
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test('classifyAndExtract throws AiUnavailableError after the retry also fails', async () => {
  fetchMock
    .mockReturnValueOnce(Promise.resolve({ ok: false, status: 503, text: () => Promise.resolve('x') } as unknown as Response))
    .mockReturnValueOnce(Promise.resolve({ ok: false, status: 503, text: () => Promise.resolve('x') } as unknown as Response));
  const ai = await import('@/app/lib/recommendations/ai');
  await expect(ai.classifyAndExtract('hi')).rejects.toThrow(ai.AiUnavailableError);
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test('classifyAndExtract does NOT retry on an auth error', async () => {
  fetchMock.mockReturnValueOnce(Promise.resolve({ ok: false, status: 401, text: () => Promise.resolve('bad key') } as unknown as Response));
  const ai = await import('@/app/lib/recommendations/ai');
  await expect(ai.classifyAndExtract('hi')).rejects.toThrow(ai.AiUnavailableError);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('classifyAndExtract injects sanitized loan titles but not PII', async () => {
  fetchMock.mockReturnValueOnce(chatResponse('{"intent":"loan_status","searchTerms":[]}'));
  const ai = await import('@/app/lib/recommendations/ai');
  await ai.classifyAndExtract(
    "what's due?",
    {
      faculty: 'Information Technology',
      department: null,
      intakeYear: 2024,
      savedInterests: [],
      historyTags: [],
      recentBorrowedBooks: [{ title: 'Sapiens', author: 'Harari', borrowedAt: null }],
    } as unknown as Parameters<typeof ai.classifyAndExtract>[1],
  );
  const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
  expect(body.messages[0].content).toContain('Sapiens');
  expect(body.messages[0].content).toContain('Information Technology');
});
